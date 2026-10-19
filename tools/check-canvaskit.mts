import { hash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const appRequire = createRequire(
  new URL('../apps/universal-app/package.json', import.meta.url),
);

const skiaRequire = createRequire(
  appRequire.resolve('@shopify/react-native-skia/package.json'),
);

const pinned = skiaRequire.resolve('canvaskit-wasm/bin/full/canvaskit.wasm');

const served = new URL(
  '../apps/universal-app/public/canvaskit.wasm',
  import.meta.url,
);

const [expected, actual] = await Promise.all([
  readFile(pinned),
  readFile(served),
]);

if (hash('sha256', actual) !== hash('sha256', expected))
  throw new Error(
    'CanvasKit differs from pinned Skia. Run pnpm install to copy it again.',
  );
