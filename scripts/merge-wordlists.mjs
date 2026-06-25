#!/usr/bin/env node
/**
 * Merge word lists for Explore page.
 * Priority (highest first): CrossFire → XwiJeffChen → spreadthewordlist.
 * Duplicate words keep the score from the highest-priority source.
 *
 * Usage:
 *   node scripts/merge-wordlists.mjs
 *   node scripts/merge-wordlists.mjs --out public/wordList.txt
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEFAULT_SOURCES = [
  "/Library/CrossFire/default.dict",
  path.join(process.env.HOME || "", "Downloads/XwiJeffChenList.txt"),
  path.join(process.env.HOME || "", "Downloads/spreadthewordlist.dict"),
];

function parseArgs() {
  const args = process.argv.slice(2);
  let out = path.join(root, "public/wordList.txt");
  const sources = [...DEFAULT_SOURCES];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out" && args[i + 1]) {
      out = path.resolve(args[++i]);
    }
  }
  return { out, sources };
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const semi = trimmed.indexOf(";");
  if (semi <= 0) return null;
  const word = trimmed.slice(0, semi).toLowerCase().trim();
  const score = parseInt(trimmed.slice(semi + 1), 10);
  if (!word || !Number.isFinite(score)) return null;
  return { word, score };
}

function mergeSources(sources) {
  const scores = new Map();
  const stats = [];

  for (const file of sources) {
    if (!fs.existsSync(file)) {
      console.error(`Missing source: ${file}`);
      process.exit(1);
    }
    const text = fs.readFileSync(file, "utf8");
    let added = 0;
    let skipped = 0;
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      if (scores.has(parsed.word)) {
        skipped++;
        continue;
      }
      scores.set(parsed.word, parsed.score);
      added++;
    }
    stats.push({ file, added, skipped, total: scores.size });
  }

  return { scores, stats };
}

function main() {
  const { out, sources } = parseArgs();
  const { scores, stats } = mergeSources(sources);

  const lines = [...scores.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([word, score]) => `${word};${score}`);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${lines.join("\n")}\n`, "utf8");

  console.log("Merged word list written to:", out);
  console.log("Total unique words:", scores.size.toLocaleString());
  for (const s of stats) {
    console.log(`  ${path.basename(s.file)}: +${s.added.toLocaleString()} new (${s.skipped.toLocaleString()} dupes skipped) → ${s.total.toLocaleString()} total`);
  }
}

main();
