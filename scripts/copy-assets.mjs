#!/usr/bin/env node
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets");
const dest = join(root, "dist", "assets");

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log("copy-assets: OK");
