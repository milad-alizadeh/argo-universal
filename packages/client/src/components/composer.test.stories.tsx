import type { AgentInfo, SessionConfigSelectOption } from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import {
  composerProps,
  composerImages,
  composerLongAgentCatalog,
  composerPlan,
  composerPlanDone,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { newSessionMocks } from '../../mocks/new-session-mock';
import { idleSessionMocks } from '../../mocks/session-screen-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { NewSessionScreen } from '../screens/new-session-screen';
import { SessionScreen } from '../screens/session-screen';
import { Composer } from './composer';
import { ContentLayout } from './content-layout';

const missingAvailableAgentFailure =
  'Recorded catalog needs an available Agent.';
const agentModelLabel = 'Agent and model';
const newCheckoutLabel = 'New worktree';
const attachImagesLabel = 'Attach images';
const filesFolderLabel = 'Files and Folder';
const agentIconId = 'composer-agent-icon';
const spacingPrompt = 'Match the spacing.';
const multilineSpacingPrompt =
  'Match the spacing.\nKeep the phone readable.\nUse both themes.';
const chooseAgentLabel = 'Choose Agent';
const valueTextAttribute = 'aria-valuetext';
const chooseModelLabel = 'Choose model';
const pressedAttribute = 'aria-pressed';
const expandedAttribute = 'aria-expanded';
const subagentCountLabel = 'Subagents: 2';
const contextWindowLabel = 'Context window';
const runningPlanStepLabel = 'Update the shared controls in progress';
const planTitle = 'Verify phone and desktop';
const planStepsId = 'composer-plan-steps';

type PickerCatalog = {
  agent: AgentInfo;
  models: SessionConfigSelectOption[];
  currentEffort: string;
  highEffortModel: SessionConfigSelectOption;
  planning: SessionConfigSelectOption;
  dangerous: SessionConfigSelectOption;
};

// What the picker stories need from each recorded catalog; a recording that loses one fails here by name.
const pickerCatalogs = newSessionCatalogs.bothAvailable.map(
  (agent): PickerCatalog => {
    const select = (
      category: string,
    ): { choices: SessionConfigSelectOption[]; current: string } => {
      const option = agent.configOptions.find(
        (entry) => entry.category === category && entry.type === 'select',
      );
      if (option?.type !== 'select')
        throw new Error(
          `Recorded catalog needs ${category} options for ${agent.label}.`,
        );
      const choices = option.options.flatMap((entry) =>
        'groupId' in entry ? entry.options : [entry],
      );
      return { choices, current: option.currentValue };
    };
    const models = select('model');
    const modes = select('mode');
    const effort = select('thought_level');
    const currentModel = models.choices.find(
      (entry) => entry.value === models.current,
    );
    const currentEffort = effort.choices.find(
      (entry) => entry.value === effort.current,
    );
    if (!currentModel?._meta?.argo?.supportsEffort || !currentEffort)
      throw new Error(
        `Recorded catalog needs a current model with effort for ${agent.label}.`,
      );
    const highEffortModel = models.choices.find((entry) =>
      entry._meta?.argo?.supportedEffortLevels?.includes('high'),
    );
    if (!highEffortModel)
      throw new Error(
        `Recorded catalog needs a model with high effort for ${agent.label}.`,
      );
    const planning = modes.choices.find(
      (entry) => entry._meta?.argo?.tone === 'planning',
    );
    const dangerous = modes.choices.find(
      (entry) => entry._meta?.argo?.tone === 'dangerous',
    );
    if (!planning || !dangerous)
      throw new Error(
        `Recorded catalog needs Plan and dangerous modes for ${agent.label}.`,
      );
    return {
      agent,
      models: models.choices,
      currentEffort: currentEffort.name,
      highEffortModel,
      planning,
      dangerous,
    };
  },
);
if (
  !pickerCatalogs.some((catalog) =>
    catalog.models.some((entry) => entry._meta?.argo?.supportsEffort === false),
  )
)
  throw new Error('Recorded catalog needs a model without effort.');
const [firstCatalog] = pickerCatalogs;
if (!firstCatalog) throw new Error(missingAvailableAgentFailure);
const firstAgent = firstCatalog.agent;
const secondAgent = pickerCatalogs[1]?.agent;
if (!secondAgent)
  throw new Error('Recorded catalog needs a second available Agent.');

const meta = {
  title: 'Tests/Composer',
  globals: { themeId: 'default', mode: 'light' },
  component: Composer,
  render: (args): React.JSX.Element => (
    <Composer {...composerProps({ ...args })} />
  ),
  args: {
    draft: { text: '', images: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;
type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const dark = { globals: { mode: 'dark' } };

export const Empty: Story = {
  play: async ({ canvas }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('button', {
          name: width >= 720 ? 'Attach' : attachImagesLabel,
        }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: agentModelLabel }),
      ).not.toHaveTextContent('First Agent');
      await expect(
        canvas.getByRole('button', { name: agentModelLabel, hidden: true }),
      ).not.toHaveTextContent('(recommended)');
      await expect(canvas.queryAllByTestId(agentIconId)).toHaveLength(
        width < 720 ? 0 : 1,
      );
      const model = canvas
        .getByRole('button', { name: agentModelLabel })
        .getBoundingClientRect();
      const mode = canvas
        .getByRole('button', { name: 'Mode' })
        .getBoundingClientRect();
      await expect(model.right).toBeLessThanOrEqual(mode.left);
      for (const text of canvas
        .getByRole('button', { name: agentModelLabel })
        .querySelectorAll('[dir]')) {
        await expect(text.scrollWidth).toBeLessThanOrEqual(
          text.clientWidth + 1,
        );
      }
    }
  },
};

function typing(width: number): Story {
  const prompt = fn(() => ({ messageId: 'message-sent' }));
  return {
    render: () => <SessionScreen id="session-1" />,
    parameters: {
      screenPreview: true,
      trpc: { ...idleSessionMocks, 'session.prompt': prompt },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = await canvas.findByRole('textbox', { name: 'Message' });
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await userEvent.type(input, spacingPrompt);
      await expect(input).toHaveValue(spacingPrompt);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
      await expect(prompt).toHaveBeenCalledWith(
        {
          sessionId: 'session-1',
          prompt: [{ type: 'text', text: spacingPrompt }],
        },
        expect.any(AbortSignal),
      );
      await waitFor(() => expect(input).toHaveValue(''));
    },
  };
}
export const TypingPhone = typing(layoutWidths.phone);
export const TypingWide = typing(layoutWidths.wide);

function imageComposer(
  props: React.ComponentProps<typeof Composer>,
): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <Composer {...props} />
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function withImages(width: number): Story {
  return {
    render: () => <View testID="controlled-images" />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const root = createRoot(canvas.getByTestId('controlled-images'));
      const onDraftChange = fn();
      const props = composerProps({
        draft: { text: '', images: composerImages.slice(0, 1) },
        onDraftChange,
        onSend: fn(),
        onAttachImages: fn(),
      });
      try {
        root.render(imageComposer(props));
        await expect(
          await canvas.findByRole('img', { name: 'screenshot.png' }),
        ).toBeVisible();
        await expect(
          canvas.getByRole('button', { name: 'Send' }),
        ).toBeEnabled();
        await userEvent.click(
          canvas.getByRole('button', { name: 'Remove screenshot.png' }),
        );
        await expect(onDraftChange).toHaveBeenCalledWith({
          text: '',
          images: [],
        });
        root.render(
          imageComposer({ ...props, draft: { text: '', images: [] } }),
        );
        await waitFor(() =>
          expect(canvas.queryByRole('img')).not.toBeInTheDocument(),
        );
        await expect(
          canvas.getByRole('button', { name: 'Send' }),
        ).toBeDisabled();
      } finally {
        root.unmount();
      }
    },
  };
}
export const WithImagesPhone = withImages(layoutWidths.phone);
export const WithImagesWide = withImages(layoutWidths.wide);

