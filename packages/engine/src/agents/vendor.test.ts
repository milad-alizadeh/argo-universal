import { argoInstructionsMarkdown } from '@repo/contracts/agents/argo-instructions';
import { expect, it } from 'vitest';
import { seededEnvironment, vendorRegistryIds } from './vendor';

it('Claude is installed with its task tools on, so it reports a Plan', () => {
  expect(seededEnvironment(vendorRegistryIds.claude)).toEqual({
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
  });
});

it('Codex is installed with update_plan on and the Argo instructions, so it keeps a Plan', () => {
  const { CODEX_CONFIG } = seededEnvironment(vendorRegistryIds.codex);

  expect(JSON.parse(CODEX_CONFIG ?? '')).toEqual({
    tools: { update_plan: { enabled: true } },
    developer_instructions: argoInstructionsMarkdown(),
  });
  expect(argoInstructionsMarkdown()).toContain('## Plan');
});

it('any other Agent is installed with an empty launch environment', () => {
  expect(seededEnvironment('example-agent')).toEqual({});
});
