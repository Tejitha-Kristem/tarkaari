import "server-only";
import { after } from "next/server";
import { deliverPending } from "./push";

/** Push whatever notifications an action's database triggers just created, after the response is sent. */
export function pushSoon() {
  after(() => deliverPending(50).catch((e) => console.error("push failed", e)));
}
