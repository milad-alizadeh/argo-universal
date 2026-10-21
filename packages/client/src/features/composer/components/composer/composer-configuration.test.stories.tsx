import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { recordedSessionOptions } from '@repo/mocks/app';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { composerSettingsOptions } from '../../../../../mocks/composer-mock';
import { phoneStatusControls } from '../../../../../mocks/composer/checkout-stories.test.mocks';
import { createdCheckoutIsReadOnly } from '../../../../../mocks/composer/checkout-stories.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { agentModelLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { pickers } from '../../../../../mocks/composer/configuration-picker.test.mocks';
import { firstAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { secondAgent } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { pickerCatalogs } from '../../../../../mocks/composer/recorded-catalog.test.mocks';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Configuration' };

type Story = StoryObj<typeof meta>;

export default meta;

export const PickersPhoneFirstAgent = pickers(layoutWidths.phone, 0);

export const PickersPhoneSecondAgent = pickers(layoutWidths.phone, 1);

export const PickersWideFirstAgent = pickers(layoutWidths.wide, 0);

export const PickersWideSecondAgent = pickers(layoutWidths.wide, 1);

export const CheckoutPhone = phoneStatusControls(firstAgent);

export const CheckoutPhoneSecondAgent = phoneStatusControls(secondAgent);

export const CreatedCheckoutIsReadOnlyPhone = createdCheckoutIsReadOnly(
  layoutWidths.phone,
);

export const CreatedCheckoutIsReadOnlyWide = createdCheckoutIsReadOnly(
  layoutWidths.wide,
);

// No Settings menu: the toolbar offers only Configure and Mode, and Fast mode is a switch in Configure.
function settingsInConfigure(width: number): Story {
  const agent = pickerCatalogs[0]?.agent;

  if (!agent) throw new Error('Recorded catalog needs an Agent.');

  return {
    args: {
      configuration: {
        agent,
        configOptions: [
          ...recordedSessionOptions(agent.id),
          ...composerSettingsOptions,
        ],
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        canvas.queryByRole('button', { name: /settings/i }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: agentModelLabel }),
      );
      await expect(
        await within(document.body).findByRole('switch', { name: 'Fast mode' }),
      ).toBeInTheDocument();
    },
  };
}

export const SettingsLiveInConfigurePhone = settingsInConfigure(
  layoutWidths.phone,
);

export const SettingsLiveInConfigureWide = settingsInConfigure(
  layoutWidths.wide,
);
