import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import {
  CapsuleButton,
  CodeBlock,
  EvidenceCard,
  PairingSheet,
  SheetField,
} from '.';

// App-only, so it has no Contracts schema and no props table.
const meta = {
  title: 'Design System/Primitives/Scaffolds/PairingSheet',
  component: PairingSheet,
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  args: {
    tone: 'info',
    icon: 'settings',
    title: 'Something is off',
    body: 'A line that says why.',
    actions: (
      <>
        <CapsuleButton label="Primary" variant="primary" onPress={fn()} />
        <CapsuleButton label="Secondary" onPress={fn()} />
      </>
    ),
  },
} satisfies Meta<typeof PairingSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithEvidenceCard: Story = {
  args: {
    children: (
      <EvidenceCard icon="settings" lead="Route up to" detail="The setting" />
    ),
  },
};

export const WithCode: Story = {
  args: {
    tone: 'warning',
    icon: 'code',
    badge: 'Tag',
    children: <CodeBlock label="File" name="Key" value="value" />,
  },
};

export const WithField: Story = {
  args: {
    tone: 'neutral',
    icon: 'computer-off',
    children: (
      <SheetField
        value=""
        placeholder="name:1234"
        hint="What the field asks for"
        onChangeText={fn()}
      />
    ),
  },
};

export const Waiting: Story = {
  args: { icon: undefined, inline: true, actions: undefined },
};
