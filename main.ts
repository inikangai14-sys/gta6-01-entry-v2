// Solmar Bay: Night Shift — the entrypoint for make.fun's gta6-01 "Make GTA 6" bounty.
// Node 22, standard library only. It hands the game in: it copies this
// repository's game/ and screenshots/ into the output directory (which the
// grader mounts at /output, or MAKEFUN_OUTPUT_DIR when run by hand) and
// writes /output/dossier.json with the kit's vendored library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader performs must write identical bytes, so this
// program does nothing time- or random-dependent: a straight copy plus a
// deterministic dossier built from the copied files.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(gameDir)) throw new Error('game/ is missing from the repository');
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
// The game loads three.js from its vendored minified build (game/vendor/
// three.module.min.js). Fail fast with a clear message if it is gone,
// instead of handing in a game whose first import 404s.
if (!existsSync(join(gameDir, 'vendor', 'three.module.min.js'))) {
  throw new Error('game/vendor/three.module.min.js is missing — the vendored three.js build is required');
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The shipped screenshots are part of the entry: refuse to hand in a game
// with none, instead of letting the gate report an empty screenshots row.
const shipped = readdirSync(join(outputDir, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shipped.length < 3 || shipped.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shipped.length}`);
}

// Caps mirror the gate in the kit's RULES.txt: at most 4 screenshots of
// 256 KiB, a game/ of at most 993 files and 48 MiB, and a dossier text
// capped at 160 KiB. The dossier is rebuilt by the gate from the same
// files, so these numbers must stay in step with the rules.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
