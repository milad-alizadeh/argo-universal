import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed } from '#mocks/probe-plugin';
import { pluginLog } from '#mocks/probe-run';

it.each(['openUrl', 'share'])(
  'refuses a javascript: %s Action before sending the tree to an App',
  async (action) => {
    const { home } = await installed(`
    import { Button } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) { argo.pages.register('/', () => jsx(Button, {
      label: 'Open', onPress: { action: '${action}', url: 'javascript:alert(1)', message: 'See this' }
    })); }
  `);

    const { caller } = await startEngineTestHost({ home });
    const view = await caller.plugins.view({ pluginId: 'probe', path: '/' });
    const message = await view[Symbol.asyncIterator]().next();
    expect(JSON.stringify(message.value)).not.toContain('javascript:');

    const lines = (await pluginLog(home))
      .split('\n')
      .filter((line) => line.includes('URL scheme'));

    expect(lines).toEqual([expect.stringContaining('Plugin probe: refused')]);
  },
);
