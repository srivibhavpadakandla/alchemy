import fs from "node:fs";
const dir = "public/art";
fs.mkdirSync(dir, { recursive: true });
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`;
const rect = (x, y, w, h, c) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const path = (d, c) => `<path d="${d}" fill="${c}"/>`;
function tree(x, y, k = 1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">${rect(13, 32, 6, 16, "#703f29")}${rect(16, 32, 3, 16, "#402d23")}${path("M14 0h5v6h5v7h5v6h-5v3h9v7h-5v3h10v8H-4v-8h9v-4H0v-7h8v-5H4v-5h6V5h4Z", "#163e31")}${path("M14 4h4v7h5v7h-5v3h8v6h-8v4h12v5H1v-4h9v-5H6v-4h8v-7h-4v-4h4Z", "#246449")}${path("M14 7h3v10h-4v7H8v-3h4v-8h2Zm-1 22h4v6H8v-3h5Z", "#4c9360")}</g>`;
}
let bg = rect(0, 0, 640, 400, "#53c5e7");
bg += path(
  "M0 125 64 87 91 109 163 46 211 95 255 58 310 116 374 64 413 97 478 30 559 100 607 64 640 97v140H0Z",
  "#7bbfb1",
);
bg += path(
  "M0 149 87 117 132 143 203 101 287 150 344 111 391 142 481 91 564 151 621 105 640 125v125H0Z",
  "#3c8f78",
);
for (const [x, y] of [
  [50, 35],
  [270, 28],
  [425, 52],
  [550, 20],
])
  bg += `<g opacity=".82">${rect(x, y, 39, 9, "#fff2cb")}${rect(x + 10, y - 7, 22, 8, "#fff2cb")}${rect(x - 9, y + 5, 62, 8, "#fff2cb")}</g>`;
bg += path(
  "M0 185h40v-8h45v7h42v-18h47v8h34v-7h56v-15h34v11h43v-9h35v14h44v-12h53v10h42v-9h40v14h54v-8h42v9h34v-8h25v236H0Z",
  "#78b947",
);
bg += path(
  "M430 162h29v35h-9v31h23v27h-25v39h-25v26h-14v38h-12v42h-51v-33h30v-40h18v-43h33v-28h-18v-31h20Z",
  "#316e65",
);
bg += path(
  "M437 164h14v37h-9v31h23v14h-25v45h-26v30h-15v41h-12v38h-33v-25h31v-42h20v-43h31v-41h-18v-24h19Z",
  "#4bb9c8",
);
bg += path(
  "M287 163h24v76h88v23H310v68h127v24H298v46h-37v-73H129v-26h145v-45H98v-25h179Z",
  "#bb9253",
);
bg += path(
  "M289 167h15v77h90v13H301v79h129v11H291v53h-21v-87H133v-12h150v-55H104v-10h180Z",
  "#ddba75",
);
for (let i = 0; i < 180; i++) {
  let x = (i * 83 + 21) % 640,
    y = 175 + ((i * 31) % 225);
  bg += rect(x, y, 2, 1, i % 4 ? "#659c3e" : "#acd561");
}
for (let i = 0; i < 28; i++) bg += tree(i * 26 - 22, 139 + (i % 3) * 5, 0.95);
for (let i = 0; i < 10; i++) {
  bg += tree((i % 3) * 28 - 13, 195 + i * 22, 1.15);
  bg += tree(587 + (i % 3) * 26, 185 + i * 24, 1.3);
}
for (let i = 0; i < 8; i++) bg += tree(i * 24 - 10, 337 + (i % 3) * 7, 1.7);
for (let i = 0; i < 7; i++) bg += tree(485 + i * 26, 353 + (i % 2) * 10, 1.5);
fs.writeFileSync(`${dir}/forest.svg`, svg(640, 400, bg));
function building(type) {
  let body = rect(11, 68, 76, 7, "#527c39");
  const roof =
    type === "hall"
      ? "#773363"
      : type === "forge"
        ? "#654d70"
        : type === "shop"
          ? "#2f784b"
          : type === "treasury"
            ? "#8f7130"
            : "#a54e39";
  body +=
    rect(18, 38, 63, 31, "#382b25") +
    rect(22, 40, 55, 25, "#ba8550") +
    rect(22, 48, 55, 3, "#8f5b35") +
    rect(22, 59, 55, 3, "#8f5b35");
  body +=
    path("M12 40V33h7v-7h8v-7h8v-8h29v8h8v7h8v7h8v7Z", "#28222e") +
    path("M18 35h7v-7h8v-7h8v-5h19v7h8v7h8v5h6v3H18Z", roof);
  for (let i = 0; i < 4; i++)
    body += rect(
      29 - i * 4,
      26 + i * 4,
      39 + i * 8,
      2,
      type === "hall" ? "#a44c89" : "#d4764b",
    );
  body +=
    rect(43, 48, 15, 21, "#302b2b") +
    rect(46, 51, 10, 16, "#674735") +
    rect(53, 59, 2, 2, "#ffc857") +
    rect(26, 45, 11, 13, "#382b25") +
    rect(28, 47, 7, 9, "#ffcc69") +
    rect(64, 45, 11, 13, "#382b25") +
    rect(66, 47, 7, 9, "#ffcc69") +
    rect(45, 67, 15, 4, "#dfc593");
  if (type === "hall")
    body +=
      rect(46, 0, 3, 13, "#4c322b") +
      rect(49, 0, 16, 8, "#ffc857") +
      rect(49, 8, 11, 3, "#d59e3a");
  if (type === "forge")
    body += rect(65, 6, 11, 22, "#403447") + rect(63, 5, 15, 5, "#6d5369");
  if (type === "tower")
    body =
      rect(38, 18, 24, 49, "#654b33") +
      rect(34, 17, 33, 6, "#d8ac65") +
      rect(32, 9, 37, 8, "#412d35") +
      path("M29 10h7V5h9V0h11v5h9v5h7v5H29Z", "#a54e39") +
      rect(43, 25, 13, 15, "#ffcc69") +
      rect(46, 50, 9, 18, "#302b2b") +
      rect(28, 66, 42, 6, "#352c28");
  if (type === "shop" || type === "treasury")
    body +=
      rect(24, 38, 53, 6, type === "treasury" ? "#ffc857" : "#b6d978") +
      rect(24, 43, 53, 3, "#264a33");
  return svg(100, 80, body);
}
for (const type of ["hall", "workshop", "forge", "tower", "shop", "treasury"])
  fs.writeFileSync(`${dir}/${type}.svg`, building(type));
