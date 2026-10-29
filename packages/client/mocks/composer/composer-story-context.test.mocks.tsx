import { shownText } from '@repo/kit/mocks/shown-text';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { PortalProvider } from '@repo/kit/primitives/overlays/portal';
import { type Meta, type StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fn, expect, waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { SessionColumn } from '#lib/product/session-column';
import {
  Composer,
  type ComposerDraft,
} from '../../src/features/composer/components/composer/composer';
import { composerProps } from '../composer-mock';
import { spacingPrompt } from './composer-test-contract.test.mocks';

export const meta = {
  title: 'Tests/Composer',
  decorators: [
    (Story): React.JSX.Element => (
      <SessionColumn>
        <Story />
      </SessionColumn>
    ),
  ],
  globals: { mode: 'light' },
  component: Composer,
  render: (args): React.JSX.Element => (
    <Composer {...composerProps({ ...args })} />
  ),
  args: {
    draft: { text: '', attachments: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Composer>;

export type Story = StoryObj<typeof meta>;

export type PlayContext = Parameters<NonNullable<Story['play']>>[0];

export const dark = { globals: { mode: 'dark' } };

export function SendingComposer({
  onSend,
}: {
  onSend: (draft: ComposerDraft) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<ComposerDraft>({
    text: '',
    attachments: [],
  });

  return (
    <Composer
      {...composerProps({
        draft,
        onDraftChange: setDraft,
        onAttachImages: fn(),
        onSend: (sent) => {
          onSend(sent);
          setDraft({ text: '', attachments: [] });
        },
      })}
    />
  );
}

export function typing(width: number): Story {
  const prompt = fn();

  return {
    render: () => <SendingComposer onSend={prompt} />,
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
      const input = await canvas.findByRole('textbox', { name: 'Message' });
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await browserUserEvent.type(input, spacingPrompt);
      await expect(shownText(input)).toBe(spacingPrompt);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
      await expect(prompt).toHaveBeenCalledWith({
        text: spacingPrompt,
        attachments: [],
      });
      await waitFor(() => expect(shownText(input)).toBe(''));
    },
  };
}

export const returnPrompt = fn();

export function imageComposer(
  props: React.ComponentProps<typeof Composer>,
): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <PortalProvider>
          <Composer {...props} />
        </PortalProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
