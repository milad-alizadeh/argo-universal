import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { ComposerAgentModelControl } from './composer-configuration';
import {
  agentModelLabel,
  currentModel,
  modelPickerLabel,
  pickerStoryMeta,
} from './picker-story-fixtures';

const meta = {
  ...pickerStoryMeta,
  title: 'Tests/Composer/ComposerConfiguration/Titles',
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper's Configure: the desktop popover is a flat menu with no title and no section titles.
export const ConfigureHasNoTitlesWide: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const configure = await within(document.body).findByRole('dialog', {
      name: agentModelLabel,
    });

    await waitFor(() =>
      expect(
        within(configure).getByRole('button', { name: /^Model,/ }),
      ).toBeVisible(),
    );
    await expect(
      within(configure).queryByRole('heading'),
    ).not.toBeInTheDocument();
  },
};

// Paper's drilled row: the models open beside Configure with no title and no search, the current one checked.
export const ModelPickerHasNoTitleOrSearchWide: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const overlay = within(document.body);

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    await userEvent.click(
      within(configure).getByRole('button', { name: /^Model,/ }),
    );

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    await waitFor(() =>
      expect(within(picker).getAllByRole('radio').length).toBeGreaterThan(1),
    );
    await expect(
      within(picker).getByRole('radio', { checked: true }),
    ).toHaveAccessibleName(currentModel);
    await expect(within(picker).queryByRole('heading')).not.toBeInTheDocument();
    await expect(
      within(picker).queryByRole('searchbox'),
    ).not.toBeInTheDocument();
  },
};

// Below wide, Configure is a sheet (centred as a modal on the web) whose Model row pushes its choices as a page.
export const ConfigureIsASheetBelowWide: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.tablet);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const configure = await within(document.body).findByRole('dialog', {
      name: agentModelLabel,
    });

    await userEvent.click(
      await within(configure).findByRole('button', { name: /^Model,/ }),
    );

    await waitFor(() =>
      expect(
        within(configure).getByRole('heading', { name: modelPickerLabel }),
      ).toBeVisible(),
    );
  },
};

// A phone keeps its sheet and the existing Session's Agent remains read-only.
export const ConfigureKeepsItsSheetPhone: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const overlay = within(document.body);

    await expect(
      await overlay.findByRole('heading', { name: agentModelLabel }),
    ).toBeVisible();

    for (const name of ['Configure', 'Model', 'Response'])
      await expect(
        overlay.queryByRole('heading', { name }),
      ).not.toBeInTheDocument();

    await expect(
      overlay.getByRole('button', { name: /^Model,/ }),
    ).toBeVisible();
    await expect(
      overlay.queryByRole('button', { name: /^Agent,/ }),
    ).not.toBeInTheDocument();
  },
};
