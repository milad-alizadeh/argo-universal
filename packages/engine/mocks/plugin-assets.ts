import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  pluginAssetPath,
  type PluginAssetRef,
} from '@repo/contracts/plugins/assets';
import { startEngineTestHost } from './engine';
import { installed, probeSource } from './probe-plugin';

// The App asking for media, which is how everything but a web page elsewhere reaches a Plugin asset (#1696).
export const appOrigin = { origin: 'app://app' };

export const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c4V0AAAAASUVORK5CYII=',
  'base64',
);

export const imageReference: PluginAssetRef = {
  pluginId: 'probe',
  hash: '2306419cb6c401fff60ec8953df1fb373ed37578bdb812aedef6e902e947ae86',
  format: 'png',
};

type AssetProbe = Awaited<ReturnType<typeof startEngineTestHost>> & {
  probe: Awaited<ReturnType<typeof installed>>;
  assetUrl: string;
};

export async function assetProbe(): Promise<AssetProbe> {
  const probe = await installed(
    probeSource({ image: "argo.assets.resolve({ asset: 'avatar.png' })" }),
  );

  await writeFile(join(probe.code, 'avatar.png'), image);
  const started = await startEngineTestHost({ home: probe.home });
  const status = await started.caller.plugin.activate({ pluginId: 'probe' });

  if (status.state !== 'running')
    throw new Error(status.error ?? 'Plugin failed to start');

  return {
    ...started,
    probe,
    assetUrl: `${started.url}${pluginAssetPath(imageReference)}`,
  };
}
