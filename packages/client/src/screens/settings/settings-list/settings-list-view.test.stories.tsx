import { layoutWidths } from '@repo/kit/each-layout';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  allPagesNavigate,
  searchNarrowsThePages,
  searchSaysWhenNothingMatches,
} from '../../../../mocks/settings/settings-list-navigation.test.mocks';
import {
  meta as settingsListTestMeta,
  type Story,
} from '../../../../mocks/settings/settings-list-story.test.mocks';
import {
  searchFindsAppearance,
  themeChoosesInPlace,
} from '../../../../mocks/settings/settings-list-theme.test.mocks';

const meta = { ...settingsListTestMeta, title: 'Tests/Screens/Settings' };

export default meta;

export const AllPagesNavigatePhone = allPagesNavigate(layoutWidths.phone);

export const AllPagesNavigateWide = allPagesNavigate(layoutWidths.wide);

export const WaitingForData: Story = {
  args: { projectCount: 0, agentCount: 0 },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByRole('link', { name: /^Projects(?:,|$)/ }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('link', { name: /^Agents(?:,|$)/ }),
      ).toBeVisible();
      await expect(canvas.getAllByText('0', { exact: true })).toHaveLength(2);
      await expect(canvas.queryByText(/^Projects will/)).toBeNull();
      await expect(canvas.queryByText(/^Registered Agents will/)).toBeNull();
      await expect(
        canvas.getByRole('link', { name: /^Accounts(?:,|$)/ }),
      ).toBeVisible();
    }
  },
};

export const AllPagesNavigatePhoneDark: Story = {
  ...AllPagesNavigatePhone,
  globals: { mode: 'dark' },
};

export const AllPagesNavigateWideDark: Story = {
  ...AllPagesNavigateWide,
  globals: { mode: 'dark' },
};

export const WaitingForDataDark: Story = {
  ...WaitingForData,
  globals: { mode: 'dark' },
};

export const ChildSelectionAndAttention: Story = {
  args: {
    selectedPath: '/settings/projects/example-project',
    projectsNeedAttention: true,
  },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await waitFor(() =>
        expect(
          canvas
            .getByRole('link', { name: /^Projects(?:,|$)/ })
            .getAttribute('aria-current'),
        ).toBe(width === 390 ? null : 'page'),
      );
      await expect(
        canvas.getByRole('link', { name: 'Projects, 1, needs attention' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('link', { name: 'Agents, 1' }),
      ).toBeVisible();
    }
  },
};

export const ChildSelectionAndAttentionDark: Story = {
  ...ChildSelectionAndAttention,
  globals: { mode: 'dark' },
};

export const TheSearchNarrowsThePagesPhone = searchNarrowsThePages(
  layoutWidths.phone,
);

export const TheSearchNarrowsThePagesWide = searchNarrowsThePages(
  layoutWidths.wide,
);

export const TheSearchSaysWhenNothingMatchesPhone =
  searchSaysWhenNothingMatches(layoutWidths.phone);

export const TheSearchSaysWhenNothingMatchesWide = searchSaysWhenNothingMatches(
  layoutWidths.wide,
);

export const ThemeChoosesInPlacePhone = themeChoosesInPlace(layoutWidths.phone);

export const ThemeChoosesInPlaceWide = themeChoosesInPlace(layoutWidths.wide);

export const TheSearchFindsAppearancePhone = searchFindsAppearance(
  layoutWidths.phone,
);

export const TheSearchFindsAppearanceWide = searchFindsAppearance(
  layoutWidths.wide,
);
