import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { sectionOrder } from '../../../../lib/product/navigation/sections';
import { PhoneDrawerContent } from './phone-drawer-content';
import { openPhoneDrawer } from './phone-drawer-content-fixtures';

const meta = {
  title: 'Frame/PhoneDrawerContent',
  component: PhoneDrawerContent,
  parameters: { screenPreview: true },
  argTypes: {
    items: { control: false, description: 'The sections the drawer lists.' },
    selectedSection: { control: 'select', options: [...sectionOrder] },
    attentionCount: {
      control: 'number',
      description:
        'The Sessions that need input or are Unread, for the Sessions row’s badge.',
    },
    pluginBadges: {
      control: false,
      description: 'Each Plugin nav item’s own count, for its row’s badge.',
    },
    open: {
      control: 'boolean',
      description:
        'The drawer is open; a closed one hides from assistive technology.',
    },
    onSectionChange: { control: false },
  },
  args: { ...openPhoneDrawer, onSectionChange: action('section changed') },
} satisfies Meta<typeof PhoneDrawerContent>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * The glass drawer on the window surface. A closed drawer draws the same rows, hidden from
 * assistive technology by the shell that slides it away, so it earns no story of its own.
 */
export const Open: Story = { args: openPhoneDrawer };
