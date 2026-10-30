import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { ComposerAgentModelControl } from './composer-configuration';
import {
  agentModelLabel,
  configuration,
  modelPickerLabel,
  pickerStoryMeta,
} from './picker-story-fixtures';

const meta = {
  ...pickerStoryMeta,
  title: 'Tests/Composer/ComposerConfiguration/Picker',
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

// Escape closes the Model page and returns to Configure; a second Escape closes Configure.
export const EscapeClosesModelsThenConfigure: Story = {
  args: { configuration: { ...configuration, onConfigChange: fn() } },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const overlay = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await userEvent.click(trigger);

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const model = await within(configure).findByRole('button', {
      name: /^(Choose model|Model,)/,
    });

    await userEvent.click(model);

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    // Configure fades in from transparent, so it reads as visible once its entrance has run by the browser's clock (#1520).
    await settleOverlays();
    await expect(configure).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(picker).not.toBeInTheDocument());
    // Configure takes focus back as the picker closes; under load it can draw a frame later.
    await waitFor(() => expect(configure).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(configure).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ClickOpensModelPicker: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const overlay = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await userEvent.hover(trigger);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(trigger);

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    // A running Session's Agent is fixed, so Configure offers neither a choice of Agent nor a row naming one.
    await waitFor(() =>
      expect(
        within(configure).queryByRole('group', { name: /^Agent,/ }),
      ).not.toBeInTheDocument(),
    );
    await expect(
      within(configure).queryByRole('button', { name: /^Agent,/ }),
    ).not.toBeInTheDocument();
    const model = within(configure).getByRole('button', { name: /^Model,/ });
    await userEvent.hover(model);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(
      overlay.queryByRole('dialog', { name: modelPickerLabel }),
    ).not.toBeInTheDocument();
    await userEvent.click(model);

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    await userEvent.unhover(model);
    await userEvent.hover(picker);
    await waitFor(() => expect(picker).toBeVisible());
    await settleOverlays();
    await expect(configure).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

// A real pointer: the browser reports the picker's enter before the row's leave.
export const PointerMovesIntoPicker: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const overlay = within(document.body);
    await browserUserEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    const model = within(configure).getByRole('button', { name: /^Model,/ });
    await browserUserEvent.click(model);

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    await browserUserEvent.hover(picker);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(picker).toBeInTheDocument();
    await expect(configure).toBeInTheDocument();
    await browserUserEvent.keyboard('{Escape}');
  },
};

export const RunningTurnWithoutTuning: Story = {
  args: {
    configuration: {
      ...configuration,
      turnRunning: true,
      configOptions: configuration.configOptions.filter(
        (option) => option.category === 'model',
      ),
    },
  },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    const overlay = within(document.body);
    await waitFor(() =>
      expect(
        overlay.getByText(
          'A Turn is running. Changes apply from the next Turn.',
        ),
      ).toBeVisible(),
    );
    await expect(
      overlay.queryByRole('slider', { name: 'Effort' }),
    ).not.toBeInTheDocument();
  },
};