function attachmentMenus(width: number): Story {
  return {
    args: {
      onAttachCamera: fn(),
      onAttachFiles: fn(),
      onSelectSlashCommand: fn(),
      onCreateGoal: fn(),
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      const choices =
        width < 720
          ? ([
              ['Camera', args.onAttachCamera],
              ['Photos', args.onAttachImages],
              ['Files', args.onAttachFiles],
            ] as const)
          : ([
              [filesFolderLabel, args.onAttachFiles],
              ['Slash Commands', args.onSelectSlashCommand],
              ['Goal', args.onCreateGoal],
            ] as const);
      for (const [label, callback] of choices) {
        await userEvent.click(
          canvas.getByRole('button', {
            name: width >= 720 ? 'Attach' : attachImagesLabel,
          }),
        );
        await expect(
          overlay.queryByRole('button', {
            name: width < 720 ? 'Goal' : 'Camera',
          }),
        ).not.toBeInTheDocument();
        await userEvent.click(
          await overlay.findByRole('button', { name: label }),
        );
        await expect(callback).toHaveBeenCalledOnce();
        await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
      }
    },
  };
}
export const AttachmentMenusPhone = attachmentMenus(layoutWidths.phone);
export const AttachmentMenusWide = attachmentMenus(layoutWidths.wide);

