import { expect, it } from 'vitest';
import { seededEnvironment, vendorRegistryIds } from './vendor';

it('Claude is installed with its task tools on, so it reports a Plan', () => {
  expect(seededEnvironment(vendorRegistryIds.claude)).toEqual({
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
  });
});

it('Codex is installed with update_plan on, so it reports a Plan', () => {
  expect(seededEnvironment(vendorRegistryIds.codex)).toEqual({
    CODEX_CONFIG: '{"tools":{"update_plan":{"enabled":true}}}',
  });
});

it('any other Agent is installed with an empty launch environment', () => {
  expect(seededEnvironment('example-agent')).toEqual({});
});
