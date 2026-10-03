import fs from "node:fs";
import sharp from "sharp";
import { spawnSync } from "node:child_process";
const plan = JSON.parse(fs.readFileSync("media/composition.json", "utf8"));
fs.mkdirSync("media/audio", { recursive: true });
function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw Error(`${cmd}: ${r.stderr?.slice(-4000)}`);
  return r.stdout;
}
let offset = 0,
  captions = [],
  index = 1;
const stamp = (s, vtt = false) => {
  const ms = Math.round(s * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${vtt ? "." : ","}${String(ms % 1000).padStart(3, "0")}`;
};
for (const scene of plan.scenes) {
  fs.writeFileSync(`media/audio/${scene.id}.txt`, scene.narration);
  if (!fs.existsSync(`media/audio/${scene.id}.aiff`))
    run("say", [
      "-v",
      "Samantha",
      "-r",
      "170",
      "-f",
      `media/audio/${scene.id}.txt`,
      "-o",
      `media/audio/${scene.id}.aiff`,
    ]);
  const seconds = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      `media/audio/${scene.id}.aiff`,
    ]),
  );
  const tempo = Math.max(1, seconds / (scene.seconds - 0.8));
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    `media/audio/${scene.id}.aiff`,
    "-af",
    `atempo=${tempo},apad,atrim=0:${scene.seconds}`,
    "-ar",
    "48000",
    "-ac",
    "2",
    `media/audio/${scene.id}.wav`,
  ]);
  const words = scene.narration.split(" "),
    chunks = [];
  for (let i = 0; i < words.length; i += 11)
    chunks.push(words.slice(i, i + 11).join(" "));
  chunks.forEach((text, i) =>
    captions.push({
      id: index++,
      start: offset + (i * scene.seconds) / chunks.length,
      end: offset + ((i + 1) * scene.seconds) / chunks.length - 0.05,
      text,
    }),
  );
  offset += scene.seconds;
  console.log(`Narration ${scene.id}`);
}
fs.writeFileSync(
  "media/audio/concat.txt",
  plan.scenes.map((s) => `file '${s.id}.wav'`).join("\n"),
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
  "media/audio/concat.txt",
  "-c:a",
  "pcm_s16le",
  "media/narration.wav",
]);
fs.writeFileSync(
  "media/demo.srt",
  captions
    .map((c) => `${c.id}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`)
    .join("\n"),
);
fs.writeFileSync(
  "media/demo.vtt",
  "WEBVTT\n\n" +
    captions
      .map(
        (c) => `${stamp(c.start, true)} --> ${stamp(c.end, true)}\n${c.text}\n`,
      )
      .join("\n"),
);
fs.writeFileSync(
  "media/narration-script.md",
  `# LaunchGuild narration\n\nDisclosure: ${plan.disclosure}\n\n` +
    plan.scenes
      .map((s) => `## ${s.id} (${s.seconds}s)\n\n${s.narration}\n`)
      .join("\n"),
);
fs.mkdirSync("media/overlays", { recursive: true });
const xml = (v) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let overlayList = [];
for (let i = 0; i < captions.length; i++) {
  const c = captions[i],
    duration = (captions[i + 1]?.start ?? 120) - c.start;
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="40" fill="#173e31"/><text x="28" y="27" fill="#fff2cb" font-family="Arial" font-size="18">RECORDED LOCAL DEMO / FICTIONAL DATA / PROVIDER PROOF PENDING</text><rect x="140" y="981" width="1640" height="73" rx="5" fill="#173e31" fill-opacity=".96"/><text x="960" y="1026" text-anchor="middle" fill="#fff9e8" font-family="Arial" font-size="30">${xml(c.text)}</text></svg>`;
  await sharp(Buffer.from(frame))
    .png()
    .toFile(`media/overlays/caption-${i}.png`);
  overlayList.push(`file 'caption-${i}.png'\nduration ${duration}`);
}
overlayList.push(`file 'caption-${captions.length - 1}.png'`);
fs.writeFileSync("media/overlays/concat.txt", overlayList.join("\n"));
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "media/raw/founder-journey.webm",
  "-i",
  "media/narration.wav",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  "media/overlays/concat.txt",
  "-filter_complex",
  "[0:v]scale=1920:1080:flags=lanczos[app];[app][2:v]overlay=0:0:format=auto[v]",
  "-map",
  "[v]",
  "-map",
  "1:a",
  "-t",
  "120",
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
  "-b:a",
  "192k",
  "-movflags",
  "+faststart",
  "media/launchguild-demo-2min.mp4",
]);
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "media/launchguild-demo-2min.mp4",
  "-filter_complex",
  "[0:v]trim=start=0:end=10,setpts=PTS-STARTPTS[v0];[0:a]atrim=start=0:end=10,asetpts=PTS-STARTPTS[a0];[0:v]trim=start=60:end=70,setpts=PTS-STARTPTS[v1];[0:a]atrim=start=60:end=70,asetpts=PTS-STARTPTS[a1];[0:v]trim=start=108:end=118,setpts=PTS-STARTPTS[v2];[0:a]atrim=start=108:end=118,asetpts=PTS-STARTPTS[a2];[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]",
  "-map",
  "[v]",
  "-map",
  "[a]",
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "20",
  "-c:a",
  "aac",
  "-movflags",
  "+faststart",
  "media/launchguild-teaser-30sec.mp4",
]);
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  "media/launchguild-demo-2min.mp4",
  "-vf",
  "fps=1/10,scale=480:270,tile=3x4",
  "-frames:v",
  "1",
  "media/video-contact-sheet.jpg",
]);
fs.writeFileSync(
  "media/media-proof.json",
  JSON.stringify(
    {
      composition: plan,
      probe: JSON.parse(
        run("ffprobe", [
          "-v",
          "error",
          "-show_format",
          "-show_streams",
          "-of",
          "json",
          "media/launchguild-demo-2min.mp4",
        ]),
      ),
      teaser: JSON.parse(
        run("ffprobe", [
          "-v",
          "error",
          "-show_format",
          "-show_streams",
          "-of",
          "json",
          "media/launchguild-teaser-30sec.mp4",
        ]),
      ),
    },
    null,
    2,
  ),
);
console.log("Rendered two-minute demo, teaser, captions and contact sheet.");
