import { createBdd } from 'playwright-bdd';
import { test as base } from '../fixtures';
import { scenarioAgents } from './scenario-agents';

export const test = base.extend({
  mockAgents: async ({ $bddTestData }, use): Promise<void> => {
    await use(
      scenarioAgents(
        ($bddTestData?.steps ?? []).map((step): string => step.textWithKeyword),
      ),
    );
  },
});

export const { Given, When, Then } = createBdd(test);
