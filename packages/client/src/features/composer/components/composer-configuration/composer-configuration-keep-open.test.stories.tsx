import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { updateComposerSettings } from '../../../../../mocks/composer-mock';
import { ComposerAgentModelControl } from './composer-configuration';
import {
  agentModelLabel,
  configuration,
  modelPickerLabel,
  otherModel,
  pickerStoryMeta,
} from './picker-story-fixtures';

const meta = {
  ...pickerStoryMeta,
  title: 'Tests/Composer/ComposerConfiguration/KeepOpen',
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

function ChangingConfiguration(): React.JSX.Element {
  const [configOptions, setConfigOptions] = useState(
    configuration.configOptions,
  );

  return (
    <View className="p-4">
      <ComposerAgentModelControl
        disabled={false}
        configuration={{
          ...configuration,
          configOptions,
          onConfigChange: (configId, value) =>
            setConfigOptions((options) =>
              updateComposerSettings(options, configId, value),
            ),
        }}
      />
    </View>
  );
}

// Radix marks a closing popover at once, before its exit transition ends.
const openState = 'data-state';

// Several picks in a row: each applies and both popovers stay open until a click outside.
export const ModelPicksKeepConfigureOpenWide: Story = {
  render: () => <ChangingConfiguration />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    await userEvent.click(
      within(configure).getByRole('button', { name: /^Model,/ }),
    );

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    const other = within(picker).getByRole('radio', { name: otherModel });
    await userEvent.click(other);

    await expect(other).toHaveAttribute('aria-checked', 'true');
    await expect(picker).toHaveAttribute(openState, 'open');
    await expect(configure).toHaveAttribute(openState, 'open');
    await expect(
      within(configure).getByRole('button', { name: /^Model,/ }),
    ).toHaveTextContent(otherModel);

    await userEvent.click(document.body);
    await waitFor(() => expect(picker).not.toBeInTheDocument());
    await waitFor(() => expect(configure).not.toBeInTheDocument());
  },
};

/*
 * Escape from the model picker closes both popovers and returns focus to the trigger.
 */
export const EscapeFromModelsReturnsFocusWide: Story = {
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
  render: () => <ChangingConfiguration />,
  play: async ({ canvas, userEvent }) => {
    const overlay = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await userEvent.click(trigger);

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    await userEvent.click(
      within(configure).getByRole('button', { name: /^Model,/ }),
    );

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    await userEvent.click(
      within(picker).getByRole('radio', { name: otherModel }),
    );
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(picker).not.toBeInTheDocument());
    await waitFor(() => expect(configure).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
