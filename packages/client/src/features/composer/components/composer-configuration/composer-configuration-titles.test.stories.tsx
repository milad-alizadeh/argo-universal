import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';
import {
  agentModelLabel,
  modelPickerLabel,
  pickerStoryMeta,
} from './picker-story-fixtures';

const meta = {
  ...pickerStoryMeta,
  title: 'Tests/ComposerConfigurationTitles',
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfigureShowsItsTitle: Story = {
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
        within(configure).getByRole('heading', { name: 'Configure' }),
      ).toBeVisible(),
    );
  },
};

export const ModelPickerShowsItsTitle: Story = {
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
      expect(
        within(picker).getByRole('heading', { name: modelPickerLabel }),
      ).toBeVisible(),
    );
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
