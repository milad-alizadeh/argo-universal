import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { sectionOrder } from '../../../../lib/product/navigation/sections';
import { pluginNavigationItems } from '../navigation-items.mocks';
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
    items: pluginNavigationItems,
    selectedSection: 'sessions',
    attentionCount: 1,
    open: true,
    onSectionChange: action('section changed'),
  },
} satisfies Meta<typeof PhoneDrawerContent>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper's "LiveSessionList (phone) / Drawer open": the glass drawer on the window surface.
export const Overview: Story = { name: 'PhoneDrawerContent' };
