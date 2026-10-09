import { AgentsListOutput, getConfigOptionDiagnostics } from '@repo/contracts';
import { expect, it } from 'vitest';
import { agentCatalog } from '#mocks/agent-catalog';

it('keeps extension categories and metadata on options, groups and values', (): void => {
  const initialUnknownCategoryCount =
    getConfigOptionDiagnostics().unknownCategories;
  expect(AgentsListOutput.parse(agentCatalog)).toEqual(agentCatalog);
  expect(getConfigOptionDiagnostics().unknownCategories).toBe(
    initialUnknownCategoryCount + 1,
  );
});
