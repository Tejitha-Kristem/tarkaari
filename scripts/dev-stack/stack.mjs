// Local stand-in for a Supabase project, without Docker:
//   Postgres (you run it) + Supabase Auth (GoTrue) + PostgREST + a tiny gateway
//   on http://127.0.0.1:54321 that serves /auth/v1, /rest/v1 and /storage/v1.
//
// Linux only (it runs the official Linux binaries). On a Mac or Windows use
// `npx supabase start` (Docker) instead — it gives you the same thing.
//
//   STACK_BIN=/path/with/postgrest+auth  PGURL=postgres://postgres@127.0.0.1:54329  node scripts/dev-stack/stack.mjs setup
//   ... node scripts/dev-stack/stack.mjs start
//
// `setup` recreates the database "tarakari_dev" from the migrations and seed.
import { spawn, execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const BIN = process.env.STACK_BIN ?? "/var/tmp/tarakari-stack/bin";
const PGURL = process.env.PGURL ?? "postgres://postgres@127.0.0.1:54329";
const DB = "tarakari_dev";
const JWT_SECRET = "dev-only-jwt-secret-at-least-32-characters-long";
const GATEWAY_PORT = 54321;
const STORAGE_DIR = process.env.STACK_STORAGE ?? "/var/tmp/tarakari-stack/storage";
const TEST_OTP = ["919000000001", "919000000002", "919000000003", "919000000004", "919000000005"]
  .map((p) => `${p}:123456`).join(",");

const b64url = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
function jwt(role) {
  const head = b64url({ alg: "HS256", typ: "JWT" });
  const body = b64url({ iss: "supabase-dev", role, iat: 1700000000, exp: 2000000000 });
  const sig = createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
const ANON_KEY = jwt("anon");
const SERVICE_KEY = jwt("service_role");

const psql = (db, args) => execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", `${PGURL}/${db}`, ...args], { stdio: "inherit" });

function setup() {
  psql("postgres", ["-c", `drop database if exists ${DB} with (force)`, "-c", `create database ${DB}`]);
  psql(DB, ["-c", "create schema if not exists auth"]);
  // Supabase Auth creates and migrates the auth schema itself.
  execFileSync(join(BIN, "authpkg", "auth"), ["migrate"], { env: authEnv(), stdio: "inherit" });
  psql(DB, ["-f", join(here, "platform.sql")]);
  for (const f of readdirSync(join(root, "supabase", "migrations")).sort()) {
    console.log("migrate:", f);
    psql(DB, ["-f", join(root, "supabase", "migrations", f)]);
  }
  psql(DB, ["-f", join(root, "supabase", "seed.sql")]);
  console.log(`\nDatabase ${DB} ready.`);
  printEnv();
}

function authEnv() {
  return {
    ...process.env,
    GOTRUE_API_HOST: "127.0.0.1",
    PORT: "9999",
    API_EXTERNAL_URL: `http://127.0.0.1:${GATEWAY_PORT}/auth/v1`,
    GOTRUE_DB_DRIVER: "postgres",
    DATABASE_URL: `${PGURL}/${DB}?search_path=auth`,
    GOTRUE_DB_MIGRATIONS_PATH: join(BIN, "authpkg", "migrations"),
    GOTRUE_SITE_URL: "http://localhost:3000",
    GOTRUE_URI_ALLOW_LIST: "http://localhost:3000/**",
    GOTRUE_JWT_SECRET: JWT_SECRET,
    GOTRUE_JWT_EXP: "3600",
    GOTRUE_JWT_AUD: "authenticated",
    GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
    GOTRUE_JWT_ADMIN_ROLES: "service_role",
    GOTRUE_DISABLE_SIGNUP: "false",
    GOTRUE_EXTERNAL_EMAIL_ENABLED: "false",
    GOTRUE_EXTERNAL_PHONE_ENABLED: "true",
    GOTRUE_SMS_AUTOCONFIRM: "false",
    GOTRUE_SMS_PROVIDER: "twilio",
    GOTRUE_SMS_TWILIO_ACCOUNT_SID: "ACplaceholder",
    GOTRUE_SMS_TWILIO_AUTH_TOKEN: "placeholder",
    GOTRUE_SMS_TWILIO_MESSAGE_SERVICE_SID: "MGplaceholder",
    GOTRUE_SMS_TEST_OTP: TEST_OTP,
    GOTRUE_SMS_MAX_FREQUENCY: "1s",
    GOTRUE_RATE_LIMIT_SMS_SENT: "1000",
    GOTRUE_RATE_LIMIT_VERIFY: "1000",
    GOTRUE_LOG_LEVEL: "warn",
  };
}

function printEnv() {
  console.log(`
Add to .env.local:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${GATEWAY_PORT}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
SUPABASE_SECRET_KEY=${SERVICE_KEY}
`);
}

function proxy(req, res, port, prefix) {
  const path = req.url.slice(prefix.length) || "/";
  const upstream = http.request(
    { host: "127.0.0.1", port, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", (e) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(String(e));
  });
  req.pipe(upstream);
}

// Minimal object storage: enough for uploads and public reads in development.
// It does not enforce storage RLS; the hosted project does.
function storage(req, res) {
  const url = new URL(req.url, "http://x");
  const m = url.pathname.match(/^\/storage\/v1\/object\/(?:(public|sign|authenticated)\/)?([^/]+)\/(.+)$/);
  if (!m) {
    res.writeHead(404).end();
    return;
  }
  const [, mode, bucket, key] = m;
  const file = normalize(join(STORAGE_DIR, bucket, decodeURIComponent(key)));
  if (!file.startsWith(STORAGE_DIR)) {
    res.writeHead(400).end();
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "cache-control": "no-cache" });
    createReadStream(file).pipe(res);
    return;
  }
  if ((req.method === "POST" || req.method === "PUT") && !mode) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.concat(chunks));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ Key: `${bucket}/${key}`, Id: key }));
    });
    return;
  }
  res.writeHead(405).end();
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, prefer, range, accept-profile, content-profile, x-upsert, x-supabase-api-version",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-expose-headers": "content-range, x-supabase-api-version",
};

