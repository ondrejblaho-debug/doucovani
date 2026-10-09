// Copies the public (anonymised) data/curriculum.json and data/keys.json into src/generated (bundled at build time).
import { copyFileSync, mkdirSync } from 'node:fs';
const g = new URL('../src/generated/', import.meta.url);
mkdirSync(g, { recursive: true });
copyFileSync(new URL('../data/curriculum.json', import.meta.url), new URL('curriculum.json', g));
copyFileSync(new URL('../data/keys.json', import.meta.url), new URL('keys.json', g));
