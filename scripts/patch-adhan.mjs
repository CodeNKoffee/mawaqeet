// adhan ships a CommonJS build under lib/cjs but its package.json declares
// "type":"module", so Node treats those files as ESM and the build breaks
// under require(). Dropping a {"type":"commonjs"} marker in that folder
// fixes resolution. Runs automatically on postinstall.
import { writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "node_modules", "adhan", "lib", "cjs", "package.json");

try {
  await access(join(here, "..", "node_modules", "adhan", "lib", "cjs"));
  await writeFile(target, '{ "type": "commonjs" }\n', "utf8");
  console.log("patched adhan: lib/cjs/package.json → commonjs");
} catch {
  // adhan not installed (e.g. CI without deps) — nothing to do.
}
