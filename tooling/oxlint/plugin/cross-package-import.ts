import { defineRule } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const intoWorkspacePackage = /^(?:\.\.\/)+(?:packages|tooling|apps)\//;
const intoAdapter = /^(?:\.\.\/)+packages\/agents\/([^/]+)\//;
const mockCliFolder = /\/mocks\/cli\/([^/]+)\//;

const agentFolder = (path: string, pattern: RegExp): string =>
  pattern.exec(path)?.[1] ?? '';

// A mock CLI may reach its own Agent's adapter folder: mocks/cli/<agent>/ to packages/agents/<agent>/ (ADR-0015).
const isOwnAdapter = (filename: string, path: string): boolean => {
  const agent = agentFolder(path, intoAdapter);
  return agent !== '' && agent === agentFolder(filename, mockCliFolder);
};

export const crossPackageImport = defineRule({
  meta: {
    type: 'problem',
    messages: {
      crossPackageImport:
        'Import another workspace package by its name and an exports entry, not by a relative path into packages/, tooling/ or apps/ (A2).',
    },
  },
  create: (context) =>
    onModuleSources((source) => {
      const path = stringValue(source);
      if (
        intoWorkspacePackage.test(path) &&
        !isOwnAdapter(context.filename, path)
      )
        context.report({ node: source, messageId: 'crossPackageImport' });
    }),
});
