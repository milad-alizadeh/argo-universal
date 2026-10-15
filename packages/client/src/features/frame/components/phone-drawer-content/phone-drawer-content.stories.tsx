import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { sectionOrder } from '../../../../lib/product/navigation/sections';
import { PhoneDrawerContent } from './phone-drawer-content';

const meta = {
  title: 'Frame/PhoneDrawerContent',
  component: PhoneDrawerContent,
  parameters: { screenPreview: true },
  argTypes: {
    selectedSection: { control: 'select', options: [...sectionOrder] },
    attentionCount: { control: 'number' },
  },
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    open: true,
    width: 300,
    onSectionChange: action('section changed'),
  },
} satisfies Meta<typeof PhoneDrawerContent>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper's "LiveSessionList (phone) / Drawer open": the glass drawer over its warm glow.
export const Overview: Story = { name: 'PhoneDrawerContent' };
