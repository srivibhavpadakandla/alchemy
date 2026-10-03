import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const files = [];
const skip = new Set([
  "node_modules",
  ".launchguild-local",
  ".next",
  ".git",
  "playwright-report",
  "test-results",
  "media",
  "artifacts",
]);
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      skip.has(item.name) ||
      item.name.endsWith(".tsbuildinfo") ||
      item.name === ".DS_Store" ||
      (item.name.startsWith(".env") && item.name !== ".env.example")
    )
      continue;
    const p = path.join(dir, item.name);
    if (item.isDirectory()) walk(p);
    else if (item.isFile()) files.push(path.relative(root, p));
  }
}
walk(root);
for (const file of [
  "fictional-program-with-decision.json",
  "local-agent-proof.json",
  "local-cancellation-proof.json",
  "redesign-browser-proof.json",
  "optiflux-browser-proof.json",
  "selected-records-and-formulas.json",
  "redacted-plan.json",
])
  files.push("artifacts/" + file);
for (const file of [
  "README.md",
  "composition.json",
  "teaser-composition.json",
  "narration-script.md",
  "demo.srt",
  "demo.vtt",
  "teaser.srt",
  "teaser.vtt",
  "media-proof.json",
  "accessibility.json",
  "dependency-audit.json",
])
  files.push("media/" + file);
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-proj-[A-Za-z0-9_-]{20,}|\bsb_secret_[A-Za-z0-9_-]{20,}/.test(
      content,
    )
  )
    throw Error("Sensitive-looking material in " + file);
}
const hashes = Object.fromEntries(
  files
    .sort()
    .map((f) => [
      f,
      crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"),
    ]),
);
fs.writeFileSync(
  "artifacts/source-manifest.json",
  JSON.stringify(
    {
      format: "launchguild-source-v1",
      files: hashes,
      excluded:
        "Dependencies, build outputs, real credentials, unrelated workspace projects",
    },
    null,
    2,
  ),
);
files.push("artifacts/source-manifest.json");
const output = "artifacts/launchguild-source.zip";
if (fs.existsSync(output)) fs.unlinkSync(output);
const zip = spawnSync("zip", ["-q", output, "-@"], {
  input: files.join("\n") + "\n",
  encoding: "utf8",
});
if (zip.status) throw Error(zip.stderr);
const test = spawnSync("unzip", ["-t", output], { encoding: "utf8" });
if (test.status) throw Error(test.stdout);
console.log(test.stdout.trim().split("\n").at(-1));
const archives = [
  output,
  "media/launchguild-demo-2min.mp4",
  "media/launchguild-teaser-30sec.mp4",
  "media/launchguild-technical-proof.mp4",
  "media/thumbnail.png",
];
fs.writeFileSync(
  "artifacts/SHA256SUMS",
  archives
    .map(
      (f) =>
        crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") +
        "  " +
        f,
    )
    .join("\n") + "\n",
);
console.log(
  `${files.length} source/handoff files, no .env.local or dependencies. Media is delivered separately.`,
);
