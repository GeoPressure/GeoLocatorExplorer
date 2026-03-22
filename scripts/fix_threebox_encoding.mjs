import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const target = path.join(
  root,
  "node_modules",
  "threebox-plugin",
  "src",
  "objects",
  "loaders",
  "GLTFLoader.js",
);

if (!fs.existsSync(target)) {
  console.log("[fix-threebox-encoding] skipped (file not found)");
  process.exit(0);
}

const original = fs.readFileSync(target);
const patched = Buffer.from(original);
let replaced = 0;

for (let i = 0; i < patched.length; i += 1) {
  if (patched[i] === 0x97) {
    patched[i] = 0x2d;
    replaced += 1;
  }
}

if (!replaced) {
  console.log("[fix-threebox-encoding] no invalid bytes found");
  process.exit(0);
}

fs.writeFileSync(target, patched);
console.log(`[fix-threebox-encoding] patched ${replaced} byte(s) in ${path.relative(root, target)}`);
