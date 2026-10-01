import fs from 'fs';
import { spawnSync } from 'child_process';

const p = 'client/src/index.css';
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('cover-drift')) {
  const inject = `
@keyframes cover-drift {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes cover-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-14px) rotate(2deg); }
}
.hero-cover-mosaic img {
  animation: cover-drift 8s ease-in-out infinite;
}
.hero-cover-mosaic img:nth-child(2n) { animation-duration: 10s; animation-delay: -2s; }
.hero-cover-mosaic img:nth-child(3n) { animation-duration: 12s; animation-delay: -4s; }
.hero-cover-mosaic img:nth-child(5n) { animation-duration: 9s; animation-delay: -1s; }
.hero-featured-float {
  animation: cover-float 5.5s ease-in-out infinite;
}
`;
  const marker = '@media (prefers-reduced-motion: reduce)';
  if (s.includes(marker)) {
    s = s.replace(marker, inject + '\n' + marker);
    s = s.replace(
      '.quote-card::after { animation: none; opacity: 0.45; }',
      '.quote-card::after { animation: none; opacity: 0.45; }\n  .hero-cover-mosaic img, .hero-featured-float { animation: none !important; }',
    );
  } else {
    s += inject;
  }
  fs.writeFileSync(p, s);
  console.log('[hero-css] injected');
} else {
  console.log('[hero-css] already present');
}

spawnSync('node', ['scripts/patch-home-hero-mosaic.mjs'], { stdio: 'inherit' });