export const AttachmentInNarrowContent: Story = {
  render: (args): ReactElement => (
    <View style={{ width: layoutWidths.phone }}>
      <ContentLayout>
        <Composer {...composerProps(args)} />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas, userEvent }): Promise<void> => {
    await settleViewport(layoutWidths.wide);
    const attach = await canvas.findByRole('button', {
      name: attachImagesLabel,
    });
    await expect(
      canvas.queryByRole('button', { name: 'Attach' }),
    ).not.toBeInTheDocument();
    await userEvent.click(attach);
    await waitFor(() =>
      expect(
        within(document.body).getByRole('button', { name: 'Photos' }),
      ).toBeVisible(),
    );
    await expect(
      within(document.body).queryByRole('button', { name: filesFolderLabel }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

function multiline(width: number): Story {
  const prompt = fn(() => ({ messageId: 'message-sent' }));
  return {
    render: () => <SessionScreen id="session-1" />,
    parameters: {
      screenPreview: true,
      trpc: { ...idleSessionMocks, 'session.prompt': prompt },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.type(input, multilineSpacingPrompt);
      await expect(input).toHaveValue(multilineSpacingPrompt);
      await expect(prompt).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
      await expect(prompt).toHaveBeenCalledWith(
        {
          sessionId: 'session-1',
          prompt: [
            {
              type: 'text',
              text: multilineSpacingPrompt,
            },
          ],
        },
        expect.any(AbortSignal),
      );
      await waitFor(() => expect(input).toHaveValue(''));
    },
  };
}
export const MultilinePhone = multiline(layoutWidths.phone);
export const MultilineWide = multiline(layoutWidths.wide);

export const ImageTooLarge: Story = {
  render: () => <View testID="controlled-images" />,
  play: async ({ canvas, userEvent }) => {
    const root = createRoot(canvas.getByTestId('controlled-images'));
    const onDraftChange = fn();
    const draft = {
      text: 'Match these screenshots.',
      images: [oversizedComposerImage],
    };
    const props = composerProps({
      draft,
      onDraftChange,
      onSend: fn(),
      onAttachImages: fn(),
    });
    try {
      root.render(imageComposer(props));
      for (const width of [layoutWidths.phone, layoutWidths.wide]) {
        await settleViewport(width);
        await expect(await canvas.findByRole('alert')).toHaveTextContent(
          'Image exceeds 20 MB.',
        );
        await expect(
          canvas.getByRole('button', { name: 'Send' }),
        ).toBeDisabled();
      }
      await expect(canvas.getByRole('textbox')).toBeEnabled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Remove full-screen.png' }),
      );
      await expect(onDraftChange).toHaveBeenCalledWith({
        text: draft.text,
        images: [],
      });
      root.render(
        imageComposer({ ...props, draft: { text: draft.text, images: [] } }),
      );
      await waitFor(() =>
        expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
      );
      await expect(canvas.getByRole('textbox')).toHaveValue(draft.text);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
    } finally {
      root.unmount();
    }
  },
};

function sending(width: number): Story {
  return {
    args: { draft: { text: spacingPrompt, images: [] }, sending: true },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('progressbar', { name: 'Sending' }),
      ).toBeVisible();
      await expect(canvas.getByRole('textbox')).toHaveValue(spacingPrompt);
      await userEvent.type(canvas.getByRole('textbox'), 'Another prompt');
      await expect(canvas.getByRole('textbox')).toHaveValue(spacingPrompt);
      await expect(
        canvas.getByRole('button', {
          name: width >= 720 ? 'Attach' : attachImagesLabel,
        }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  };
}
export const SendingPhone = sending(layoutWidths.phone);
export const SendingWide = sending(layoutWidths.wide);

function disabled(width: number): Story {
  return {
    args: {
      draft: {
        text: spacingPrompt,
        images: composerImages.slice(0, 1),
      },
      disabled: true,
    },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.type(canvas.getByRole('textbox'), 'Another prompt');
      await expect(canvas.getByRole('textbox')).toHaveValue(spacingPrompt);
      await expect(
        canvas.getByRole('button', {
          name: width >= 720 ? 'Attach' : attachImagesLabel,
        }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Remove screenshot.png' }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('img', { name: 'screenshot.png' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expect(args.onDraftChange).not.toHaveBeenCalled();
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  };
}
export const DisabledPhone = disabled(layoutWidths.phone);
export const DisabledWide = disabled(layoutWidths.wide);

function draftsStayOnTheirDevice(width: number): Story {
  return {
    parameters: { screenPreview: true, trpc: idleSessionMocks },
    render: () => (
      <View className="w-full gap-4">
        <View testID="first-device">
          <SessionScreen id="session-1" />
        </View>
        <View testID="second-device">
          <SessionScreen id="session-1" />
        </View>
      </View>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const first = within(canvas.getByTestId('first-device'));
      const second = within(canvas.getByTestId('second-device'));
      await userEvent.type(first.getByRole('textbox'), 'Draft on this device.');
      await expect(second.getByRole('textbox')).toHaveValue('');
      await userEvent.type(second.getByRole('textbox'), 'A different draft.');
      await userEvent.click(first.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(first.getByRole('textbox')).toHaveValue(''));
      await expect(second.getByRole('textbox')).toHaveValue(
        'A different draft.',
      );
    },
  };
}
export const DraftsStayOnTheirDevicePhone = draftsStayOnTheirDevice(
  layoutWidths.phone,
);
export const DraftsStayOnTheirDeviceWide = draftsStayOnTheirDevice(
  layoutWidths.wide,
);

// One story per viewport and Agent; each takes its expectations from its own recorded catalog.
function pickers(width: number, agentIndex: number): Story {
  const catalog = pickerCatalogs[agentIndex];
  if (!catalog)
    throw new Error(`Recorded catalog needs an Agent at index ${agentIndex}.`);
  return {
    parameters: { screenPreview: true, trpc: newSessionMocks },
    render: () => <NewSessionScreen />,
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      if (width < 720)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      await userEvent.click(
        await overlay.findByRole('button', {
          name: `Select ${catalog.agent.label}`,
        }),
      );
      await expect(
        await overlay.findByRole('slider', { name: 'Effort' }),
      ).toHaveAttribute(valueTextAttribute, catalog.currentEffort);
      await expectEffortControlsVisible();
      await expectHighEffort({ canvas, userEvent, width, catalog });
      for (const model of catalog.models)
        await expectEffortFollowsModel({ canvas, userEvent, width, model });
      await userEvent.keyboard('{Escape}');
      await expectDangerousMode({ canvas, userEvent, width, catalog });
    },
  };
}
export const PickersPhoneFirstAgent = pickers(layoutWidths.phone, 0);
export const PickersPhoneSecondAgent = pickers(layoutWidths.phone, 1);
export const PickersWideFirstAgent = pickers(layoutWidths.wide, 0);
export const PickersWideSecondAgent = pickers(layoutWidths.wide, 1);

type PickerStep = Pick<PlayContext, 'canvas' | 'userEvent'> & {
  width: number;
};

async function chooseModel({
  userEvent,
  width,
  name,
}: Omit<PickerStep, 'canvas'> & { name: string }): Promise<void> {
  const overlay = within(document.body);
  if (width < 720)
    await userEvent.click(
      await overlay.findByRole('button', { name: chooseModelLabel }),
    );
  await userEvent.click(await overlay.findByRole('button', { name }));
  if (width < 720)
    await expect(
      await overlay.findByRole('button', { name: chooseModelLabel }),
    ).toBeVisible();
}

async function expectEffortControlsVisible(): Promise<void> {
  const overlay = within(document.body);
  await expect(overlay.getByRole('slider', { name: 'Effort' })).toBeVisible();
  for (const label of overlay.getAllByRole('button', {
    name: /^Set effort to /,
  })) {
    await expect(label).toBeVisible();
    const text = label.querySelector('[dir]');
    if (!text) throw new Error('Effort label is missing.');
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
  }
}

async function expectHighEffort({
  canvas,
  userEvent,
  width,
  catalog,
}: PickerStep & { catalog: PickerCatalog }): Promise<void> {
  const overlay = within(document.body);
  const model = catalog.highEffortModel;
  await chooseModel({ userEvent, width, name: model.name });
  await userEvent.click(
    await overlay.findByRole('button', { name: /^Set effort to high$/i }),
  );
  await expect(
    await overlay.findByRole('slider', { name: 'Effort' }),
  ).toHaveAttribute(valueTextAttribute, expect.stringMatching(/^high$/i));
  const slider = overlay.getByRole('slider', { name: 'Effort' });
  slider.focus();
  await browserUserEvent.keyboard('{ArrowRight}');
  await expect(
    canvas.getByRole('button', { name: agentModelLabel, hidden: true }),
  ).toHaveTextContent(
    width >= 720
      ? (slider.getAttribute(valueTextAttribute) ?? '')
      : model.name.replace(/\s*\(recommended\)/i, ''),
  );
  await expect(slider).not.toHaveAttribute(
    valueTextAttribute,
    expect.stringMatching(/^high$/i),
  );
}

async function expectEffortFollowsModel({
  canvas,
  userEvent,
  width,
  model,
}: PickerStep & { model: SessionConfigSelectOption }): Promise<void> {
  const overlay = within(document.body);
  await chooseModel({ userEvent, width, name: model.name });
  if (model._meta?.argo?.supportsEffort)
    await expect(
      await overlay.findByRole('slider', { name: 'Effort' }),
    ).toBeVisible();
  else {
    await expect(
      overlay.queryByRole('slider', { name: 'Effort' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas
        .getByRole('button', { name: agentModelLabel, hidden: true })
        .textContent?.trim(),
    ).toBe(model.name.replace(/\s*\(recommended\)/i, ''));
  }
}

async function expectDangerousMode({
  canvas,
  userEvent,
  width,
  catalog,
}: PickerStep & { catalog: PickerCatalog }): Promise<void> {
  const overlay = within(document.body);
  const { planning, dangerous } = catalog;
  await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
  const planMode = await overlay.findByRole('button', { name: planning.name });
  await waitFor(() => expect(planMode).toBeVisible());
  await expect(
    overlay.getByRole('button', { name: dangerous.name }),
  ).toHaveAttribute(pressedAttribute, 'false');
  await userEvent.click(overlay.getByRole('button', { name: dangerous.name }));
  await waitFor(() =>
    expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  if (width >= 720)
    await expect(
      canvas.getByRole('button', { name: 'Mode' }),
    ).toHaveTextContent(dangerous.name);
  await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
  await expect(
    await overlay.findByRole('button', { name: dangerous.name }),
  ).toHaveAttribute(pressedAttribute, 'true');
  await userEvent.keyboard('{Escape}');
}

function checkout(width: number): Story {
  return {
    parameters: { screenPreview: true, trpc: newSessionMocks },
    render: () => <NewSessionScreen />,
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      const trigger = await canvas.findByRole('button', { name: 'Checkout' });
      await expect(trigger).toHaveTextContent(newCheckoutLabel);
      await userEvent.click(trigger);
      await expect(
        await overlay.findByRole('button', { name: /^New worktree$/ }),
      ).toHaveAttribute(pressedAttribute, 'true');
      await expect(overlay.queryByRole('switch')).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('textbox', { name: 'Search branches' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('button', { name: 'main' }),
      ).not.toBeInTheDocument();
      await userEvent.click(overlay.getByRole('button', { name: /^Local$/ }));
      await waitFor(() =>
        expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      await expect(trigger).toHaveTextContent('Local');
      await expect(trigger).not.toHaveTextContent(newCheckoutLabel);
      await userEvent.click(trigger);
      await expect(
        await overlay.findByRole('button', { name: /^Local$/ }),
      ).toHaveAttribute(pressedAttribute, 'true');
      await expect(
        overlay.getByRole('button', { name: /^New worktree$/ }),
      ).toHaveAttribute(pressedAttribute, 'false');
      await userEvent.click(
        overlay.getByRole('button', { name: /^New worktree$/ }),
      );
      await waitFor(() =>
        expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      await expect(trigger).toHaveTextContent(newCheckoutLabel);
      await expect(trigger).not.toHaveTextContent('Local');
    },
  };
}
function phoneStatusControls(
  agent: Pick<AgentInfo, 'agent' | 'configOptions'>,
): Story {
  return {
    args: {
      configuration: {
        agents: newSessionCatalogs.bothAvailable,
        agent: agent.agent,
        configOptions: agent.configOptions,
        onConfigChange: fn(),
        checkout: {
          branch: 'main',
          newWorktree: true,
          onNewWorktreeChange: fn(),
        },
      },
      status: {
        plan: composerPlan,
        subagents: { count: 2, running: true, onPress: fn() },
        shells: { count: 1, running: false, onPress: fn() },
      },
    },
    play: async ({ canvas }) => {
      await settleViewport(layoutWidths.phone);
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Plan' })).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: subagentCountLabel }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Shells: 1' }),
      ).toBeVisible();
    },
  };
}
export const CheckoutPhone = phoneStatusControls(firstAgent);
export const CheckoutPhoneSecondAgent = phoneStatusControls(secondAgent);
export const CheckoutWide = checkout(layoutWidths.wide);

function createdCheckoutIsReadOnly(width: number): Story {
  return {
    args: {
      configuration: {
        agents: newSessionCatalogs.bothAvailable,
        agent: firstAgent.agent,
        configOptions: firstAgent.configOptions,
        onConfigChange: fn(),
        checkout: {
          branch: 'main',
          newWorktree: true,
          path: '/Developer/project/.worktrees/created-worktree',
          onNewWorktreeChange: fn(),
        },
      },
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      if (width < 720) {
        await expect(
          canvas.queryByText('created-worktree', { exact: true }),
        ).not.toBeInTheDocument();
      } else {
        const name = canvas.getByText('created-worktree', { exact: true });
        await expect(name).toBeVisible();
        await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        await userEvent.click(name);
      }
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('textbox', { name: 'Search branches' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('switch', { name: newCheckoutLabel }),
      ).not.toBeInTheDocument();
      await expect(
        args.configuration?.checkout.onNewWorktreeChange,
      ).not.toHaveBeenCalled();
    },
  };
}
export const CreatedCheckoutIsReadOnlyPhone = createdCheckoutIsReadOnly(
  layoutWidths.phone,
);
export const CreatedCheckoutIsReadOnlyWide = createdCheckoutIsReadOnly(
  layoutWidths.wide,
);

function sessionControls(width: number): Story {
  const onCompact = fn();
  return {
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          running: true,
          onStop: args.onStop,
          status: {
            ...composerProps({ ...args, sessionStarted: true }).status,
            context: { used: 34_000, size: 200_000, onCompact },
          },
        })}
      />
    ),
    args: { onStop: fn() },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      if (width < 720) {
        await expect(
          canvas.queryByText('session', { exact: true }),
        ).not.toBeInTheDocument();
      } else {
        await expect(
          canvas.getByText('session', { exact: true }),
        ).toBeVisible();
      }
      await expect(
        canvas.queryByRole('button', { name: chooseAgentLabel }),
      ).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      if (width < 720)
        await waitFor(() => expect(overlay.getByRole('dialog')).toBeVisible());
      else {
        await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
        await expect(
          canvas.getByRole('button', { name: 'Plan' }),
        ).toHaveAttribute(expandedAttribute, 'true');
      }
      const spinner = await overlay.findByRole('progressbar', {
        name: runningPlanStepLabel,
      });
      await expect(spinner).toBeVisible();
      if (width < 720) await userEvent.keyboard('{Escape}');
      else {
        await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
        await waitFor(() =>
          expect(canvas.queryByText(planTitle)).not.toBeVisible(),
        );
      }
      await userEvent.click(
        canvas.getByRole('button', { name: contextWindowLabel }),
      );
      await waitFor(() =>
        expect(overlay.getByText('Smart zone · below 20%')).toBeVisible(),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: 'Compact' }),
      );
      await expect(onCompact).toHaveBeenCalledOnce();
      await userEvent.click(canvas.getByRole('button', { name: 'Usage' }));
      await waitFor(() =>
        expect(overlay.getByText('5-hour limit')).toBeVisible(),
      );
      await waitFor(() =>
        expect(overlay.getByText('Weekly limit')).toBeVisible(),
      );
      await expect(
        overlay.queryByText('Every Session on this account counts.'),
      ).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await expect(args.onStop).not.toHaveBeenCalled();
      const stop = canvas.getByRole('button', { name: 'Stop' });
      await expect(stop).toBeEnabled();
      await expect(
        canvas.queryByRole('button', { name: 'Send' }),
      ).not.toBeInTheDocument();
      await userEvent.click(stop);
      await expect(args.onStop).toHaveBeenCalledOnce();
      await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
    },
  };
}
export const SessionControlsPhone = sessionControls(layoutWidths.phone);
export const SessionControlsWide = sessionControls(layoutWidths.wide);

