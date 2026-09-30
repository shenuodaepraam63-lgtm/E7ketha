#!/usr/bin/env node
/**
 * Responsive CSS fixes applied at build time (safe if sources already patched).
 */
import fs from "node:fs";
import path from "node:path";

function patchNovelCard() {
  const f = path.resolve("client/src/components/NovelCard.tsx");
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("w-full min-w-0 max-w-none") && s.includes("novel-card__img")) {
    console.log("[patch-css-responsive] NovelCard already responsive");
    return;
  }
  s = s.replace(
    /className=\{`novel-card group relative \$\{compact \? 'min-w-\[160px\] max-w-\[160px\] sm:min-w-\[178px\] sm:max-w-\[178px\]' : 'min-w-\[160px\] max-w-\[160px\] sm:min-w-\[200px\] sm:max-w-\[200px\] md:min-w-\[220px\] md:max-w-\[220px\]'\}`\}/,
    "className={`novel-card group relative w-full min-w-0 max-w-none`}",
  );
  s = s.replace(
    'className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"',
    'className="novel-card__img absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"',
  );
  s = s.replace(
    /className=\{`relative overflow-hidden \$\{compact/,
    "className={`novel-card__cover relative overflow-hidden ${compact",
  );
  s = s.replace(
    'className="line-clamp-1 text-[15px] font-extrabold tracking-[-.03em] hover:text-[#675de8]"',
    'className="line-clamp-2 min-w-0 flex-1 text-[13px] font-extrabold leading-snug tracking-[-.03em] hover:text-[#675de8] sm:text-[15px] sm:line-clamp-1"',
  );
  s = s.replace('<div className="pt-3">', '<div className="min-w-0 pt-3">');
  // Drop unknown rail prop usages from callers if any slipped in
  fs.writeFileSync(f, s);
  console.log("[patch-css-responsive] NovelCard patched");
}

function patchCss() {
  const f = path.resolve("client/src/index.css");
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("novel-card__img") && s.includes("overflow-x: clip") && s.includes("scroll-rail .novel-card")) {
    console.log("[patch-css-responsive] index.css already fixed");
    return;
  }
  if (!s.includes("novel-card__img")) {
    s = s.replace(
      /img\s*\{\s*max-width:\s*100%;\s*height:\s*auto;\s*\}/,
      `img { max-width: 100%; height: auto; }
  img.novel-card__img,
  img.object-cover {
    max-width: none;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }`,
    );
  }
  const hover = `.novel-card:hover {
    transform: perspective(900px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) translateY(-7px);
    filter: drop-shadow(0 20px 22px rgba(38, 36, 104, 0.12));
  }`;
  if (s.includes(hover) && !s.includes("@media (hover: none)")) {
    s = s.replace(
      hover,
      hover +
        `\n  @media (hover: none), (pointer: coarse) {\n    .novel-card:hover { transform: none; filter: none; }\n    .novel-card:active { transform: scale(0.98); }\n  }\n  .novel-card__cover { isolation: isolate; }\n  .novel-card__img {\n    position: absolute;\n    inset: 0;\n    width: 100% !important;\n    height: 100% !important;\n    max-width: none !important;\n    object-fit: cover;\n  }\n  .scroll-rail .novel-card {\n    width: 160px;\n    min-width: 160px;\n    max-width: 160px;\n  }\n  @media (min-width: 640px) {\n    .scroll-rail .novel-card {\n      width: 200px;\n      min-width: 200px;\n      max-width: 200px;\n    }\n  }`,
    );
  } else if (!s.includes("scroll-rail .novel-card")) {
    s += `\n/* responsive card rail */\n.scroll-rail .novel-card { width: 160px; min-width: 160px; max-width: 160px; }\n@media (min-width: 640px) { .scroll-rail .novel-card { width: 200px; min-width: 200px; max-width: 200px; } }\n`;
  }
  if (!s.includes("overflow-x: clip")) {
    s = s.replace(
      "body {\n    @apply bg-background text-foreground;",
      "body {\n    @apply bg-background text-foreground;\n    overflow-x: clip;",
    );
  }
  fs.writeFileSync(f, s);
  console.log("[patch-css-responsive] index.css patched");
}

function patchShell() {
  const f = path.resolve("client/src/components/SiteShell.tsx");
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("pb-[calc(4.5rem")) {
    console.log("[patch-css-responsive] SiteShell already padded");
    return;
  }
  s = s.replace(
    'className="min-h-screen overflow-x-hidden"',
    'className="min-h-screen overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"',
  );
  fs.writeFileSync(f, s);
  console.log("[patch-css-responsive] SiteShell padded");
}

function patchHomeRailProp() {
  const f = path.resolve("client/src/pages/Home.tsx");
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes(" rail")) {
    console.log("[patch-css-responsive] Home rail prop ok");
    return;
  }
  s = s.replace(/\s+rail\s*\/>/g, " />");
  s = s.replace(/\s+rail\s*\}/g, " }");
  fs.writeFileSync(f, s);
  console.log("[patch-css-responsive] Home rail prop removed");
}

patchNovelCard();
patchCss();
patchShell();
patchHomeRailProp();
