import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.isFile()) acc.push(p);
  }
  return acc;
}

function bytesToMb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function summarizeDir(dir) {
  if (!existsSync(dir)) return { exists: false, files: 0, bytes: 0 };
  const files = walk(dir);
  const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
  return { exists: true, files: files.length, bytes };
}

function printSummary(label, summary) {
  if (!summary.exists) {
    console.log(`${label}: missing`);
    return;
  }
  console.log(
    `${label}: ${bytesToMb(summary.bytes)} MB, ${summary.files} files`,
  );
}

const roots = [".next", ".next/static", ".next/server", ".vercel/output"];

for (const root of roots) {
  printSummary(root, summarizeDir(root));
}

if (existsSync(".vercel/output/functions")) {
  const fnDirs = readdirSync(".vercel/output/functions", { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(".vercel/output/functions", d.name));

  const details = fnDirs
    .map((dir) => {
      const s = summarizeDir(dir);
      return { dir, mb: Number(bytesToMb(s.bytes)), files: s.files };
    })
    .sort((a, b) => b.mb - a.mb)
    .slice(0, 10);

  console.log("Top .vercel/output/functions by size:");
  for (const d of details) {
    console.log(`- ${d.dir}: ${d.mb.toFixed(2)} MB, ${d.files} files`);
  }
}