function stopPrecedence(
  width: number,
  agentIndex: number,
  disabled: boolean,
): Story {
  const catalog = pickerCatalogs[agentIndex];
  if (!catalog)
    throw new Error(`Recorded catalog needs an Agent at index ${agentIndex}.`);
  return {
    args: {
      draft: {
        text: 'A draft during a Turn.',
        images: [oversizedComposerImage],
      },
      sending: true,
      disabled,
      sendable: false,
      onStop: fn(),
      configuration: {
        agents: newSessionCatalogs.bothAvailable,
        agent: catalog.agent.agent,
        configOptions: catalog.agent.configOptions,
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
        turnRunning: true,
      },
    },
    play: async ({ canvas, userEvent, args }): Promise<void> => {
      await settleViewport(width);
      const stop = canvas.getByRole('button', { name: 'Stop' });
      await expect(stop).toHaveProperty('disabled', disabled);
      await expect(
        canvas.queryByRole('button', { name: 'Send' }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByRole('progressbar', { name: 'Sending' }),
      ).not.toBeInTheDocument();
      if (!disabled) await userEvent.click(stop);
      await expect(args.onStop).toHaveBeenCalledTimes(disabled ? 0 : 1);
      await expect(args.onSend).not.toHaveBeenCalled();
    },
  };
}
export const StopPrecedenceClaudePhone = stopPrecedence(
  layoutWidths.phone,
  0,
  false,
);
export const StopPrecedenceClaudeWide = stopPrecedence(
  layoutWidths.wide,
  0,
  false,
);
export const StopPrecedenceCodexPhone = stopPrecedence(
  layoutWidths.phone,
  1,
  false,
);
export const StopPrecedenceCodexWide = stopPrecedence(
  layoutWidths.wide,
  1,
  false,
);
export const DisabledStopClaudePhone = stopPrecedence(
  layoutWidths.phone,
  0,
  true,
);
export const DisabledStopClaudeWide = stopPrecedence(
  layoutWidths.wide,
  0,
  true,
);
export const DisabledStopCodexPhone = stopPrecedence(
  layoutWidths.phone,
  1,
  true,
);
export const DisabledStopCodexWide = stopPrecedence(layoutWidths.wide, 1, true);

export const RunningWithoutStop: Story = {
  render: (args) => (
    <Composer
      {...composerProps({ ...args, sessionStarted: true, running: true })}
    />
  ),
  args: { draft: { text: 'A draft during a Turn.', images: [] } },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    await expect(
      canvas.queryByRole('button', { name: 'Stop' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('progressbar', { name: 'Sending' }),
    ).not.toBeInTheDocument();
    await expect(args.onSend).not.toHaveBeenCalled();
  },
};

export const ScrollableAgentCatalog: Story = {
  args: {
    configuration: {
      agents: composerLongAgentCatalog,
      agent: 'development-agent-1',
      configOptions: firstAgent.configOptions,
      onConfigChange: fn(),
      onAgentChange: fn(),
      checkout: { branch: 'main', newWorktree: true },
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    const scroll = await overlay.findByTestId('composer-agents-scroll');
    await waitFor(async () => {
      await expect(scroll.clientHeight).toBeGreaterThan(100);
      await expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
    });
    const menu = overlay.getByRole('dialog');
    await Promise.all(
      menu
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
    await waitFor(() => expect(menu).toBeVisible());
    const heading = overlay.getByText('Agent', { exact: true });
    const headingTop = heading.getBoundingClientRect().top;
    const menuHeight = menu.getBoundingClientRect().height;
    await expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
    scroll.scrollTop = scroll.scrollHeight;
    const lastAgent = await overlay.findByRole('button', {
      name: 'Select Agent 40',
    });
    await waitFor(async () => {
      const item = lastAgent.getBoundingClientRect();
      const viewport = scroll.getBoundingClientRect();
      await expect(item.top).toBeGreaterThanOrEqual(viewport.top);
      await expect(item.bottom).toBeLessThanOrEqual(viewport.bottom);
      await expect(heading.getBoundingClientRect().top).toBeCloseTo(headingTop);
      await expect(menu.getBoundingClientRect().height).toBeCloseTo(menuHeight);
    });
    await userEvent.click(lastAgent);
    await expect(args.configuration?.onAgentChange).toHaveBeenCalledWith(
      'development-agent-40',
    );
    await expect(overlay.getByText('Model', { exact: true })).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

function unavailableAgents(width: number): Story {
  return {
    args: {
      configuration: {
        agents: [
          ...newSessionCatalogs.oneNotInstalled,
          ...newSessionCatalogs.oneNotSignedIn,
        ].filter((entry) => entry.availability !== 'available'),
        agent: firstAgent.agent,
        configOptions: firstAgent.configOptions,
        onConfigChange: fn(),
        onAgentChange: fn(),
        onAgentSetup: fn(),
        checkout: { branch: 'main', newWorktree: true },
      },
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: agentModelLabel }),
      );
      if (width < 720)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      const agents = args.configuration?.agents ?? [];
      await expect(agents).toHaveLength(2);
      for (const agent of agents) {
        await expect(
          await overlay.findByRole('button', { name: `Select ${agent.label}` }),
        ).toBeDisabled();
        await userEvent.click(
          await overlay.findByRole('button', { name: `Set up ${agent.label}` }),
        );
        await expect(args.configuration?.onAgentSetup).toHaveBeenLastCalledWith(
          agent.agent,
        );
      }
      await expect(args.configuration?.onAgentChange).not.toHaveBeenCalled();
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const UnavailableAgentsPhone = unavailableAgents(layoutWidths.phone);
export const UnavailableAgentsWide = unavailableAgents(layoutWidths.wide);

function responsiveLayout(width: number, agentIndex: number): Story {
  const catalog = pickerCatalogs[agentIndex];
  if (!catalog) throw new Error(missingAvailableAgentFailure);
  return {
    args: {
      configuration: {
        agents: [catalog.agent],
        agent: catalog.agent.agent,
        configOptions: catalog.agent.configOptions,
        onConfigChange: fn(),
        checkout: {
          branch: 'main',
          newWorktree: false,
          path: '/Developer/project/.worktrees/session',
        },
      },
    },
    render: (args) => (
      <Composer {...composerProps({ ...args, sessionStarted: true })} />
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      const card = input.parentElement?.parentElement;
      if (!card) throw new Error('Composer card is missing.');
      const attachButton = canvas.getByRole('button', {
        name: width >= 720 ? 'Attach' : attachImagesLabel,
      });
      await expect(attachButton).toBeVisible();
      const trigger = canvas.getByRole('button', { name: agentModelLabel });
      await expect(trigger).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Mode' })).toBeVisible();
      if (width < 720) {
        const subagents = canvas.getByRole('button', {
          name: subagentCountLabel,
        });
        await expect(
          canvas.getByRole('button', { name: 'Shells: 1' }),
        ).toBeVisible();
        await expect(subagents).toBeVisible();
        await expect(
          canvas.queryByRole('button', { name: 'Agents: 2' }),
        ).not.toBeInTheDocument();
        await expectPhoneFooter({ canvas, card });
      } else {
        await expect(
          canvas.queryByRole('button', { name: subagentCountLabel }),
        ).not.toBeInTheDocument();
        await expect(
          canvas.queryByRole('button', { name: 'Shells: 1' }),
        ).not.toBeInTheDocument();
        await expectWideFooter({ canvas, card });
      }
      await userEvent.click(trigger);
      if (width < 720) {
        await expect(
          await within(document.body).findByRole('button', {
            name: chooseAgentLabel,
          }),
        ).toBeDisabled();
        await userEvent.click(
          await within(document.body).findByRole('button', {
            name: chooseModelLabel,
          }),
        );
        await userEvent.click(
          await within(document.body).findByRole('button', {
            name: 'Back to Agent and model',
          }),
        );
        await expect(
          await within(document.body).findByRole('slider', { name: 'Effort' }),
        ).toBeVisible();
      } else await expectWideAgentMenu();
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const ResponsiveLayoutPhone = responsiveLayout(layoutWidths.phone, 0);
export const ResponsiveLayoutWide = responsiveLayout(layoutWidths.wide, 0);
export const ResponsiveLayoutPhoneSecondAgent = responsiveLayout(
  layoutWidths.phone,
  1,
);
export const ResponsiveLayoutWideSecondAgent = responsiveLayout(
  layoutWidths.wide,
  1,
);

function workStatusCounts(agentIndex: number, shellsRunning: boolean): Story {
  const catalog = pickerCatalogs[agentIndex];
  if (!catalog) throw new Error(missingAvailableAgentFailure);
  return {
    args: {
      configuration: {
        agents: [catalog.agent],
        agent: catalog.agent.agent,
        configOptions: catalog.agent.configOptions,
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
      },
      status: {
        subagents: { count: 2, running: false, onPress: fn() },
        shells: { count: 1, running: shellsRunning, onPress: fn() },
      },
    },
    play: async ({ canvas }) => {
      await settleViewport(layoutWidths.phone);
      const subagents = canvas.getByRole('button', {
        name: subagentCountLabel,
      });
      const shells = canvas.getByRole('button', { name: 'Shells: 1' });
      await expect(subagents).toBeVisible();
      await expect(shells).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Agents: 2' }),
      ).not.toBeInTheDocument();
    },
  };
}
export const WorkSettledFirstAgent = workStatusCounts(0, false);
export const WorkSettledSecondAgent = workStatusCounts(1, false);
export const ShellsRunningFirstAgent = workStatusCounts(0, true);
export const ShellsRunningSecondAgent = workStatusCounts(1, true);

export const ResponsiveLayoutNarrowPhone: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas }) => {
    await settleViewport(320);
    const compact = canvas.getByRole('button', { name: agentModelLabel });
    await expect(within(compact).getByText('Opus 5.5')).toBeVisible();
    await expect(within(compact).queryByText('Medium')).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Send' }).getBoundingClientRect()
        .right,
    ).toBeLessThanOrEqual(320);
  },
};

type FooterCheck = Pick<PlayContext, 'canvas'> & { card: Element };

async function expectPhoneFooter({ canvas, card }: FooterCheck): Promise<void> {
  const bounds = card.getBoundingClientRect();
  const trigger = canvas.getByRole('button', { name: agentModelLabel });
  await expect(within(trigger).queryAllByTestId(agentIconId)).toHaveLength(0);
  await expect(
    canvas.queryByRole('button', { name: 'Checkout' }),
  ).not.toBeInTheDocument();
  const context = canvas.getByRole('button', { name: contextWindowLabel });
  await expect(within(context).getByText('34k')).not.toBeVisible();
  await expect(within(context).getByText('/ 200k')).not.toBeVisible();
  const work = canvas
    .getByRole('button', { name: 'Shells: 1' })
    .getBoundingClientRect();
  const tray = canvas
    .getByRole('button', { name: 'Plan' })
    .getBoundingClientRect();
  await expect(work.right).toBeLessThan(bounds.right);
  await expect(work.top).toBeGreaterThanOrEqual(tray.top);
  await expect(work.bottom).toBeLessThanOrEqual(bounds.top);
  await expect(
    canvas.queryByText('session', { exact: true }),
  ).not.toBeInTheDocument();
}

async function expectWideFooter({ canvas }: FooterCheck): Promise<void> {
  const context = canvas.getByRole('button', { name: contextWindowLabel });
  const used = within(context).getByText('34k').getBoundingClientRect();
  const size = within(context).getByText('/ 200k').getBoundingClientRect();
  await expect(size.left).toBeGreaterThanOrEqual(used.right);
}

async function expectWideAgentMenu(): Promise<void> {
  const overlay = within(document.body);
  await waitFor(() =>
    expect(
      overlay.getByText('Start a new Session to switch Agent'),
    ).toBeVisible(),
  );
}

function editorScrollsAfterFourLines(width: number): Story {
  return {
    render: () => <SessionScreen id="session-1" />,
    parameters: { screenPreview: true, trpc: idleSessionMocks },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = await canvas.findByRole('textbox', { name: 'Message' });
      await userEvent.type(
        input,
        'First line\nSecond line\nThird line\nFourth line',
      );
      await expect(input.scrollHeight).toBe(input.clientHeight);
      const card = input.parentElement?.parentElement;
      if (!card) throw new Error('Composer card is missing.');
      const height = card.getBoundingClientRect().height;
      await userEvent.type(input, '\nFifth line\nSixth line');
      await expect(input).toHaveValue(
        'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
      );
      await expect(card.getBoundingClientRect().height).toBe(height);
      await expect(input.scrollHeight).toBeGreaterThan(input.clientHeight);
      await browserUserEvent.wheel(input, { delta: { y: 200 } });
      await waitFor(() => expect(input.scrollTop).toBeGreaterThan(0));
    },
  };
}
export const EditorScrollsAfterFourLinesPhone = editorScrollsAfterFourLines(
  layoutWidths.phone,
);
export const EditorScrollsAfterFourLinesWide = editorScrollsAfterFourLines(
  layoutWidths.wide,
);

function planDone(width: number): Story {
  return {
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          plan: composerPlanDone,
        })}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      const plan = canvas.getByRole('button', { name: 'Plan' });
      await expect(plan).toBeVisible();
      if (width >= 720) {
        await expect(plan).toHaveTextContent('Plan 3/3');
        await userEvent.click(plan);
        await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
      } else {
        await userEvent.click(plan);
        await waitFor(() =>
          expect(overlay.getByText('3 of 3 done')).toBeVisible(),
        );
      }
      await expect(
        overlay.queryByRole('progressbar', { name: /in progress$/ }),
      ).not.toBeInTheDocument();
    },
  };
}
export const PlanDonePhone = planDone(layoutWidths.phone);
export const PlanDoneWide = planDone(layoutWidths.wide);
export const PlanDonePhoneDark: Story = { ...PlanDonePhone, ...dark };
export const PlanDoneWideDark: Story = { ...PlanDoneWide, ...dark };

