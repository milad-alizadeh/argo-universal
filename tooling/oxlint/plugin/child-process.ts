import { defineRule, type Visitor } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const childProcess = /^(?:node:)?child_process$/;

export const childProcessImport = defineRule({
  meta: {
    type: 'problem',
    messages: {
      childProcess:
        'Apps run git through packages/git (ADR-0008); only the named process owners open subprocesses.',
    },
  },
  create: (context): Visitor =>
    onModuleSources((source): void => {
      if (childProcess.test(stringValue(source)))
        context.report({ node: source, messageId: 'childProcess' });
    }),
});
