import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, screen } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Screen } from '#primitives/scaffolds/screen';
import { withStack } from '#story-stack';
import { Sheet } from './sheet';

// A page a Plugin draws in the sheet: a Screen with a title of its own.
function TitledPage(): ReactElement {
  return (
    <Screen title="Issue">
      <Text>Issue page</Text>
    </Screen>
  );
}

function SessionWithSheet(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Screen title="Session">
      <Button label="Open Issue" onPress={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} label="Issue" bottomEdge>
        <Sheet.Screen name="root">
          <TitledPage />
        </Sheet.Screen>
      </Sheet>
    </Screen>
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Sheet/ScreenHeader',
  component: SessionWithSheet,
  decorators: [withStack()],
  parameters: { screenPreview: true },
} satisfies Meta<typeof SessionWithSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Screen inside a sheet is not the stack's page, so the Session's header stays behind the open sheet.
export const SheetPageKeepsTheHeaderBehindIt: Story = {
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open Issue' }),
    );
    await screen.findByRole('dialog', { name: 'Issue' });
    // The open dialog hides what is behind it from the accessibility tree.
    const headings = canvas.getAllByRole('heading', { hidden: true });
    await expect(headings.map((heading) => heading.textContent)).toEqual([
      'Session',
    ]);
  },
};
