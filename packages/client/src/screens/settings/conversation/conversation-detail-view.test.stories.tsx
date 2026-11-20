import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { ConversationDetailView } from './conversation-detail-view';
import {
  adding,
  customVoices,
  editing,
  stableVoice,
  unusableVoice,
  usableVoice,
} from './conversation-detail-view-fixtures';
import { inReadingOrder, conversationDetailSpies } from './conversation-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Conversation',
  component: ConversationDetailView,
  parameters: { screenPreview: true },
  args: {
    voice: { status: 'loaded', settings: usableVoice },
    adjustsGain: true,
    ...conversationDetailSpies(),
  },
  beforeEach: (): Promise<void> => settleLayout(layoutWidths.wide),
} satisfies Meta<typeof ConversationDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const conversations = { name: 'Conversations' };

const withCustomVoices = {
  voice: { status: 'loaded', settings: customVoices },
} as const;

// The choices a picker opened, which draw outside the canvas.
const opened = (canvasElement: HTMLElement): ReturnType<typeof within> =>
  within(canvasElement.ownerDocument.body);

// Opens the Conversation row's popover and waits for it to finish appearing.
async function openVoices({
  canvas,
  canvasElement,
  userEvent,
}: Context): Promise<ReturnType<typeof within>> {
  await userEvent.click(canvas.getByRole('link', { name: /^Conversation/ }));
  const page = opened(canvasElement);
  await waitFor(() =>
    expect(
      page.getByRole('searchbox', { name: 'Search voices' }),
    ).toBeVisible(),
  );

  return page;
}

export const UsableProviderShowsItsChoicesAndNoReason: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', conversations)).toBeChecked();
    await expect(canvas.getByText(/GPT-Live/)).toBeVisible();
    await expect(canvas.getByText('Cove')).toBeVisible();
    await expect(canvas.queryByText(/signed in/)).toBeNull();
    await expect(canvas.queryByText(/What the voice reads out/)).toBeNull();
  },
};

export const UnusableProviderSaysWhy: Story = {
  args: { voice: { status: 'loaded', settings: unusableVoice } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/signed in/)).toBeVisible();
  },
};

export const SwitchOffTurnsOnAgain: Story = {
  args: {
    voice: { status: 'loaded', settings: { ...usableVoice, enabled: false } },
  },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch', conversations)).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch', conversations));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(true);
  },
};

export const TurnsConversationsOff: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('switch', conversations));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(false);
  },
};

export const LabelsAnExperimentalProvider: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Conversation provider/ }),
    );
    await expect(
      await opened(canvasElement).findAllByText(/GPT-Live.*experimental/i),
    ).toHaveLength(2);
  },
};

export const LeavesAStableProviderUnlabelled: Story = {
  args: { voice: { status: 'loaded', settings: stableVoice } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Conversation provider/ }),
    );
    await expect(
      await opened(canvasElement).findAllByText('GPT-Live'),
    ).toHaveLength(2);
    await expect(opened(canvasElement).queryByText(/experimental/i)).toBeNull();
  },
};

export const ChoosesAVoiceFromThePopover: Story = {
  play: async (context) => {
    const page = await openVoices(context);
    await context.userEvent.click(page.getByRole('button', { name: 'Marin' }));
    await expect(context.args.onVoiceChange).toHaveBeenCalledWith('marin');
    await expect(context.args.onProviderChange).not.toHaveBeenCalled();
  },
};

export const ListsTheCustomVoicesFirst: Story = {
  args: withCustomVoices,
  play: async (context) => {
    const page = await openVoices(context);
    await expect(page.getByText('Your voices')).toBeVisible();
    await expect(page.getByText('GPT-Live voices')).toBeVisible();
    await expect(page.getByText('New custom voice…')).toBeVisible();
    await expect(page.getByText(/Speaks like a cheerful pirate/)).toBeVisible();
  },
};

export const SearchesNamesAndDescriptions: Story = {
  args: withCustomVoices,
  play: async (context) => {
    const page = await openVoices(context);
    await context.userEvent.type(
      page.getByRole('searchbox', { name: 'Search voices' }),
      'calm',
    );
    await expect(page.getByText('Cove')).toBeVisible();
    await expect(page.getByText('Narrator')).toBeVisible();
    await expect(page.queryByText('Juniper')).toBeNull();
    await expect(page.queryByRole('button', { name: 'Pirate' })).toBeNull();
  },
};

