import {
  configurationChoices,
  type SessionConfigOption,
} from '@repo/contracts';
import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ComposerModeControl } from './composer-configuration';
import type { ComposerConfigurationProps } from './configuration-types';
import type { SelectConfiguration } from './configuration-values';
import { configuration } from './picker-story-fixtures';
import { holdChoice } from './use-pending-choices';

const recorded = recordedSessionOptions(configuration.agent?.id ?? '');

const isMode = (option: SessionConfigOption): option is SelectConfiguration =>
  option.type === 'select' && option.category === 'mode';

const foundMode = recorded.find(isMode);

const foundChoices = foundMode ? configurationChoices(foundMode) : [];

const foundCurrent = foundChoices.find(
  (choice) => choice.value === foundMode?.currentValue,
);

const foundOther = foundChoices.find(
  (choice) => choice.value !== foundMode?.currentValue,
);

if (!foundMode || !foundCurrent || !foundOther)
  throw new Error(
    'Recorded catalog needs a Mode whose current choice has another beside it.',
  );

const modeOption = foundMode;

// The Mode the recorded Session is in, and another one the reader can pick.
const currentMode = foundCurrent;

const otherMode = foundOther;

const dropTitle = "Couldn't change Mode";

const dropMessage = 'The Server did not confirm the change.';

// Longer than the wait a choice stands, so each story sees that wait end.
const pastTheHold = holdChoice + 2500;

const unresponsive = fn();

// A Server that takes the call and never answers: the options never come to carry the choice.
const unresponsiveConfiguration = {
  ...configuration,
  configOptions: recorded,
  onConfigChange: unresponsive,
} satisfies ComposerConfigurationProps;

const meta = {
  title: 'Tests/Composer/ComposerConfiguration/Unconfirmed',
  component: ComposerModeControl,
  args: { configuration: unresponsiveConfiguration, disabled: false },
  render: (args): React.JSX.Element => (
    <View className="p-4">
      <ComposerModeControl {...args} />
    </View>
  ),
  beforeEach: (): void => {
    unresponsive.mockClear();
  },
} satisfies Meta<typeof ComposerModeControl>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;

const modePill = (canvas: Canvas): HTMLElement =>
  canvas.getByRole('button', { name: 'Mode' });

const namedOther = (name: string): boolean => name.startsWith(otherMode.name);

async function pickOtherMode(
  canvas: Canvas,
  click: (element: HTMLElement) => Promise<void>,
): Promise<void> {
  await click(modePill(canvas));
  const overlay = within(document.body);

  await click(await overlay.findByRole('menuitemradio', { name: namedOther }));
}

/*
 * The Issue's repro with the Engine stopped: the pick goes out and nothing comes back. The pill reads the
 * Mode the Session is in throughout, and the wait now ends in a word instead of in silence (#1481).
 */
export const UnansweredModeChangeIsSaid: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pickOtherMode(canvas, (element) => userEvent.click(element));

    await waitFor(() =>
      expect(unresponsive).toHaveBeenCalledWith('mode', otherMode.value),
    );

    await findToast(dropTitle, { timeout: pastTheHold });
    await expect(await findToast(dropMessage)).toBeVisible();
    // The pill never read a Mode the Session was not in, before the toast or after it.
    await expect(
      within(modePill(canvas)).getByText(currentMode.name),
    ).toBeVisible();
    await expect(
      within(modePill(canvas)).queryByText(otherMode.name),
    ).not.toBeInTheDocument();
  },
};

// A Server that answers: the options come back carrying the choice, as they do against a live Server.
function AnsweringMode(props: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}): React.JSX.Element {
  const [currentValue, setValue] = useState(modeOption.currentValue);

  const configOptions = recorded.map((option) =>
    isMode(option) ? { ...option, currentValue } : option,
  );

  const onConfigChange = (_configId: string, value: string | boolean): void => {
    if (typeof value === 'string') setValue(value);
  };

  return (
    <View className="p-4">
      <ComposerModeControl
        configuration={{
          ...props.configuration,
          configOptions,
          onConfigChange,
        }}
        disabled={props.disabled}
      />
    </View>
  );
}

// Nothing is said about a change that took: the wait ends with the options carrying the choice.
export const AnsweredModeChangeIsSilent: Story = {
  render: (args): React.JSX.Element => <AnsweringMode {...args} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await pickOtherMode(canvas, (element) => userEvent.click(element));

    await waitFor(() =>
      expect(within(modePill(canvas)).getByText(otherMode.name)).toBeVisible(),
    );

    await new Promise((resolve) => setTimeout(resolve, pastTheHold));
    await expect(await allToasts(dropTitle)).toHaveLength(0);
    await expect(await allToasts(dropMessage)).toHaveLength(0);
  },
};
