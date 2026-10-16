import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const skiaRequire = createRequire(
  require.resolve('@shopify/react-native-skia/package.json'),
);

const source = skiaRequire.resolve('canvaskit-wasm/bin/full/canvaskit.wasm');

const target = new URL(
  '../../universal-app/public/codemap-834/',
  import.meta.url,
);

mkdirSync(target, { recursive: true });

copyFileSync(source, new URL('canvaskit.wasm', target));

console.log(
  `CanvasKit SHA256 ${createHash('sha256').update(readFileSync(source)).digest('hex')}`,
);
