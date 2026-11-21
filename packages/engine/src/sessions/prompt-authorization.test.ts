import type { ContentBlock } from '@repo/contracts';
import type { CoreHooks } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import {
  requireNativeCommandAuthority,
  runPromptSubmitHook,
} from './prompt-authorization';

const text = (text: string): ContentBlock[] => [{ type: 'text', text }];

const sampleCommand = '/implement issue-123';

const starter = {
  type: 'session' as const,
  sessionId: 'starter',
  title: 'Starter',
};

it('requires human authority for native command syntax in Agent text blocks', () => {
  expect(() =>
    requireNativeCommandAuthority(
      [...text('Please continue'), ...text(sampleCommand)],
      starter,
    ),
  ).toThrow('requires a person');
  expect(() =>
    requireNativeCommandAuthority(text('$implement #123'), starter),
  ).toThrow('requires a person');
  expect(() =>
    requireNativeCommandAuthority(
      text('/project/inspect.txt is ready'),
      starter,
    ),
  ).not.toThrow();
});

const promptInput = {
  sessionId: 'session',
  projectId: 'project',
  prompt: text(sampleCommand),
};

const rewrite =
  (value: string): CoreHooks['prompt.submit'] =>
  () =>
    Promise.resolve({ prompt: text(value) });

it('checks the original Prompt when a Hook adds or alters a native command', async () => {
  await expect(
    runPromptSubmitHook(rewrite(sampleCommand), {
      ...promptInput,
      prompt: text('Please continue'),
    }),
  ).rejects.toThrow('Hook changed a native command');
  await expect(
    runPromptSubmitHook(rewrite('/implement issue-124'), promptInput),
  ).rejects.toThrow('Hook changed a native command');
  await expect(
    runPromptSubmitHook(rewrite(sampleCommand), promptInput),
  ).resolves.toEqual({ prompt: text(sampleCommand) });
});
