import type { Plugin } from 'esbuild';
import { requirePluginFile } from './plugin-files';

export const pluginFiles = (directory: string): Plugin => ({
  name: 'argo-plugin-files',
  setup: (build): void => {
    build.onLoad(
      { filter: /.*/, namespace: 'file' },
      async ({ path }): Promise<undefined> => {
        await requirePluginFile(directory, path);

        return undefined;
      },
    );
  },
});
