import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { expectRowInsideScroll } from '../../../../../mocks/composer-configuration/scroll-reachability';
import { composerLongSettingsOptions } from '../../../../../mocks/composer-mock';
import { ComposerAgentModelControl } from './composer-configuration';
import {
  agentModelLabel,
  configuration,
  pickerStoryMeta,
} from './picker-story-fixtures';

const onConfigChange = fn();

// An Agent with a Fast mode switch and two other select options beside its model and effort.
const meta = {
  ...pickerStoryMeta,
  title: 'Tests/ComposerConfigurationOptions',
  args: {
    disabled: false,
    configuration: {
      ...configuration,
      configOptions: [
        ...configuration.configOptions,
        ...composerLongSettingsOptions,
      ],
      onConfigChange,
    },
  },
  beforeEach: (): void => {
    onConfigChange.mockClear();
  },
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const overlay = within(document.body);

async function openConfigure(
  { canvas, userEvent }: PlayContext,
  width: number,
): Promise<void> {
  await settleViewport(width);
  await userEvent.click(canvas.getByRole('button', { name: agentModelLabel }));
}

async function openOption(
  context: PlayContext,
  { width, row }: { width: number; row: RegExp },
): Promise<void> {
  await openConfigure(context, width);
  await context.userEvent.click(
    await overlay.findByRole('button', { name: row }),
  );
}

// No Settings menu: any other select option is a Configure row that opens its own choices.
function otherOption(width: number): Story {
  return {
    play: async (context) => {
      await openOption(context, { width, row: /^Response style, Concise/ });
      await context.userEvent.click(
        await overlay.findByRole('radio', { name: 'Detailed' }),
      );
      await expect(onConfigChange).toHaveBeenCalledWith(
        'response-style',
        'detailed',
      );
    },
  };
}

export const OtherOptionOpensItsChoicesWide = otherOption(layoutWidths.wide);

export const OtherOptionOpensItsChoicesPhone = otherOption(layoutWidths.phone);

const lastProfile = 'Profile 40';

const lastProfilePick = ['profile', 'profile-40'] as const;

// The list draws its rows as they scroll in, so it scrolls to the end before the last is found.
async function lastProfileInsideScroll(): Promise<HTMLElement> {
  const profiles = await overlay.findByRole('radiogroup', { name: 'Profile' });
  await waitFor(() =>
    expect(profiles.scrollHeight).toBeGreaterThan(profiles.clientHeight),
  );
  profiles.scrollTop = profiles.scrollHeight;
  const last = await overlay.findByRole('radio', { name: lastProfile });
  await waitFor(() => expectRowInsideScroll(profiles, last));

  return last;
}

// Long choices scroll inside their popover or sheet page, which stays within the window.
function longOption(width: number): Story {
  return {
    play: async (context) => {
      await openOption(context, { width, row: /^Profile,/ });
      const last = await lastProfileInsideScroll();
      await waitFor(() =>
        expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          window.innerHeight,
        ),
      );
      await context.userEvent.click(last);
      await expect(onConfigChange).toHaveBeenCalledWith(...lastProfilePick);
    },
  };
}

export const LongOptionReachableWide = longOption(layoutWidths.wide);

export const LongOptionReachablePhone = longOption(layoutWidths.phone);

// Fast mode is a switch in Configure that the keyboard toggles.
function spaceTogglesFastMode(width: number): Story {
  return {
    play: async (context) => {
      await openConfigure(context, width);
      const fast = await overlay.findByRole('switch', { name: 'Fast mode' });
      fast.focus();
      await context.userEvent.keyboard(' ');
      await expect(onConfigChange).toHaveBeenCalledWith('fast', true);
    },
  };
}

export const SpaceTogglesFastModeWide = spaceTogglesFastMode(layoutWidths.wide);

export const SpaceTogglesFastModePhone = spaceTogglesFastMode(
  layoutWidths.phone,
);
