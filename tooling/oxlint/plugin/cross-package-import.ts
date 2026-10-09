import { defineRule, type Visitor } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const intoWorkspacePackage = /^(?:\.\.\/)+(?:packages|tooling|apps)\//;
export const crossPackageImport = defineRule({
  meta: {
    type: 'problem',
    messages: {
      crossPackageImport:
        'Import another workspace package by its name and an exports entry, not by a relative path into packages/, tooling/ or apps/ (A2).',
    },
  },
  create: (context): Visitor =>
    onModuleSources((source): void => {
      const path = stringValue(source);
      if (intoWorkspacePackage.test(path))
        context.report({ node: source, messageId: 'crossPackageImport' });
    }),
});
