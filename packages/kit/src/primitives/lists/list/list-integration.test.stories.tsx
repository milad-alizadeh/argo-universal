import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScrollView } from 'react-native';
import { expect, waitFor, fn } from 'storybook/test';
import { page } from 'vitest/browser';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { ListItem } from '#primitives/lists/list-item';
import { Page } from '#primitives/scaffolds/page';
import { Svg } from '#primitives/visual';
import { List } from './list';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Integration',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const titles = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

const xml =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><path d="M0 85L160 10" stroke="currentColor" fill="none"/></svg>';

export const PageGrid: Story = {
  render: () => (
    <Page title="Gallery">
      <List testID="grid-audit" layout="grid" columns={6}>
        {titles.map((title) => (
          <ListItem key={title} title={title} onPress={() => {}} />
        ))}
      </List>
    </Page>
  ),
  play: async ({ canvas }) => {
    const last = await canvas.findByRole('button', { name: 'Six' });
    const first = await canvas.findByRole('button', { name: 'One' });
    const scroll = canvas.getByTestId('grid-audit');
    await waitFor(() =>
      expect(first.getBoundingClientRect().width).toBeGreaterThan(0),
    );
    const second = canvas.getByRole('button', { name: 'Two' });

    const detail = JSON.stringify({
      first: first.getBoundingClientRect().toJSON(),
      second: second.getBoundingClientRect().toJSON(),
      last: last.getBoundingClientRect().toJSON(),
    });

    await expect(
      first.getBoundingClientRect().right,
      detail,
    ).toBeLessThanOrEqual(second.getBoundingClientRect().left);
    await expect(
      last.getBoundingClientRect().right,
      detail,
    ).toBeLessThanOrEqual(scroll.getBoundingClientRect().right);
  },
};

export const ShelfFooter: Story = {
  render: () => (
    <List direction="horizontal" footer="One page footer">
      <List.Section title="First">
        <ListItem title="First tile" />
      </List.Section>
      <List.Section title="Second">
        <ListItem title="Second tile" />
      </List.Section>
    </List>
  ),
  play: async ({ canvas }) => {
    await canvas.findByText('First tile');
    await expect(canvas.getAllByText('One page footer')).toHaveLength(1);
  },
};

const pressed = fn();

const many = Array.from({ length: 60 }, (_, index) => index + 1);

export const BudgetPreservesPress: Story = {
  beforeEach: async () => {
    await page.viewport(1440, 2000);
  },
  render: () => (
    <List layout="grid" columns={6}>
      {many.map((number) => (
        <ListItem
          key={number}
          title={`Tile ${number}`}
          media={<Svg xml={xml} label={`Trend ${number}`} onPress={pressed} />}
        />
      ))}
    </List>
  ),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('Trend 25');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Trend 25' }),
    );
    await expect(pressed).toHaveBeenCalled();
  },
};

const shelves = Array.from({ length: 13 }, (_, index) => index + 1);

export const OuterScrollReleasesBudget: Story = {
  render: () => (
    <Page title="Shelves">
      <ScrollView testID="outer-audit" style={{ flex: 1 }}>
        {shelves.map((number) => (
          <List key={number} direction="horizontal" tileSize="sm">
            <ListItem
              title={`Shelf ${number} A`}
              media={<Svg xml={xml} label={`Shelf ${number} A trend`} />}
            />
            <ListItem
              title={`Shelf ${number} B`}
              media={<Svg xml={xml} label={`Shelf ${number} B trend`} />}
            />
          </List>
        ))}
      </ScrollView>
    </Page>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Shelf 1 A trend' }),
    ).toBeVisible();
    const scroll = canvas.getByTestId('outer-audit');
    const title = await canvas.findByText('Shelf 13 B');
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      await expect(title.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        scroll.getBoundingClientRect().top,
      );
      await expect(title.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        scroll.getBoundingClientRect().bottom,
      );
    });
    await waitFor(async () => {
      await expect(
        canvas.getByRole('img', { name: 'Shelf 13 B trend' }),
      ).toBeVisible();
    });
  },
};
