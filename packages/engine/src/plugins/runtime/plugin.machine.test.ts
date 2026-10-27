import { expect, it } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { crashed, running, type PluginStatus } from '../protocol/runtime';
import { runtimePluginMachine } from './plugin.machine';

type Lifecycle = {
  actor: Actor<typeof runtimePluginMachine>;
  loads: number[];
  answers: PluginStatus[];
  turns: { running: boolean };
};

const granted = { grants: [], codeFolder: '/plugins/atlas' };

const syntaxError = 'Syntax error';

const broken = crashed(syntaxError);

const activate = { type: 'plugin.activate', granted } as const;

const built = (version: string) =>
  ({ type: 'build.loaded', source: `// ${version}`, version }) as const;

function lifecycle(): Lifecycle {
  const loads: number[] = [];
  const answers: PluginStatus[] = [];
  const turns = { running: false };

  const actor = createActor(runtimePluginMachine, {
    input: {
      entry: {
        pluginId: 'atlas',
        directory: '/plugins/atlas',
        main: 'index.tsx',
      },
      host: {
        activate: ({ generation }): void => void loads.push(generation),
        stop: (): void => {},
      },
      clockStart: (): undefined => undefined,
      deferReload: (): boolean => turns.running,
      grant: (): void => {},
      release: (): void => {},
      changed: (): void => {},
      answer: (status): void => void answers.push(status),
      log: (): void => {},
    },
  }).start();

  return { actor, loads, answers, turns };
}

const reported = ({ actor, loads }: Lifecycle, status: PluginStatus): void =>
  actor.send({ type: 'worker.status', status, generation: loads.at(-1) ?? 0 });

it('loads no worker before the first build', () => {
  const plugin = lifecycle();
  plugin.actor.send(activate);

  expect(plugin.loads).toEqual([]);
});

it('loads a worker from the first build', () => {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send(built('1'));

  expect(plugin.loads).toEqual([1]);
});

it('answers once the worker runs', () => {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send(built('1'));
  reported(plugin, running);

  expect(plugin.answers).toEqual([running]);
});

it('answers a crash again until a background pass lets the next activation reload', () => {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send(built('1'));
  reported(plugin, crashed('Atlas threw'));

  plugin.actor.send(activate);
  expect(plugin.loads).toEqual([1]);
  expect(plugin.answers.at(-1)).toEqual(crashed('Atlas threw'));

  plugin.actor.send({ type: 'plugin.restart' });
  plugin.actor.send(activate);
  expect(plugin.loads).toEqual([1, 2]);
});

it('ignores a status from a worker an earlier build loaded', () => {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send(built('1'));
  plugin.actor.send(built('2'));
  plugin.actor.send({ type: 'worker.status', status: running, generation: 1 });

  expect(plugin.answers).toEqual([]);
  expect(plugin.loads).toEqual([1, 2]);
});

function rebuiltDuringTurn(): Lifecycle {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send(built('1'));
  reported(plugin, running);

  plugin.turns.running = true;
  plugin.actor.send(built('2'));

  return plugin;
}

it('keeps the running build while a Turn runs', () => {
  expect(rebuiltDuringTurn().loads).toEqual([1]);
});

it('reloads the latest build once Turns end', () => {
  const plugin = rebuiltDuringTurn();

  plugin.turns.running = false;
  plugin.actor.send({ type: 'turns.ended' });
  expect(plugin.loads).toEqual([1, 2]);
});

it('answers a failed build with its error, without loading, until a build succeeds', () => {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send({ type: 'build.failed', error: syntaxError });
  plugin.actor.send({ type: 'plugin.restart' });
  plugin.actor.send(activate);

  expect(plugin.loads).toEqual([]);
  expect(plugin.answers).toEqual([broken, broken]);

  plugin.actor.send(built('2'));
  expect(plugin.loads).toEqual([3]);
});

function hostCrashedWhileLoading(): Lifecycle {
  const plugin = lifecycle();
  plugin.actor.send(activate);
  plugin.actor.send(built('1'));
  plugin.actor.send({ type: 'host.crashed', message: 'Plugin host exited' });

  return plugin;
}

it('answers a host crash while loading', () => {
  expect(hostCrashedWhileLoading().answers).toEqual([
    crashed('Plugin host exited'),
  ]);
});

it('retries a host crash on the next activation', () => {
  const plugin = hostCrashedWhileLoading();
  plugin.actor.send(activate);

  expect(plugin.loads).toEqual([1, 2]);
});
