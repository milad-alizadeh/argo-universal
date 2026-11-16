import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SignIn } from './sign-in';
import {
  codeSignIn,
  headerOnlySignIn,
  requestingSignIn,
  signedInSignIn,
  signedOutSignIn,
} from './sign-in-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/SignIn',
  component: SignIn,
  parameters: { screenPreview: true },
  argTypes: kitArgTypes('SignIn'),
} satisfies Meta<typeof SignIn>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = { args: signedOutSignIn };

// A device flow's code is a row of its own, above the row that copies it and continues.
export const Code: Story = { args: codeSignIn };

// Signed in, the Account is a row of its own.
export const SignedIn: Story = { args: signedInSignIn };

// With no rows, the footer sits under the header.
export const HeaderOnly: Story = { args: headerOnlySignIn };

// Only the header, while the service is asked for a code.
export const Requesting: Story = { args: requestingSignIn };
