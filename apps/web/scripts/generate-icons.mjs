// Genera los íconos PNG de la PWA a partir de public/icons/icon.svg (usa sharp, que ya trae Next).
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));
const maskable = await readFile(new URL("../public/icons/icon-maskable.svg", import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

await sharp(svg).resize(192).png().toFile(out("icon-192.png"));
await sharp(svg).resize(512).png().toFile(out("icon-512.png"));
await sharp(maskable).resize(512).png().toFile(out("icon-maskable-512.png"));
await sharp(maskable).resize(180).png().toFile(out("apple-touch-icon.png"));
console.log("Íconos generados en public/icons/");
