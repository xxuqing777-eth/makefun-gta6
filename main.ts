import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 50331648;
const MAX_GAME_PATH_BYTES = 1000;
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
  game_max_files: MAX_GAME_FILES,
  game_max_bytes: MAX_GAME_BYTES,
  game_path_max_bytes: MAX_GAME_PATH_BYTES,
};

type TreeTotals = { entries: number; files: number; bytes: number };

function fail(message: string): never {
  throw new Error(`Pre-flight validation failed: ${message}`);
}

function requireDirectory(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) fail(`${label} is missing`);
}

function walkGameTree(root: string): TreeTotals {
  const totals: TreeTotals = { entries: 0, files: 0, bytes: 0 };
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const info = lstatSync(path);
      totals.entries += 1;
      if (info.isDirectory()) visit(path);
      else if (info.isFile()) {
        totals.files += 1;
        totals.bytes += info.size;
      }
    }
  };
  visit(root);
  return totals;
}

function validateInputs(source: string): { game: TreeTotals; screenshots: string[] } {
  const game = join(source, 'game');
  const screenshots = join(source, 'screenshots');
  requireDirectory(game, 'game/');
  if (!existsSync(join(game, 'index.html')) || !statSync(join(game, 'index.html')).isFile()) fail('game/index.html is missing');
  requireDirectory(screenshots, 'screenshots/');
  const screenshotNames = readdirSync(screenshots).filter((name) => lstatSync(join(screenshots, name)).isFile()).sort();
  if (screenshotNames.length === 0) fail('screenshots/ contains no files');
  if (screenshotNames.length > MAX_SCREENSHOTS) fail(`screenshots/ contains ${screenshotNames.length} files; maximum is ${MAX_SCREENSHOTS}`);
  for (const name of screenshotNames) {
    const size = statSync(join(screenshots, name)).size;
    if (size > MAX_SCREENSHOT_BYTES) fail(`${name} is ${size} bytes; maximum is ${MAX_SCREENSHOT_BYTES}`);
  }
  const totals = walkGameTree(game);
  if (totals.entries > MAX_GAME_FILES) fail(`game/ contains ${totals.entries} entries; maximum is ${MAX_GAME_FILES}`);
  if (totals.bytes > MAX_GAME_BYTES) fail(`game/ contains ${totals.bytes} bytes; maximum is ${MAX_GAME_BYTES}`);
  return { game: totals, screenshots: screenshotNames };
}

function copyEntry(source: string, output: string): void {
  rmSync(output, { recursive: true, force: true });
  cpSync(source, output, { recursive: true });
}

function main(): void {
  const source = resolve(import.meta.dirname ?? '.');
  const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  const checked = validateInputs(source);
  mkdirSync(output, { recursive: true });
  copyEntry(join(source, 'game'), join(output, 'game'));
  copyEntry(join(source, 'screenshots'), join(output, 'screenshots'));
  const dossier = buildDossier(output, caps);
  writeFileSync(join(output, 'dossier.json'), dossier);
  const dossierBytes = readFileSync(join(output, 'dossier.json')).byteLength;
  console.log(`Output directory: ${output}`);
  console.log(`Game files copied: ${checked.game.files} files (${checked.game.entries} entries), ${checked.game.bytes} bytes`);
  console.log(`Dossier bytes: ${dossierBytes}`);
  console.log(`Screenshots: ${checked.screenshots.join(', ')}`);
}

main();
