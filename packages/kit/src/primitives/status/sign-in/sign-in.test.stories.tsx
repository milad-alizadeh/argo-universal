import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn } from 'storybook/test';
import { SignIn } from './sign-in';
import { signedOutSignIn } from './sign-in-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Status/SignIn',
  component: SignIn,
  parameters: { screenPreview: true },
  // React Native reports a string inside a View on the console while the story draws, so the spy is set before it.
  beforeEach: () => {
    const errors = spyOn(console, 'error');

    return () => errors.mockRestore();
  },
} satisfies Meta<typeof SignIn>;

export default meta;

type Story = StoryObj<typeof meta>;

const textNodeReports = (): unknown[][] =>
  errorCalls().filter(([message]) =>
    String(message).includes('Unexpected text node'),
  );

const errorCalls = (): unknown[][] =>
  (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls;

// A Plugin may send an empty description; it draws no line, and no stray text reaches a View.
export const EmptyDescriptionDrawsNoText: Story = {
  args: { ...signedOutSignIn, description: '' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading')).toBeVisible();
    await expect(textNodeReports()).toHaveLength(0);
  },
};
