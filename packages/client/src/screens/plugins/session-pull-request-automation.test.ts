import type { Change } from '@repo/contracts';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import { describe, expect, it, type Mock, vi } from 'vitest';
import type { SlotReading } from '#features/plugins';
import type { SessionPullRequest } from '#features/sessions';
import {
  type RowActionPorts,
  withRowActions,
} from './session-pull-request-actions';
import { sessionPullRequests } from './session-pull-requests';

const automation = {
  fix: { on: false, available: false },
  merge: { on: true, available: true },
  archive: { on: false, available: false },
};

const change: Change = {
  id: 'github:owner/repository#12',
  stage: 'open',
  title: 'Add the thing',
  repository: 'owner/repository',
  pullRequest: {
    number: 12,
    url: 'https://github.com/owner/repository/pull/12',
  },
  automation,
};

const reading = (item: Change): SlotReading<Change> => ({
  items: [
    {
      pluginId: 'github',
      pluginName: 'GitHub',
      pluginIcon: iconSymbols.plug,
      item,
    },
  ],
  overflow: [],
  owner: undefined,
});

describe('the automation a Change offers', () => {
  it('reaches the row as the Plugin sent it', () => {
    expect(sessionPullRequests(reading(change))[0]?.automation).toEqual(
      automation,
    );
  });

  it('leaves the row with none when the Plugin offers none', () => {
    const bare: Change = { ...change, automation: undefined };

    expect(sessionPullRequests(reading(bare))[0]).not.toHaveProperty(
      'automation',
    );
  });
});

const row: SessionPullRequest = {
  stage: 'open',
  number: 12,
  title: 'Add the thing',
  mergeable: true,
  repository: 'owner/repository',
  url: 'https://github.com/owner/repository/pull/12',
  automation,
};

const scope = { projectId: 'project-1', sessionId: 'session-1' };

type Run = RowActionPorts['run'];

function ports(
  run: Run = () => Promise.resolve({ result: null }),
): RowActionPorts & {
  run: Mock<Run>;
  failed: Mock<RowActionPorts['failed']>;
} {
  return {
    scope,
    run: vi.fn<Run>(run),
    failed: vi.fn<RowActionPorts['failed']>(),
    copy: vi.fn<RowActionPorts['copy']>(() => Promise.resolve(true)),
  };
}

describe('ticking an automation in the row menu', () => {
  it("runs the GitHub Plugin's automationSet for that PR, in the Session's scope", () => {
    const kit = ports();
    const [first] = withRowActions([row], kit);

    first?.onSetAutomation?.('merge', false);

    expect(kit.run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'automationSet',
      args: { reference: 'owner/repository#12', kind: 'merge', on: false },
      ...scope,
    });
  });

  it('says why a tick failed', async () => {
    const error = new Error('refused');
    const kit = ports(() => Promise.reject(error));
    const [first] = withRowActions([row], kit);

    first?.onSetAutomation?.('merge', true);
    await vi.waitFor(() => expect(kit.failed).toHaveBeenCalledWith(error));
  });

  it('offers no tick for a PR with no automation, or whose repository is unknown', () => {
    const [bare, unknown] = withRowActions(
      [
        { ...row, automation: undefined },
        { ...row, repository: undefined },
      ],
      ports(),
    );

    expect(bare?.onSetAutomation).toBeUndefined();
    expect(unknown?.onSetAutomation).toBeUndefined();
  });
});
