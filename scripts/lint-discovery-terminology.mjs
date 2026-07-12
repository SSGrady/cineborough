#!/usr/bin/env node
/**
 * T082 — guard against "wish" terminology regressions in discovery UI copy.
 * Internal code identifiers (Wish* filenames) are excluded; user-facing strings are not.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCAN_ROOT = join(ROOT, "apps/web/src/components");
const PATTERN = /\bwish\b/i;

const TARGET_GLOBS = [
  /Discovery/i,
  /Criteria/i,
  /Matches/i,
  /CompareChips/i,
  /ByExample/i,
  /CriterionRange/i,
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function isTargetFile(path) {
  const base = relative(SCAN_ROOT, path);
  return TARGET_GLOBS.some((re) => re.test(base));
}

const files = walk(SCAN_ROOT).filter(isTargetFile);
const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!PATTERN.test(line)) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }
    violations.push({
      file: relative(ROOT, file),
      line: i + 1,
      text: line.trim(),
    });
  }
}

if (violations.length > 0) {
  console.error('Discovery terminology lint failed — remove user-facing "wish" strings:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`);
  }
  process.exit(1);
}

console.log(`Discovery terminology OK (${files.length} files scanned)`);
