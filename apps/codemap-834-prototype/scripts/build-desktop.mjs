import { cpSync, lstatSync, readlinkSync, unlinkSync } from 'node:fs';
// Build the existing desktop entry points unchanged, using the installed E2E bundler.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(`${root}/e2e/package.json`);
const { build } = await import(require.resolve('rolldown'));
for (const [input, file] of [
  ['src/main/main.ts', 'main.cjs'],
  ['src/preload/preload.ts', 'preload.cjs'],
]) {
  await build({
    input: `${root}/apps/desktop/${input}`,
    external: ['electron'],
    platform: 'node',
    output: { file: `${root}/apps/desktop/.vite/build/${file}`, format: 'cjs' },
  });
}
const target = `${root}/apps/universal-app/dist`;
try {
  if (lstatSync(target).isSymbolicLink()) {
    if (readlinkSync(target) !== 'dist-codemap-834')
      throw new Error('Unexpected dist symlink');
    unlinkSync(target);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
cpSync(`${root}/apps/universal-app/dist-codemap-834`, target, {
  recursive: true,
});
console.log(
  'Built unchanged desktop main/preload and copied the prototype export into its expected local dist directory.',
);
