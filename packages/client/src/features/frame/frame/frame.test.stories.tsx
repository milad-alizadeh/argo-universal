import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { SessionHeader } from '#features/sessions';
import { ListTitle } from '#lib/product/list-title';
import { Inspector } from '#primitives/scaffolds/inspector';
import { LayoutListMock } from '../components/layout-list.mocks';
import { Scaffold } from '../scaffold/scaffold';
import { useFrameState } from './frame';
import { FrameInspectorHost, ScreenInspector } from './frame-inspector';

const expanded = 'aria-expanded';

// The Frame's own sidebar and Inspector state around a page, as the App's Frame holds them.
function FrameStatePage({
  content,
}: {
  content: ReactNode;
}): React.JSX.Element {
  const { scaffold, inspectorHost } = useFrameState();

  return (
    <View className="flex-1">
      <FrameInspectorHost value={inspectorHost}>
        <Scaffold
          {...scaffold}
          sizeClass="wide"
          sidebar={null}
          listHeader={<ListTitle>Sessions</ListTitle>}
          list={<LayoutListMock name="Sessions" />}
          page={<ScreenInspector>{content}</ScreenInspector>}
        />
      </FrameInspectorHost>
    </View>
  );
}

// A Session page's header, whose Changes button holds its Changes Inspector open.
function SessionPage({ title }: { title: string }): React.JSX.Element {
  const [open, onOpenChange] = useState(false);

  return (
    <>
      <SessionHeader
        title={title}
        status="idle"
        startedAt={null}
        changes={{ open, onOpenChange }}
      />
      <Inspector title="Changes" open={open} onOpenChange={onOpenChange}>
        {null}
      </Inspector>
    </>
  );
}

const meta = {
  title: 'Tests/Frame',
  component: FrameStatePage,
  parameters: { screenPreview: true },
  args: { content: null },
  beforeEach: async (): Promise<void> => {
    await page.viewport(1440, 844);
  },
} satisfies Meta<typeof FrameStatePage>;

export default meta;

type Story = StoryObj<typeof meta>;

// The open Session's Changes button opens the Inspector beside it and closes it again.
export const ChangesOpensInspector: Story = {
  args: {
    content: <SessionPage title="Fix login" />,
  },
  play: async ({ canvas, userEvent }) => {
    const changes = await canvas.findByRole('button', { name: 'Changes' });
    await expect(changes).toHaveAttribute(expanded, 'false');
    await userEvent.click(changes);
    await expect(changes).toHaveAttribute(expanded, 'true');
    await expect(
      await canvas.findByRole('heading', { name: 'Changes' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    );
    await expect(changes).toHaveAttribute(expanded, 'false');
  },
};

const longTitle =
  'Build the Session layout from spec 0003, wire the Inspector to the changed files and keep the Composer pinned to the bottom of the window';

// The Session header keeps a long title on one line with its whole text in the heading's name, and never covers the header actions, with the Inspector closed or open.
export const LongSessionTitle: Story = {
  args: {
    content: <SessionPage title={longTitle} />,
  },
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('heading', { name: longTitle });
    const changes = canvas.getByRole('button', { name: 'Changes' });
    const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);

    for (const open of [false, true]) {
      if (open) {
        await userEvent.click(changes);
        await expect(changes).toHaveAttribute(expanded, 'true');
      }

      await expect(heading.getBoundingClientRect().height).toBeLessThan(
        lineHeight * 1.5,
      );
      await expect(heading.getBoundingClientRect().right).toBeLessThanOrEqual(
        changes.getBoundingClientRect().left,
      );
    }
  },
};
