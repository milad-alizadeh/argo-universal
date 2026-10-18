import type { PluginSurface } from '@repo/contracts/plugins/kit';

export function pluginPlatform(): PluginSurface['platform'] {
  const bridge = globalThis.window?.argo;

  return bridge ? 'desktop' : 'web';
}