function start() {
  const children = [];
  const run = (cmd, args, env) => {
    const child = spawn(cmd, args, { env, stdio: "inherit" });
    children.push(child);
    child.on("exit", (code) => {
      console.error(`${cmd} exited with ${code}`);
      process.exit(1);
    });
  };
  run(join(BIN, "authpkg", "auth"), ["serve"], authEnv());
  run(join(BIN, "postgrest"), [], {
    ...process.env,
    PGRST_DB_URI: `postgres://authenticator:dev@127.0.0.1:${new URL(PGURL).port}/${DB}`,
    PGRST_DB_SCHEMAS: "public",
    PGRST_DB_ANON_ROLE: "anon",
    PGRST_JWT_SECRET: JWT_SECRET,
    PGRST_SERVER_PORT: "3001",
    PGRST_SERVER_HOST: "127.0.0.1",
    PGRST_LOG_LEVEL: "warn",
  });
  http
    .createServer((req, res) => {
      for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
      if (req.method === "OPTIONS") {
        res.writeHead(204).end();
        return;
      }
      if (req.url.startsWith("/auth/v1")) return proxy(req, res, 9999, "/auth/v1");
      if (req.url.startsWith("/rest/v1")) return proxy(req, res, 3001, "/rest/v1");
      if (req.url.startsWith("/storage/v1")) return storage(req, res);
      res.writeHead(404).end();
    })
    .listen(GATEWAY_PORT, "127.0.0.1", () => {
      console.log(`Dev stack on http://127.0.0.1:${GATEWAY_PORT}`);
      printEnv();
    });
  const stop = () => {
    children.forEach((c) => c.kill());
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

const cmd = process.argv[2];
if (cmd === "setup") setup();
else if (cmd === "start") start();
else if (cmd === "env") printEnv();
else console.log("Usage: node scripts/dev-stack/stack.mjs setup|start|env");
