import type { OperationRow } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import type { PluginOperationService } from '../plugins';
import type { OperationCard, SessionOperationCall } from '../sessions';
import { PluginOperationRouter } from './plugin-run';

const plugin = { id: 'demo:close', pluginId: 'demo', name: 'close' };

type Run = Parameters<PluginOperationService['run']>[0];

const row: OperationRow = {
  id: plugin.id,
  label: 'Close',
  description: '',
  params: {},
  result: {},
  tier: 'act',
  keywords: [],
  enabled: true,
  disabledReason: null,
};

// The Plugin Operations a Server runs, and the Session's Tool call that asks the user, each recording what it was given.
class Fakes {
  public readonly runs: Run[] = [];
  public readonly asked: OperationCard[] = [];

  public readonly operations = {
    rows: (): Promise<OperationRow[]> => Promise.resolve([row]),
    run: (input: Run): Promise<Json> => {
      this.runs.push(input);

      return Promise.resolve({ closed: true });
    },
  };

  public readonly sessions = {
    call: (): SessionOperationCall => ({
      toolCallId: 'call-1',
      canConfirm: true,
      confirm: (card) => {
        this.asked.push(card);

        return Promise.resolve();
      },
      started: (): void => {},
      finish: (): void => {},
    }),
  };

  // The one run the Plugin was handed.
  public first(): Run {
    const [run] = this.runs;

    if (!run) throw new Error('The Plugin was not run');

    return run;
  }

  public router(): PluginOperationRouter {
    return new PluginOperationRouter(this, this.sessions);
  }
}

const session = { kind: 'session', sessionId: 's1', projectId: 'p1' } as const;

it("runs the user's own Plugin Operation as a person, as a tap does", async () => {
  const fakes = new Fakes();

  await fakes.router().runFor({ kind: 'user' }, plugin, { number: 1 });

  expect(fakes.first().caller).toEqual({ person: true });
});

it('hands a Session’s run the way to ask the user, for a Project it names past its own', async () => {
  const fakes = new Fakes();

  await fakes.router().runFor(session, plugin, { projectId: 'p2' });
  await fakes.first().confirm?.({ title: 'Close', description: 'Elsewhere' });

  expect(fakes.first().caller).toEqual({ sessionId: 's1', projectId: 'p1' });
  expect(fakes.asked).toEqual([{ title: 'Close', description: 'Elsewhere' }]);
});
