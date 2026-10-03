import sharp from "sharp";
const letters = {
  L: ["10000", "10000", "10000", "10000", "11111"],
  A: ["01110", "10001", "11111", "10001", "10001"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  G: ["01111", "10000", "10111", "10001", "01110"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  D: ["11110", "10001", "10001", "10001", "11110"],
};
let text = "";
[..."LAUNCHGUILD"].forEach((c, i) =>
  letters[c].forEach((row, y) =>
    [...row].forEach((v, x) => {
      if (v === "1")
        text += `<rect x="${40 + i * 52 + x * 8}" y="${27 + y * 9}" width="8" height="9" fill="#fff2cb"/>`;
    }),
  ),
);
const title = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" shape-rendering="crispEdges"><rect x="18" y="14" width="604" height="69" fill="#302332"/><rect x="22" y="18" width="596" height="61" fill="#61388b"/>${text}<rect x="72" y="302" width="496" height="42" fill="#173e31"/><text x="320" y="321" text-anchor="middle" fill="#fff2cb" font-family="Arial" font-size="13">ONE PRODUCT. THREE PARTNERS. YOUR NEXT DECISION.</text><text x="320" y="336" text-anchor="middle" fill="#fff2cb" font-family="Arial" font-size="8">LAUNCHGUILD · FICTIONAL LOCAL DEMO</text></svg>`,
);
const assets = [
  ["hall", 263, 148, 112],
  ["workshop", 129, 196, 78],
  ["shop", 400, 191, 78],
  ["forge", 431, 247, 66],
  ["tower", 96, 124, 63],
  ["treasury", 220, 246, 66],
];
const layers = [];
for (const [name, left, top, width] of assets)
  layers.push({
    input: await sharp(`public/art/${name}.svg`).resize(width).png().toBuffer(),
    left,
    top,
  });
layers.push({ input: title, left: 0, top: 0 });
const result = await sharp("public/art/forest.svg")
  .resize(640, 360, { fit: "fill" })
  .composite(layers)
  .png()
  .toBuffer();
await sharp(result)
  .resize(1920, 1080, { kernel: "nearest" })
  .png()
  .toFile("media/thumbnail.png");
