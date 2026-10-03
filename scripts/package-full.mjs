import fs from "node:fs";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
const files = [
  "README.md",
  "artifacts/launchguild-source.zip",
  "artifacts/SHA256SUMS",
];
for (const f of fs.readdirSync("media"))
  if (/\.(mp4|srt|vtt|json|md|png|jpg|wav|txt)$/.test(f))
    files.push("media/" + f);
for (const dir of ["media/screenshots", "media/audio"])
  for (const f of fs.readdirSync(dir))
    if (/\.(png|wav|txt)$/.test(f)) files.push(dir + "/" + f);
for (const f of [
  "founder-journey.webm",
  "concurrent-edit-proof.webm",
  "town.png",
  "kite.png",
  "evidence.png",
  "custom.png",
  "shared.png",
  "readiness.png",
  "commit.png",
  "decision.png",
  "technical-conflict.png",
  "technical-preserved.png",
  "timings.json",
])
  files.push("media/raw/" + f);
const out = "artifacts/launchguild-v5-handoff.zip";
if (fs.existsSync(out)) fs.unlinkSync(out);
const z = spawnSync("zip", ["-q", out, "-@"], {
  input: files.join("\n") + "\n",
  encoding: "utf8",
});
if (z.status) throw Error(z.stderr);
const t = spawnSync("unzip", ["-t", out], { encoding: "utf8" });
if (t.status) throw Error(t.stdout);
console.log(t.stdout.trim().split("\n").at(-1));
fs.appendFileSync(
  "artifacts/SHA256SUMS",
  crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex") +
    "  " +
    out +
    "\n",
);
console.log(
  `${files.length} handoff/media files. ${Math.round(fs.statSync(out).size / 1024 / 1024)} MiB.`,
);
