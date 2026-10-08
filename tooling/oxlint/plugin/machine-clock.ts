import type { ESTree } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';
import { isMember, onModuleSources, stringValue } from './syntax.ts';

const crypto = /^(?:node:)?crypto$/;

const readsClock = (node: ESTree.CallExpression): boolean =>
  isMember(node.callee, { object: 'Date', property: 'now' }) ||
  (node.callee.type === 'Identifier' && node.callee.name === 'randomUUID');

export const machineClock = defineRule({
  meta: {
    type: 'problem',
    messages: {
      machineClock: 'Machines receive now and createId through their input.',
    },
  },
  create: (
    context,
  ): ReturnType<typeof onModuleSources> & {
    'CallExpression:exit': (node: ESTree.CallExpression) => void;
  } => ({
    ...onModuleSources((source): void => {
      if (crypto.test(stringValue(source)))
        context.report({ node: source, messageId: 'machineClock' });
    }),
    'CallExpression:exit': (node: ESTree.CallExpression): void => {
      if (readsClock(node)) context.report({ node, messageId: 'machineClock' });
    },
  }),
});
