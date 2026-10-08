import type { ESTree } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';
import { isMember, stringValue } from './syntax.ts';

const mockCalls = [
  { object: 'vi', property: 'mock' },
  { object: 'vi', property: 'doMock' },
];
const ownModule = /^(?:\.|@repo\/)/;

const isMockCall = (node: ESTree.CallExpression): boolean =>
  mockCalls.some((call) => isMember(node.callee, call));

export const noInternalMock = defineRule({
  meta: {
    type: 'problem',
    messages: {
      noInternalMock:
        'Pass a fake through the port (machine.provide or a parameter) instead of vi.mock on an own module.',
    },
  },
  create: (context) => ({
    CallExpression: (node): void => {
      const path = stringValue(node.arguments[0]);
      if (isMockCall(node) && ownModule.test(path))
        context.report({ node, messageId: 'noInternalMock' });
    },
  }),
});
