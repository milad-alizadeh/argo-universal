import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const unitTest = /(?<!\.integration)\.test\.(?:ts|tsx|mts)$/;
const nodeResources =
  /^(?:node:)?(?:fs(?:\/promises)?|sqlite|child_process|net|https?)$/;
const workspaceResources = /^@repo\/(?:db|git)(?:\/|$)/;

const isResource = (source: string): boolean =>
  nodeResources.test(source) || workspaceResources.test(source);

const memberName = (node: ESTree.MemberExpression): string => {
  if (node.computed) return stringValue(node.property);
  return node.property.type === 'Identifier' ? node.property.name : '';
};

const isNamedObject = (node: ESTree.Node, name: string): boolean =>
  node.type === 'Identifier' && node.name === name;

const isRead = (node: ESTree.Node, object: string, property: string): boolean =>
  node.type === 'MemberExpression' &&
  isNamedObject(node.object, object) &&
  memberName(node) === property;

const readsClock = (node: ESTree.CallExpression): boolean =>
  isRead(node.callee, 'Date', 'now') ||
  isRead(node.callee, 'performance', 'now');

const isCurrentDate = (node: ESTree.NewExpression): boolean =>
  isNamedObject(node.callee, 'Date') && node.arguments.length === 0;

const clockListeners = (context: Context): Visitor => ({
  'CallExpression:exit': (node): void => {
    if (readsClock(node)) context.report({ node, messageId: 'unitTestIo' });
  },
  NewExpression: (node): void => {
    if (isCurrentDate(node)) context.report({ node, messageId: 'unitTestIo' });
  },
});

export const unitTestIo = defineRule({
  meta: {
    type: 'problem',
    messages: {
      unitTestIo:
        'Unit tests replace I/O at its port; use an integration test for real I/O.',
    },
  },
  create: (context): Visitor => {
    if (!unitTest.test(context.filename)) return {};
    return {
      ...onModuleSources((source): void => {
        if (isResource(stringValue(source)))
          context.report({ node: source, messageId: 'unitTestIo' });
      }),
      MemberExpression: (node): void => {
        if (isRead(node, 'process', 'env'))
          context.report({ node, messageId: 'unitTestIo' });
      },
      ...clockListeners(context),
    };
  },
});
