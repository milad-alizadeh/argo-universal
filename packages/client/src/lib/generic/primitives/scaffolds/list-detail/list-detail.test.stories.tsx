import type { Meta } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { ListDetail } from './list-detail';
import { at, heading, row } from './list-detail-test.mocks';
import {
  csvIssue,
  ExampleListDetail,
  issues,
  syncIssue,
} from './list-detail.mocks';

const meta = {
  title: 'Tests/ListDetail',
  component: ListDetail,
  args: { list: null },
  render: (): ReactElement => <ExampleListDetail example={issues} />,
} satisfies Meta<typeof ListDetail>;

export default meta;

const selected = (): ReactElement => (
  <ExampleListDetail example={issues} initial={syncIssue.id} />
);

export const WideShowsListBesideDetail = at(layoutWidths.wide, {
  render: selected,
  play: async ({ canvas, userEvent }) => {
    await expect(await heading(canvas, issues.title)).toBeVisible();
    await expect(await heading(canvas, syncIssue.title)).toBeVisible();

    await userEvent.click(row(canvas, csvIssue.title));

    await expect(await heading(canvas, csvIssue.title)).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: syncIssue.title }),
    ).not.toBeInTheDocument();
    await expect(await heading(canvas, issues.title)).toBeVisible();
  },
});

export const WideWithoutSelectionShowsEmpty = at(layoutWidths.wide, {
  play: async ({ canvas, userEvent }) => {
    await expect(await heading(canvas, issues.empty.title)).toBeVisible();
    await expect(await heading(canvas, issues.title)).toBeVisible();

    await userEvent.click(row(canvas, syncIssue.title));

    await expect(await heading(canvas, syncIssue.title)).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: issues.empty.title }),
    ).not.toBeInTheDocument();
  },
});

// Beside its list a detail is never drilled into, so its Page draws no Back.
export const WideDetailHasNoBack = at(layoutWidths.wide, {
  render: selected,
  play: async ({ canvas }) => {
    await expect(await heading(canvas, syncIssue.title)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Back' }),
    ).not.toBeInTheDocument();
  },
});

export const PhoneDrillsIntoTheDetail = at(layoutWidths.phone, {
  play: async ({ canvas, userEvent }) => {
    await expect(await heading(canvas, issues.title)).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: issues.empty.title }),
    ).not.toBeInTheDocument();

    await userEvent.click(row(canvas, syncIssue.title));

    await expect(await heading(canvas, syncIssue.title)).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: issues.title }),
    ).not.toBeInTheDocument();
  },
});

// Below wide the stack's header draws Back, so a story only checks the drill-in.
export const TabletDrillsIntoTheDetail = at(layoutWidths.tablet, {
  render: selected,
  play: async ({ canvas }) => {
    await expect(await heading(canvas, syncIssue.title)).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: issues.title }),
    ).not.toBeInTheDocument();
  },
});