function equalPlanSteps(width: number, agentIndex: number): Story {
  const catalog = pickerCatalogs[agentIndex];
  const entry = composerPlan[0];
  if (!catalog || !entry)
    throw new Error(
      'Recorded catalog needs an available Agent and a Plan step.',
    );
  return {
    args: {
      configuration: {
        agents: [catalog.agent],
        agent: catalog.agent.agent,
        configOptions: catalog.agent.configOptions,
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
      },
    },
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          plan: [entry, { ...entry, status: 'in_progress' }],
        })}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const overlay = within(document.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      if (width < 720)
        await waitFor(() => expect(overlay.getByRole('dialog')).toBeVisible());
      const list = within(
        width < 720
          ? overlay.getByRole('dialog')
          : canvas.getByTestId(planStepsId),
      );
      await waitFor(async () => {
        const steps = list.getAllByText(entry.content, { exact: true });
        await expect(steps).toHaveLength(2);
        for (const step of steps) await expect(step).toBeVisible();
      });
      await expect(
        overlay.getAllByRole('progressbar', {
          name: `${entry.content} in progress`,
        }),
      ).toHaveLength(1);
      await expect(overlay.queryByText(planTitle)).not.toBeInTheDocument();
    },
  };
}
export const EqualPlanStepsPhoneFirstAgent = equalPlanSteps(
  layoutWidths.phone,
  0,
);
export const EqualPlanStepsPhoneSecondAgent = equalPlanSteps(
  layoutWidths.phone,
  1,
);
export const EqualPlanStepsWideFirstAgent = equalPlanSteps(
  layoutWidths.wide,
  0,
);
export const EqualPlanStepsWideSecondAgent = equalPlanSteps(
  layoutWidths.wide,
  1,
);

export const NoPlan: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true, plan: [] })} />
  ),
  play: async ({ canvas }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Plan' }),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByTestId(planStepsId)).not.toBeInTheDocument();
    }
  },
};

export const NoPlanDark: Story = { ...NoPlan, ...dark };

export const PlanOpensAndCloses: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const toggle = canvas.getByRole('button', { name: 'Plan' });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expandedAttribute, 'true');
    await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
    await expect(
      canvas.getByRole('progressbar', {
        name: runningPlanStepLabel,
      }),
    ).toBeVisible();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expandedAttribute, 'false');
    await waitFor(() => expect(canvas.getByText(planTitle)).not.toBeVisible());
  },
};