const colors = ["#599ad3", "#ba64c5", "#e4ab49", "#ca6652", "#81a981"];
for (let i = 0; i < 5; i++) {
  let p =
    rect(10, 26, 15, 3, "#426537") +
    rect(12, 6, 11, 10, "#e9b679") +
    rect(10, 3, 14, 6, "#43352f") +
    rect(10, 15, 15, 10, colors[i]) +
    rect(8, 16, 4, 7, "#e9b679") +
    rect(23, 16, 4, 7, "#e9b679") +
    rect(11, 25, 5, 5, "#322b32") +
    rect(20, 25, 5, 5, "#322b32") +
    rect(21, 10, 2, 2, "#302d2b");
  fs.writeFileSync(`${dir}/agent-${i}.svg`, svg(36, 34, p));
}
fs.writeFileSync(
  `${dir}/manifest.json`,
  JSON.stringify(
    {
      author: "Original procedural artwork created for LaunchGuild",
      license: "CC0-1.0",
      grid: "integer SVG pixel coordinates; nearest-neighbor rendering",
      assets: [
        "forest.svg",
        "hall.svg",
        "workshop.svg",
        "forge.svg",
        "tower.svg",
        "shop.svg",
        "treasury.svg",
        ...colors.map((_, i) => `agent-${i}.svg`),
      ],
      animation:
        "CSS state selectors; working only for persisted working tasks; no external asset pack",
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  `${dir}/plot.svg`,
  svg(
    100,
    80,
    rect(12, 55, 76, 14, "#bca064") +
      rect(20, 45, 4, 26, "#513d29") +
      rect(75, 45, 4, 26, "#513d29") +
      rect(22, 49, 55, 4, "#d7c18b"),
  ),
);
fs.writeFileSync(
  `${dir}/tent.svg`,
  svg(
    100,
    80,
    path("M10 68 45 20h12l35 48Z", "#344532") +
      path("M15 66 46 24l8 42Z", "#d4b378") +
      path("M54 24 83 66H54Z", "#a38148") +
      path("M43 65 51 44l9 21Z", "#302c29"),
  ),
);
