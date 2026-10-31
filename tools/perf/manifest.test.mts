import { describe, expect, it } from 'vitest';
import { fixtureAgentCondition, realAgentCondition } from './manifest.mts';

describe('what a perf run records about the Agent it drove', () => {
  it('says the fixture run had no authenticated upstream Agent', () => {
    expect(fixtureAgentCondition).toMatch(/scripted ACP fixture/u);
  });

  it('names the installed Agent and the options the run was pinned to', () => {
    const condition = realAgentCondition({
      id: 'an-agent',
      pin: [
        { configId: 'model', value: 'cheapest' },
        { configId: 'effort', value: 'low' },
      ],
    });

    expect(condition).toMatch(/an-agent/u);
    expect(condition).toMatch(/model cheapest and effort low/u);
  });

  it('never inherits the fixture wording for a real-Agent run', () => {
    expect(realAgentCondition({ id: 'an-agent', pin: [] })).not.toMatch(
      /scripted ACP fixture/u,
    );
  });
});
