import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { CentredOverlayScope } from '#primitives/overlays/centred-overlay';
import { Form } from './form';
import { IssueForm, type IssueDraft } from './form-example';

const meta = {
  title: 'Design System/Primitives/Fields/Form',
  component: Form,
  // The example form holds every field's draft, so each state renders it rather than these args.
  args: { submitLabel: 'Create', onSubmit: fn() },
  argTypes: kitArgTypes('Form'),
  parameters: { screenPreview: true },
  // The desktop Form sits in a centred dialog, where Cancel joins the submit.
  decorators: [
    (Story): React.JSX.Element => (
      <CentredOverlayScope>
        <View className="w-full max-w-md">
          <Story />
        </View>
      </CentredOverlayScope>
    ),
  ],
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

const filled: IssueDraft = {
  title: 'Sign-in sheet closes early',
  description:
    'On Android the sheet closes before the code arrives, so the person has to start again.',
  due: '2026-10-19',
  labels: ['bug'],
};

const handlers = { onSubmit: fn(), onCancel: fn() };

export const Rest: Story = {
  render: (): React.JSX.Element => <IssueForm {...handlers} />,
};

export const Filled: Story = {
  render: (): React.JSX.Element => <IssueForm {...handlers} initial={filled} />,
};

export const Invalid: Story = {
  render: (): React.JSX.Element => (
    <IssueForm {...handlers} titleError="Enter a title." />
  ),
};

export const Submitting: Story = {
  render: (): React.JSX.Element => (
    <IssueForm {...handlers} loading initial={filled} />
  ),
};