export const PlaysAVoiceWithoutChoosingIt: Story = {
  args: withCustomVoices,
  play: async (context) => {
    const page = await openVoices(context);
    await context.userEvent.click(
      page.getByRole('button', { name: 'Play Juniper' }),
    );
    await expect(context.args.onPreviewVoice).toHaveBeenCalledWith('juniper');
    await expect(context.args.onVoiceChange).not.toHaveBeenCalled();
  },
};

export const OpensTheFormOnACustomVoice: Story = {
  args: withCustomVoices,
  play: async (context) => {
    const page = await openVoices(context);
    await expect(page.queryByRole('button', { name: 'Edit Cove' })).toBeNull();
    await context.userEvent.click(
      page.getByRole('button', { name: 'Edit Pirate' }),
    );
    await expect(context.args.onEditorChange).toHaveBeenCalledWith(editing);
  },
};

export const OpensTheEmptyForm: Story = {
  args: withCustomVoices,
  play: async (context) => {
    const page = await openVoices(context);
    await context.userEvent.click(
      page.getByRole('button', { name: 'New custom voice…' }),
    );
    await expect(context.args.onEditorChange).toHaveBeenCalledWith({
      voice: undefined,
    });
  },
};

// Paper "3 · Form", option A: Save is the form's one action, and its X closes it.
export const AddingWaitsForANameAndADescription: Story = {
  args: { ...withCustomVoices, editor: adding },
  play: async ({ canvasElement }) => {
    const page = opened(canvasElement);
    await waitFor(() =>
      expect(page.getByText('New custom voice')).toBeVisible(),
    );
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Preview' })).toBeDisabled();
    await expect(page.queryByRole('button', { name: 'Cancel' })).toBeNull();
    await expect(page.queryByText('Delete custom voice')).toBeNull();
  },
};

export const ClosesTheFormFromItsX: Story = {
  args: { ...withCustomVoices, editor: editing },
  play: async ({ canvasElement, args, userEvent }) => {
    const page = opened(canvasElement);
    await userEvent.click(await page.findByRole('button', { name: 'Close' }));
    await expect(args.onEditorChange).toHaveBeenCalledWith();
    await expect(args.onSaveCustomVoice).not.toHaveBeenCalled();
  },
};

export const EditingPreviewsAndSaves: Story = {
  args: { ...withCustomVoices, editor: editing },
  play: async ({ canvasElement, args, userEvent }) => {
    const page = opened(canvasElement);
    await userEvent.click(await page.findByRole('button', { name: 'Preview' }));
    await expect(args.onPreviewCustomVoice).toHaveBeenCalledWith(editing.voice);
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await expect(args.onSaveCustomVoice).toHaveBeenCalledWith(editing.voice);
  },
};

// Deleting is a row of its own under the description, only while editing.
export const EditingDeletesFromItsOwnRow: Story = {
  args: { ...withCustomVoices, editor: editing },
  play: async ({ canvasElement, args, userEvent }) => {
    const page = opened(canvasElement);
    await expect(page.queryByRole('button', { name: 'Delete' })).toBeNull();
    await userEvent.click(
      await page.findByRole('button', { name: 'Delete custom voice' }),
    );
    await expect(args.onDeleteCustomVoice).toHaveBeenCalledWith('pirate');
  },
};

export const KeepsTheInstructionsWhenLeft: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const field = canvas.getByRole('textbox', {
      name: /Instructions for every Conversation/,
    });

    await userEvent.type(field, 'Call me Sam.');
    await expect(args.onInstructionsChange).not.toHaveBeenCalled();
    await userEvent.tab();
    await expect(args.onInstructionsChange).toHaveBeenCalledWith(
      'Call me Sam.',
    );
  },
};

const gain = 'Microphone gain';

export const ShowsTheGainWhereItCanChange: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(gain)).toBeVisible();
    await expect(canvas.getByText('Volume')).toBeVisible();
  },
};

export const HidesTheGainWhereItCannotChange: Story = {
  args: { adjustsGain: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(gain)).toBeNull();
    await expect(canvas.getByText('Volume')).toBeVisible();
  },
};

// Four groups: the switch; the voice and what it is told; how a call behaves; this Device's sound.
export const GroupsTheRowsByWhatTheyChange: Story = {
  play: async ({ canvas }) => {
    await expect(
      inReadingOrder(canvas, [
        'Conversations',
        'Conversation and instructions',
        'Conversation provider',
        'Instructions for every Conversation',
        'Opening note',
        'The next Conversation uses this voice and these instructions.',
        'Call behaviour',
        'Say a short line when handing work over',
        'End a silent Conversation after',
        'These apply from the next Conversation.',
        'Microphone and speaker',
        gain,
        'Volume',
        'Kept on this Device. A running Conversation changes at once.',
      ]),
    ).toBe(true);
  },
};
