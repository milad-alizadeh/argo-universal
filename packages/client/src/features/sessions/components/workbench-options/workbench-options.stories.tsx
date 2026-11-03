import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CurrentColumn, OptionColumn } from './workbench-option-card.mocks';

/*
 * #1866 options, for the owner to pick from: the Workbench card's header line (Header*) and its surface (Surface*).
 * Each is the Workbench's real 312 column with one Session: Changes, Agents, Shells and an Issue. Nothing is built.
 */

// Option boards draw their own content, so the docs page has no props to show.
const meta = {
  title: 'Sessions/WorkbenchOptions',
  tags: ['!autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// Today: title, chevron and the reorder grip on every card, always; the Issue's page is a card inside the card.
export const HeaderACurrent: Story = {
  render: () => <CurrentColumn label="Header A · Current: grip always on" />,
};

// The grip shows only on the card under the pointer (Agents here), or while it has focus.
export const HeaderBGripOnHover: Story = {
  render: () => (
    <OptionColumn
      label="Header B · Grip on hover (Agents hovered)"
      hovered="subagents"
    />
  ),
};

// The 2026-10 board: section icon in a 28 lane, title, chevron, count trailing; the grip replaces the count on hover.
export const HeaderCIconAndCount: Story = {
  render: () => (
    <OptionColumn
      label="Header C · Icon lane + trailing count (Agents hovered)"
      header="icon-lane"
      hovered="subagents"
    />
  ),
};

// A sidebar section header: quiet secondary title and count, chevron on hover, the whole line drags.
export const HeaderDSidebar: Story = {
  render: () => (
    <OptionColumn
      label="Header D · Sidebar section header (Agents hovered)"
      header="sidebar"
      hovered="subagents"
    />
  ),
};

// Today's glass: a ring and a drop shadow in light, white insets only in dark.
export const SurfaceACurrentGlass: Story = {
  render: () => <OptionColumn label="Surface A · Current glass" />,
};

// The same glass fill edged by the hairline token alone: one edge in light and dark, no drop shadow.
export const SurfaceBHairlineGlass: Story = {
  render: () => (
    <OptionColumn
      label="Surface B · Glass, hairline edge, no shadow"
      surface="hairline-glass"
    />
  ),
};

// A flat tint tile on the page: no edge, no shadow, no blur.
export const SurfaceCFlatTint: Story = {
  render: () => (
    <OptionColumn label="Surface C · Flat tint tile" surface="tint" />
  ),
};
