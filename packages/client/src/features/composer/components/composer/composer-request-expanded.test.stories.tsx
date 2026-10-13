import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { SessionLayout } from '#lib/product/session-layout';
import {
  preservesComposer,
  composerControls,
  keptDraft,
} from '../../../../../mocks/composer/request-composer.test.mocks';
import { canPointAt } from '../../../../../mocks/point-hit';
import { shownText } from '../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Composer } from './composer';
const meta = {
  title: 'Tests/Composer/Requests',
  component: Composer,
  parameters: { screenPreview: true },
  decorators: [
    (Story): React.JSX.Element => (
      <SessionLayout
        header={<View />}
        feed={<View className="flex-1" />}
        composer={<Story />}
      />
    ),
  ],
  render: function EditableComposer(args): React.JSX.Element {
    const [draft, setDraft] = useState(args.draft);
    return <Composer {...args} draft={draft} onDraftChange={setDraft} />;
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;
function expandedPlanKeepsComposer(agentIndex: number): Story {
  return {
    args: preservesComposer(agentIndex, 'plan').args,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      const controls = composerControls(canvas);
      const message = canvas.getByRole('textbox', { name: 'Message' });
      await expect(shownText(message)).toBe(keptDraft);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand plan' }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: 'Expanded plan',
      });
      for (const control of controls) {
        await expect(control).toBeVisible();
        await waitFor(() =>
          expect(control.getBoundingClientRect().top).toBeGreaterThanOrEqual(
            dialog.getBoundingClientRect().bottom,
          ),
        );
        await expect(
          control.getBoundingClientRect().bottom,
        ).toBeLessThanOrEqual(window.innerHeight);
      }
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Collapse plan' }),
      );
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', {
            name: 'Expanded plan',
          }),
        ).not.toBeInTheDocument(),
      );
      await expect(shownText(message)).toBe(keptDraft);
      await waitFor(() => expect(canPointAt(message)).toBe(true));
    },
  };
}
export const ClaudeExpandedPlanKeepsComposer = expandedPlanKeepsComposer(0);
export const CodexExpandedPlanKeepsComposer = expandedPlanKeepsComposer(1);
