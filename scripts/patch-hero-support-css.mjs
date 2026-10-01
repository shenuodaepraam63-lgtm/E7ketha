import fs from 'fs';
import { spawnSync } from 'child_process';

const p = 'client/src/index.css';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('hero-wallpaper-img')) {
  const inject = `
@keyframes hero-kenburns {
  0% { transform: scale(1) translate(0, 0); }
  50% { transform: scale(1.08) translate(-1.5%, -1%); }
  100% { transform: scale(1) translate(0, 0); }
}
@keyframes cover-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-14px) rotate(2deg); }
}
.hero-wallpaper {
  overflow: hidden;
}
.hero-wallpaper-img {
  animation: hero-kenburns 22s ease-in-out infinite;
  will-change: transform;
}
.hero-featured-float {
  animation: cover-float 5.5s ease-in-out infinite;
}
`;
  const marker = '@media (prefers-reduced-motion: reduce)';
  if (s.includes(marker)) {
    s = s.replace(marker, inject + '\n' + marker);
    if (!s.includes('hero-wallpaper-img { animation: none')) {
      s = s.replace(
        '.quote-card::after { animation: none; opacity: 0.45; }',
        '.quote-card::after { animation: none; opacity: 0.45; }\n  .hero-wallpaper-img, .hero-featured-float, .hero-cover-mosaic img { animation: none !important; }',
      );
    }
  } else {
    s += inject;
  }
  fs.writeFileSync(p, s);
  console.log('[hero-css] wallpaper motion injected');
} else {
  console.log('[hero-css] already present');
}

// Force re-run hero patch (allow rewrite from mosaic → wallpaper)
spawnSync('node', ['scripts/patch-home-hero-mosaic.mjs'], { stdio: 'inherit' });
