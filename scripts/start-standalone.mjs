import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./prepare-standalone.mjs");

process.env.HOSTNAME = "0.0.0.0";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standaloneServerPath = path.join(rootDir, ".next", "standalone", "server.js");

await import(standaloneServerPath);
