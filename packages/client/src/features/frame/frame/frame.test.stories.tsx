import {
  Inspector,
  InspectorPlaceOffer,
} from '@repo/kit/primitives/scaffolds/inspector';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  SessionBandClaim,
  useSessionPanels,
  WorkbenchChangesSummary,
} from '#features/sessions';
import { WindowBandProvider } from '#lib/product/window-band';
import { LayoutListMock } from '../components/layout-list.mocks';
import { Scaffold } from '../scaffold/scaffold';
import { useFrameState } from './frame';

const showInspectorLabel = 'Show Inspector';

const hideInspectorLabel = 'Hide Inspector';

const expanded = 'aria-pressed';

// The Frame's own sidebar and Inspector state around a page, as the App's Frame holds them.
function FrameStatePage({
  content,
}: {
  content: ReactNode;
}): React.JSX.Element {
  const { scaffold, inspectorPlace, bandPlaces } = useFrameState();

  return (
    <View className="flex-1">
      <InspectorPlaceOffer value={inspectorPlace}>
        <WindowBandProvider places={bandPlaces}>
          <Scaffold
            {...scaffold}
            sizeClass="wide"
            sidebar={null}
            list={<LayoutListMock name="Sessions" />}
            page={content}
          />
        </WindowBandProvider>
      </InspectorPlaceOffer>
    </View>
  );
}

const changesOnly = ['changes'];

// A Session's Workbench card opens its Changes tab in the Inspector.
function SessionPage({ title }: { title: string }): React.JSX.Element {
  const panels = useSessionPanels(changesOnly);
  const open = panels.state.tabs.length > 0;
  const toggleChanges = (): void => panels.toggle('changes');

  return (
    <>
      <ScreenStackHeader title={title} />
      <SessionBandClaim
        title={title}
        status="idle"
        startedAt={null}
        workbench={{
          sections: [
            {
              key: 'changes',
              title: 'Changes',
              summary: <WorkbenchChangesSummary onOpen={toggleChanges} />,
              onOpen: toggleChanges,
            },
          ],
          onOpenInspector: toggleChanges,
        }}
      />
      <Inspector
        title="Changes"
        open={open}
        onOpenChange={() => panels.closeAll()}
      >
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

// The Workbench opens Changes and the band's fixed Inspector toggle closes it.
export const ChangesOpensInspector: Story = {
  args: {
    content: <SessionPage title="Fix login" />,
  },
  play: async ({ canvas, userEvent }) => {
    const changes = await canvas.findByRole('button', {
      name: 'Open Changes overview',
    });

    await expect(
      canvas.getByRole('button', { name: showInspectorLabel }),
    ).toHaveAttribute(expanded, 'false');
    await userEvent.click(changes);
    await expect(
      canvas.getByRole('button', { name: hideInspectorLabel }),
    ).toHaveAttribute(expanded, 'true');
    await expect(
      await canvas.findByRole('heading', { name: 'Changes' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: hideInspectorLabel }),
    );
    await expect(
      canvas.getByRole('button', { name: showInspectorLabel }),
    ).toHaveAttribute(expanded, 'false');
  },
};

const longTitle =
  'Build the Session layout from spec 0003, wire the Inspector to the changed files and keep the Composer pinned to the bottom of the window';

// The band keeps a long title's accessible name while truncating before its controls, with the Inspector closed or open.
export const LongSessionTitle: Story = {
  args: {
    content: <SessionPage title={longTitle} />,
  },
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('heading', { name: longTitle });
    const controls = canvas.getByTestId('window-band-trailing');
    const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);

    for (const open of [false, true]) {
      if (open) {
        await userEvent.click(
          canvas.getByRole('button', { name: showInspectorLabel }),
        );
        await expect(
          canvas.getByRole('button', { name: hideInspectorLabel }),
        ).toHaveAttribute(expanded, 'true');
      }

      await expect(heading.getBoundingClientRect().height).toBeLessThan(
        lineHeight * 1.5,
      );
      await expect(heading.getBoundingClientRect().right).toBeLessThanOrEqual(
        controls.getBoundingClientRect().left,
      );
    }
  },
};
