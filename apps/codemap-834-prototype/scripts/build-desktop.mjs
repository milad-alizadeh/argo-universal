import { lstatSync, readlinkSync, unlinkSync, cpSync } from 'node:fs';
import { build } from 'rolldown';
import { root, exported } from './paths.mjs';

const entries = [
  { input: 'src/main/main.ts', file: 'main.cjs' },
  { input: 'src/preload/preload.ts', file: 'preload.cjs' },
];

async function buildEntry({ input, file }) {
  await build({
    input: `${root}/apps/desktop/${input}`,
    external: ['electron'],
    platform: 'node',
    output: { file: `${root}/apps/desktop/.vite/build/${file}`, format: 'cjs' },
  });
}

function removeExportLink(target) {
  if (!lstatSync(target).isSymbolicLink()) return;

  if (readlinkSync(target) !== 'dist-codemap-834')
    throw new Error('Unexpected dist symlink');
  unlinkSync(target);
}

function prepareTarget(target) {
  try {
    removeExportLink(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

for (const entry of entries) await buildEntry(entry);

const target = `${root}/apps/universal-app/dist`;

prepareTarget(target);

cpSync(exported, target, { recursive: true });

console.log(
  'Built unchanged desktop main/preload and copied the prototype export into its expected local dist directory.',
);
