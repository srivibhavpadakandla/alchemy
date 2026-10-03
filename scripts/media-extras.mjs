import fs from "node:fs";
import sharp from "sharp";
import { spawnSync } from "node:child_process";
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw Error(r.stderr?.slice(-3000));
  return r.stdout;
};
const xml = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const scenes = [
  {
    start: 0,
    text: "Your first design partners want different things. LaunchGuild connects their evidence to one product decision. These companies and amounts are fictional.",
    caption: "THREE PARTNERS. ONE PRODUCT.",
  },
  {
    start: 60,
    text: "Compare scarce engineering capacity. Shared Salesforce work serves two partners. Adding CSV does not count Juniper twice: thirty eight thousand dollars, conditional.",
    caption: "SHARED WORK. NO DOUBLE COUNTING.",
  },
  {
    start: 108,
    text: "Review the tradeoff, commit a plan, and keep the decision. Queued work is not revenue. Real AI and voice verification require account setup.",
    caption: "REVIEW. COMMIT. KEEP THE EVIDENCE.",
  },
];
fs.writeFileSync(
  "media/teaser-composition.json",
  JSON.stringify(
    { duration: 30, source: "raw/founder-journey.webm", scenes },
    null,
    2,
  ),
);
let captions = [];
for (let i = 0; i < scenes.length; i++) {
  const s = scenes[i];
  fs.writeFileSync(`media/audio/teaser-${i}.txt`, s.text);
  run("say", [
    "-v",
    "Samantha",
    "-r",
    "170",
    "-f",
    `media/audio/teaser-${i}.txt`,
    "-o",
    `media/audio/teaser-${i}.aiff`,
  ]);
  const sec = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      `media/audio/teaser-${i}.aiff`,
    ]),
  );
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    `media/audio/teaser-${i}.aiff`,
    "-af",
    `atempo=${Math.max(1, sec / 9.5)},apad,atrim=0:10`,
    "-ar",
    "48000",
    "-ac",
    "2",
    `media/audio/teaser-${i}.wav`,
  ]);
  const words = s.text.split(" "),
    chunks = [];
  for (let j = 0; j < words.length; j += 10)
    chunks.push(words.slice(j, j + 10).join(" "));
  for (let j = 0; j < chunks.length; j++)
    captions.push({
      start: i * 10 + (j * 10) / chunks.length,
      end: i * 10 + ((j + 1) * 10) / chunks.length,
      text: chunks[j],
      title: s.caption,
    });
}
const stamp = (s, v = false) =>
  `00:00:${Math.floor(s).toString().padStart(2, "0")}${v ? "." : ","}${Math.round(
    (s % 1) * 1000,
  )
    .toString()
    .padStart(3, "0")}`;
for (const v of [false, true])
  fs.writeFileSync(
    `media/teaser.${v ? "vtt" : "srt"}`,
    (v ? "WEBVTT\n\n" : "") +
      captions
        .map(
          (c, i) =>
            `${v ? "" : i + 1 + "\n"}${stamp(c.start, v)} --> ${stamp(c.end, v)}\n${c.text}\n`,
        )
        .join("\n"),
  );
const frames = [];
for (let i = 0; i < captions.length; i++) {
  const c = captions[i];
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="64" fill="#173e31"/><text x="26" y="40" font-family="Arial" font-size="27" fill="#fff2cb">${xml(c.title)} · FICTIONAL LOCAL DEMO</text><rect x="100" y="970" width="1720" height="85" rx="8" fill="#173e31"/><text x="960" y="1022" text-anchor="middle" font-family="Arial" font-size="31" fill="#fff2cb">${xml(c.text)}</text></svg>`,
    ),
  )
    .png()
    .toFile(`media/overlays/teaser-${i}.png`);
  frames.push(`file 'teaser-${i}.png'\nduration ${c.end - c.start}`);
}
frames.push(`file 'teaser-${captions.length - 1}.png'`);
fs.writeFileSync("media/overlays/teaser.txt", frames.join("\n"));
fs.writeFileSync(
  "media/audio/teaser.txt",
  scenes.map((_, i) => `file 'teaser-${i}.wav'`).join("\n"),
);
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  "media/audio/teaser.txt",
  "-c:a",
  "pcm_s16le",
  "media/teaser-narration.wav",
]);
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "media/raw/founder-journey.webm",
  "-i",
  "media/teaser-narration.wav",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  "media/overlays/teaser.txt",
  "-filter_complex",
  "[0:v]split=3[x][y][z];[x]trim=start=0:end=10,setpts=PTS-STARTPTS[v0];[y]trim=start=60:end=70,setpts=PTS-STARTPTS[v1];[z]trim=start=108:end=118,setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0,scale=1920:1080[app];[app][2:v]overlay=0:0[v]",
  "-map",
  "[v]",
  "-map",
  "1:a",
  "-t",
  "30",
  "-r",
  "30",
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-movflags",
  "+faststart",
  "media/launchguild-teaser-30sec.mp4",
]);
await sharp(
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="60" fill="#173e31"/><text x="30" y="40" fill="#fff2cb" font-family="Arial" font-size="28">TECHNICAL PROOF / TWO LOCAL TABS / STALE CORRECTION REJECTED; UNRELATED NOTE PRESERVED</text></svg>',
  ),
)
  .png()
  .toFile("media/overlays/technical.png");
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "media/raw/concurrent-edit-proof.webm",
  "-i",
  "media/overlays/technical.png",
  "-filter_complex",
  "[0:v]scale=1728:1080,format=yuv420p,pad=1920:1080:96:0:color=0x173e31,setsar=1[app];[app][1:v]overlay=0:0,scale=1920:1080,setsar=1[v]",
  "-map",
  "[v]",
  "-r",
  "30",
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "media/launchguild-technical-proof.mp4",
]);
const base = await sharp("media/raw/town.png")
  .resize(1920, 1080)
  .blur(1)
  .toBuffer();
await sharp(base)
  .composite([
    {
      input: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect x="70" y="675" width="1780" height="330" fill="#543687"/><text x="125" y="800" font-family="Arial" font-weight="bold" font-size="96" fill="#fff2cb">LaunchGuild</text><text x="130" y="875" font-family="Arial" font-size="46" fill="#fff2cb">One product. Three partners. A decision that holds up.</text><text x="132" y="955" font-family="Arial" font-size="27" fill="#fff2cb">DESIGN PARTNER TYCOON · RECORDED FICTIONAL DEMO</text></svg>',
      ),
    },
  ])
  .png()
  .toFile("media/thumbnail.png");
const probe = (file) =>
  JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      file,
    ]),
  );
fs.writeFileSync(
  "media/media-proof.json",
  JSON.stringify(
    {
      demo: probe("media/launchguild-demo-2min.mp4"),
      teaser: probe("media/launchguild-teaser-30sec.mp4"),
      technical: probe("media/launchguild-technical-proof.mp4"),
      audio: "Local macOS Samantha narration; not ElevenLabs proof",
    },
    null,
    2,
  ),
);
console.log(
  "Independent teaser narration, technical proof, thumbnail and media probes complete.",
);
