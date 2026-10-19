import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { SettingsLayout } from './settings-layout';
import {
  deviceGroup,
  ExampleSettingsLayout,
  exampleSections,
  noPages,
  serverGroup,
} from './settings-layout.mocks';

const meta = {
  title: 'Tests/SettingsLayout',
  component: SettingsLayout,
  args: { sections: exampleSections },
  render: (): ReactElement => <ExampleSettingsLayout initial="projects" />,
} satisfies Meta<typeof SettingsLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const at = (width: number, story: Story): Story => ({
  ...story,
  beforeEach: () => settleViewport(width),
});

const row = (canvas: Canvas, title: string): HTMLElement =>
  canvas.getByRole('link', { name: new RegExp(`^${title}(?:,|$)`) });

const pageText = (title: string): string => `The ${title} page.`;

const current = 'aria-current';

// Wide: the groups beside the page shown, whose row is marked; a row swaps the page.
export const WideShowsThePageBesideTheList = at(layoutWidths.wide, {
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText(pageText('Projects'))).toBeVisible();
    await expect(canvas.getByText(serverGroup)).toBeVisible();
    await expect(canvas.getByText(deviceGroup)).toBeVisible();
    await expect(row(canvas, 'Projects')).toHaveAttribute(current, 'page');
    await expect(row(canvas, 'Notifications')).toHaveAttribute(
      'href',
      '/settings/notifications',
    );

    await userEvent.click(row(canvas, 'Agents'));

    await expect(await canvas.findByText(pageText('Agents'))).toBeVisible();
    await expect(
      canvas.queryByText(pageText('Projects')),
    ).not.toBeInTheDocument();
    await expect(row(canvas, 'Agents')).toHaveAttribute(current, 'page');
    await expect(row(canvas, 'Projects')).not.toHaveAttribute(current);
  },
});

// A phone: the list alone, with the phone's own pages and no row marked; a row pushes its page in the list's place.
export const PhonePushesEachPage = at(layoutWidths.phone, {
  render: () => <ExampleSettingsLayout />,
  play: async ({ canvas, userEvent }) => {
    await expect(row(canvas, 'Appearance')).toBeVisible();
    await expect(
      canvas.queryByRole('link', { name: /^Notifications/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(row(canvas, 'Appearance'));

    await expect(await canvas.findByText(pageText('Appearance'))).toBeVisible();
    await expect(
      canvas.queryByRole('link', { name: /^Projects/ }),
    ).not.toBeInTheDocument();
  },
});

// No group has a page, as when a search matches none: the caller's empty state takes the list's place.
export const EmptyShowsTheEmptyState = at(layoutWidths.wide, {
  render: () => (
    <ExampleSettingsLayout initial="projects" sections={[{ items: [] }]} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(noPages)).toBeVisible();
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    await expect(canvas.getByText(pageText('Projects'))).toBeVisible();
  },
});
