import {
  type AgentsListOutput,
  getConfigOptionDiagnostics,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { unreachableServices } from '../../mocks';
import { appRouter } from '../root';

it('keeps extension categories and metadata on options, groups and values', async () => {
  const catalog: AgentsListOutput = [
    {
      agent: 'agent-one',
      label: 'First Agent',
      logo: '<svg/>',
      availability: 'available',
      configOptions: [
        {
          configId: 'extension',
          name: 'Extension',
          category: 'custom_category',
          type: 'select',
          currentValue: 'on',
          _meta: { extension: { enabled: true } },
          options: [
            {
              groupId: 'group',
              name: 'Group',
              _meta: { source: 'extension' },
              options: [
                {
                  value: 'on',
                  name: 'On',
                  _meta: {
                    argo: { icon: 'Shield', tone: 'safe' },
                    extension: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ];
  const caller = appRouter.createCaller({
    services: unreachableServices({
      agents: { list: async () => catalog },
    }),
  });
  const before = getConfigOptionDiagnostics().unknownCategories;
  await expect(caller.agents.list()).resolves.toEqual(catalog);
  expect(getConfigOptionDiagnostics().unknownCategories).toBe(before + 1);
});
