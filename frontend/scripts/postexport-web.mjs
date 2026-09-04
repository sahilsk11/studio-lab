/**
 * Expo web export points icon fonts at /assets/node_modules/@expo/... paths that
 * Cloudflare Pages does not serve (SPA fallback returns HTML). Patch the export
 * to load Ionicons from a stable same-origin path.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const fontSrc = join(
  root,
  'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
);
const fontDestDir = join(dist, 'fonts');
const fontDest = join(fontDestDir, 'ionicons.ttf');
const fontUrl = '/fonts/ionicons.ttf';

mkdirSync(fontDestDir, { recursive: true });
copyFileSync(fontSrc, fontDest);

const brokenPreload =
  /<link rel="preload" href="\/assets\/node_modules\/@expo\/vector-icons\/[^"]+Ionicons[^"]+\.ttf" as="font" crossorigin="" \/>/g;
const brokenFace =
  /@font-face\{font-family:"ionicons";src:url\("\/assets\/node_modules\/@expo\/vector-icons\/[^"]+Ionicons[^"]+\.ttf"\);font-display:auto\}/g;
const brokenFontUrl =
  /\/(?:assets\/node_modules\/@expo\/vector-icons\/[^"']+Ionicons|fonts\/ionicons)\.[a-f0-9]+\.ttf/g;
const workingFace = `@font-face{font-family:"ionicons";src:url("${fontUrl}") format("truetype");font-display:block}`;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!path.endsWith('.html') && !path.endsWith('.js')) continue;

    let text = readFileSync(path, 'utf8');
    if (!text.includes('ionicons') && !text.includes('Ionicons')) continue;

    text = text.replace(brokenPreload, '');
    text = text.replace(brokenFace, workingFace);
    text = text.replace(brokenFontUrl, fontUrl);

    writeFileSync(path, text);
  }
}

walk(dist);
console.log(`postexport-web: copied Ionicons → ${fontUrl}`);
