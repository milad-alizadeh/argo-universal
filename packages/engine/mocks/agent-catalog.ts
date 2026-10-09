import type { AgentProbe } from '@repo/agents';
import type { AgentsListOutput } from '@repo/contracts';

export const agentCatalog: AgentsListOutput = [
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

export const availableAgentProbe: AgentProbe = {
  availability: 'available',
  configOptions: [],
};
