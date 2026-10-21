import { subagentItemOf } from '../../../../../mocks/subagent-rows.mocks';
import type { SubagentRowProps } from './subagent-row';

// A story supplies the opener; a fixture is the Subagent action the row draws.
type SubagentRowFixture = Omit<SubagentRowProps, 'onOpen'>;

export const startedSubagent = {
  item: subagentItemOf('started'),
} satisfies SubagentRowFixture;

export const messagedSubagent = {
  item: subagentItemOf('messaged'),
} satisfies SubagentRowFixture;

export const repliedSubagent = {
  item: subagentItemOf('replied'),
} satisfies SubagentRowFixture;
