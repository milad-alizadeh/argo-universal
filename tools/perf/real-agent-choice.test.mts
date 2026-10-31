import { describe, expect, it } from 'vitest';
import { realAgentChoice } from './real-agent-choice.mts';

const pin = 'model=cheapest,effort=low';

describe('choosing the real Agent a perf run drives', () => {
  it('keeps a value that contains its own equals sign', () => {
    expect(
      realAgentChoice({ agent: 'an-agent', options: 'model=a=b' })?.pin,
    ).toEqual([{ configId: 'model', value: 'a=b' }]);
  });

  it('drives no real Agent when no Agent is named', () => {
    expect(realAgentChoice({ agent: undefined, options: pin })).toBeUndefined();
  });

  it('drives no real Agent when the named Agent is empty', () => {
    expect(realAgentChoice({ agent: '', options: pin })).toBeUndefined();
  });

  it('names the Registry Agent to install and the options to pin it to', () => {
    expect(realAgentChoice({ agent: 'an-agent', options: pin })).toEqual({
      id: 'an-agent',
      pin: [
        { configId: 'model', value: 'cheapest' },
        { configId: 'effort', value: 'low' },
      ],
    });
  });

  it('refuses a run that states no options, which would prompt at the Agent default', () => {
    expect(() =>
      realAgentChoice({ agent: 'an-agent', options: undefined }),
    ).toThrow(/PERF_AGENT_OPTIONS/u);
  });

  it('refuses an option that names no value', () => {
    expect(() =>
      realAgentChoice({ agent: 'an-agent', options: 'model' }),
    ).toThrow(/model/u);
  });

  it('refuses an option whose value is empty', () => {
    expect(() =>
      realAgentChoice({ agent: 'an-agent', options: 'model=' }),
    ).toThrow(/model/u);
  });

  it('refuses the same option twice, since only one of the two would be pinned', () => {
    expect(() =>
      realAgentChoice({ agent: 'an-agent', options: 'model=a,model=b' }),
    ).toThrow(/model/u);
  });
});
