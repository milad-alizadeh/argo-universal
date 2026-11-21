import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn } from 'storybook/test';
import { SignIn } from './sign-in';
import { signedOutSignIn } from './sign-in-fixtures';

// What React Native reported on the console while the story drew.
const consoleErrors: string[] = [];

const meta = {
  title: 'Tests/Design System/Primitives/Status/SignIn',
  component: SignIn,
  parameters: { screenPreview: true },
  // React Native consoleErrors a string inside a View on the console as it draws, so the spy is set before the story.
  beforeEach: (): (() => void) => {
    consoleErrors.length = 0;

    const errors = spyOn(console, 'error').mockImplementation((message) => {
      consoleErrors.push(String(message));
    });

    return () => errors.mockRestore();
  },
} satisfies Meta<typeof SignIn>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Plugin may send an empty description; it draws no line, and no stray text reaches a View.
export const EmptyDescriptionDrawsNoText: Story = {
  args: { ...signedOutSignIn, description: '' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading')).toBeVisible();
    await expect(
      consoleErrors.filter((entry) => entry.includes('Unexpected text node')),
    ).toHaveLength(0);
  },
};
