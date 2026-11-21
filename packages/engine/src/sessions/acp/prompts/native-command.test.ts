import type { ContentBlock } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  requireNativeCommandAuthority,
  requireUnchangedNativeCommand,
} from './native-command';

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

it('checks the original Prompt when a Hook adds or alters a native command', () => {
  expect(() =>
    requireUnchangedNativeCommand(text('Please continue'), text(sampleCommand)),
  ).toThrow('Hook changed a native command');
  expect(() =>
    requireUnchangedNativeCommand(
      text(sampleCommand),
      text('/implement issue-124'),
    ),
  ).toThrow('Hook changed a native command');
  expect(() =>
    requireUnchangedNativeCommand(text(sampleCommand), text(sampleCommand)),
  ).not.toThrow();
});
