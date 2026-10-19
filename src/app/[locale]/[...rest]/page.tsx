import { notFound } from "next/navigation";

// Sends unknown paths to [locale]/not-found.tsx so it renders inside the layout.
export default function CatchAll() {
  notFound();
}
