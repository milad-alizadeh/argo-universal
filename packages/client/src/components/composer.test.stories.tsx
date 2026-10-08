import { newSessionCatalogs } from '@repo/api/mocks';
import type { AgentInfo, SessionConfigSelectOption } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  ComposerMock,
  composerImages,
  composerLongAgentCatalog,
  composerPlan,
  composerPlanDone,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';
import { Composer } from './composer';
import { ContentLayout } from './content-layout';

const attachImagesLabel = 'Attach images';

const missingAvailableAgentFailure =
  'Recorded catalog needs an available Agent.';
const agentModelLabel = 'Agent and model';
const newCheckoutLabel = 'New worktree';
const filesFolderLabel = 'Files and Folder';
const agentIconId = 'composer-agent-icon';
const spacingPrompt = 'Match the spacing.';
const multilineSpacingPrompt =
  'Match the spacing.\nKeep the phone readable.\nUse both themes.';
const chooseAgentLabel = 'Choose Agent';
const valueTextAttribute = 'aria-valuetext';
const chooseModelLabel = 'Choose model';
const pressedAttribute = 'aria-pressed';
const contextWindowLabel = 'Context window';
const planTitle = 'Verify phone and desktop';
const subagentCountLabel = 'Subagents: 2';
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
  render: (args): React.JSX.Element => <ComposerMock {...args} />,
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

function typography(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: agentModelLabel });
      const model = within(trigger).getByText('Opus 5.5', { exact: true });
      const effort =
        width >= 720
          ? within(trigger).getByText('Medium', { exact: true })
          : undefined;
      if (width < 720)
        await expect(
          within(trigger).queryByText('Medium', { exact: true }),
        ).not.toBeInTheDocument();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      for (const [element, weight, size, lineHeight] of [
        [model, '400', '14px', '20px'],
        ...(effort ? [[effort, '400', '14px', '20px'] as const] : []),
        [input, '400', '14px', '20px'],
      ] as const) {
        const style = getComputedStyle(element);
        await document.fonts.load(`${weight} 14px ${style.fontFamily}`);
        await document.fonts.ready;
        await expect(style.fontFamily).toContain('SF Pro Text');
        await expect(style.fontWeight).toBe(weight);
        await expect(style.fontSize).toBe(size);
        await expect(style.lineHeight).toBe(lineHeight);
      }
      if (width >= 720) {
        await expect(
          getComputedStyle(canvas.getByText('54%', { exact: true })).fontWeight,
        ).toBe('400');
        const checkout = getComputedStyle(
          canvas.getByText(newCheckoutLabel, { exact: true }),
        );
        await expect(checkout.fontFamily).toContain('SF Pro Text');
        await expect(checkout.fontWeight).toBe('400');
      }
      await userEvent.click(
        canvas.getByRole('button', {
          name: width >= 720 ? 'Attach' : attachImagesLabel,
        }),
      );
      const attachment = await within(document.body).findByRole('button', {
        name: width >= 720 ? filesFolderLabel : 'Camera',
      });
      const label = within(attachment).getByText(
        width >= 720 ? filesFolderLabel : 'Camera',
        { exact: true },
      );
      const style = getComputedStyle(label);
      await expect(style.fontWeight).toBe('400');
      await expect(style.fontSize).toBe('14px');
      await expect(style.lineHeight).toBe('20px');
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const TypographyPhone = typography(layoutWidths.phone);
export const TypographyWide = typography(layoutWidths.wide);

export const ThemeFontLoading: Story = {
  globals: { themeId: 'vercel' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Message' });
    await waitFor(() =>
      expect(getComputedStyle(input).fontFamily).toContain('Geist'),
    );
    const style = getComputedStyle(input);
    const faces = await document.fonts.load(
      `400 ${style.fontSize} ${style.fontFamily}`,
    );
    await settleViewport(layoutWidths.phone);
    await expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) await expect(face.status).toBe('loaded');
    await expect(document.fonts.status).toBe('loaded');
  },
};

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
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await userEvent.type(input, spacingPrompt);
      await expect(input).toHaveValue(spacingPrompt);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await expect(args.onSend).toHaveBeenCalledOnce();
      await expect(args.onSend).toHaveBeenCalledWith({
        text: spacingPrompt,
        images: [],
      });
    },
  };
}
export const TypingPhone = typing(layoutWidths.phone);
export const TypingWide = typing(layoutWidths.wide);

function withImages(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', {
          name: width >= 720 ? 'Attach' : attachImagesLabel,
        }),
      );
      await userEvent.click(
        await within(document.body).findByRole('button', {
          name: width >= 720 ? filesFolderLabel : 'Photos',
        }),
      );
      await expect(
        canvas.getByRole('img', { name: 'screenshot.png' }),
      ).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Remove screenshot.png' }),
      );
      await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
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
        <ComposerMock {...args} />
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
      within(document.body).queryByRole('button', { name: 'Files and Folder' }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

function multiline(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.type(input, multilineSpacingPrompt);
      await expect(input).toHaveValue(multilineSpacingPrompt);
      await expect(args.onSend).not.toHaveBeenCalled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await expect(args.onSend).toHaveBeenCalledOnce();
      await expect(args.onSend).toHaveBeenCalledWith({
        text: multilineSpacingPrompt,
        images: [],
      });
    },
  };
}
export const MultilinePhone = multiline(layoutWidths.phone);
export const MultilineWide = multiline(layoutWidths.wide);

export const ImageTooLarge: Story = {
  args: {
    draft: {
      text: 'Match these screenshots.',
      images: [oversizedComposerImage],
    },
  },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(layoutWidths.phone, 844);
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Image exceeds 20 MB.',
    );
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    await page.viewport(layoutWidths.wide, 844);
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Image exceeds 20 MB.',
    );
    await expect(canvas.getByRole('textbox')).toBeEnabled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove full-screen.png' }),
    );
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    await expect(canvas.getByRole('textbox')).toHaveValue(
      'Match these screenshots.',
    );
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
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
      for (const circle of canvas
        .getByRole('progressbar', { name: 'Sending' })
        .querySelectorAll('circle')) {
        const channels = getComputedStyle(circle).stroke.match(/\d+/g);
        await expect(channels?.[0]).toBe(channels?.[1]);
        await expect(channels?.[1]).toBe(channels?.[2]);
      }
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
    render: (args) => (
      <View className="w-full gap-4">
        <View testID="first-device">
          <ComposerMock {...args} />
        </View>
        <View testID="second-device">
          <ComposerMock {...args} />
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
      await expect(first.getByRole('textbox')).toHaveValue('');
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
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: agentModelLabel }),
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
      await expectEffortScale();
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

async function expectEffortScale(): Promise<void> {
  const overlay = within(document.body);
  const effortSlider = overlay.getByRole('slider', { name: 'Effort' });
  await Promise.all(
    overlay
      .getByRole('dialog')
      .getAnimations({ subtree: true })
      .filter(
        (animation) => animation.effect?.getTiming().iterations !== Infinity,
      )
      .map((animation) => animation.finished),
  );
  const heading = overlay.getByText('Effort', { exact: true });
  const sliderBounds = effortSlider.getBoundingClientRect();
  const headingBounds = heading.getBoundingClientRect();
  await expect(Math.abs(sliderBounds.left - headingBounds.left)).toBeLessThan(
    1,
  );
  await expect(Math.abs(sliderBounds.right - headingBounds.right)).toBeLessThan(
    1,
  );
  await expect(getComputedStyle(effortSlider).backgroundImage).not.toBe('none');
  const labels = overlay.getAllByRole('button', { name: /^Set effort to / });
  for (const [index, label] of labels.entries()) {
    if (index > 0 && index < labels.length - 1) {
      const bounds = label.getBoundingClientRect();
      const stepCenter =
        sliderBounds.left +
        8 +
        ((sliderBounds.width - 16) * index) / (labels.length - 1);
      await expect(
        Math.abs(bounds.left + bounds.width / 2 - stepCenter),
      ).toBeLessThan(0.5);
    }
    const text = label.querySelector('[dir]');
    if (!text) throw new Error('Effort label is missing.');
    await expect(getComputedStyle(text).userSelect).toBe('none');
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
    await expect(text.getBoundingClientRect().height).toBeLessThanOrEqual(
      Number.parseFloat(getComputedStyle(text).lineHeight) + 1,
    );
  }
}

async function expectHighEffort({
  canvas,
  userEvent,
  width,
  catalog,
}: PickerStep & { catalog: PickerCatalog }): Promise<void> {
  const overlay = within(document.body);
  const { userEvent: browserUserEvent } = await import('vitest/browser');
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
  const labelColor = (name: string): string =>
    getComputedStyle(
      within(overlay.getByRole('button', { name })).getByText(name),
    ).color;
  const planMode = await overlay.findByRole('button', { name: planning.name });
  await waitFor(() => expect(planMode).toBeVisible());
  await expect(
    within(planMode).getByTestId('phosphor-react-native-map-trifold-regular'),
  ).toBeInTheDocument();
  const red = labelColor(dangerous.name);
  await expect(labelColor(planning.name)).not.toBe(red);
  await expect(
    overlay.getByRole('button', { name: dangerous.name }),
  ).toHaveAttribute(pressedAttribute, 'false');
  await userEvent.click(overlay.getByRole('button', { name: dangerous.name }));
  await waitFor(() =>
    expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  const modeTrigger = canvas.getByRole('button', { name: 'Mode' });
  const glyph = modeTrigger.querySelector('svg path');
  if (!glyph) throw new Error('Mode trigger icon is missing.');
  await expect(getComputedStyle(glyph).fill).toBe(red);
  if (width >= 720)
    await waitFor(() =>
      expect(
        getComputedStyle(within(modeTrigger).getByText(dangerous.name)).color,
      ).toBe(red),
    );
  await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
  await expect(
    await overlay.findByRole('button', { name: dangerous.name }),
  ).toHaveAttribute(pressedAttribute, 'true');
  await userEvent.keyboard('{Escape}');
}

function checkout(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: 'Checkout' });
      if (width >= 720) {
        await expect(trigger.className).not.toContain('shadow-composer');
        const caret = trigger.lastElementChild?.getBoundingClientRect();
        const send = canvas
          .getByRole('button', { name: 'Send' })
          .getBoundingClientRect();
        if (!caret) throw new Error('Checkout chevron is missing.');
        await expect(caret.x + caret.width / 2).toBeCloseTo(
          send.x + send.width / 2,
          1,
        );
      }
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
        canvas.getByRole('button', { name: 'Subagents: 2' }),
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
  return {
    render: (args) => (
      <ComposerMock {...args} sessionStarted running onStop={args.onStop} />
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
      const ring = canvas
        .getByRole('button', { name: contextWindowLabel })
        .querySelectorAll('circle');
      await expect(ring).toHaveLength(2);
      for (const circle of ring) {
        await expect(getComputedStyle(circle).stroke).not.toBe('none');
        await expect(getComputedStyle(circle).strokeWidth).toBe('2px');
      }
      const contextSvg = canvas
        .getByRole('button', { name: contextWindowLabel })
        .querySelector('svg');
      if (!contextSvg) throw new Error('Context ring is missing.');
      await expect(getComputedStyle(contextSvg).width).toBe('14px');
      await expect(getComputedStyle(contextSvg).height).toBe('14px');
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      if (width < 720)
        await waitFor(() => expect(overlay.getByRole('dialog')).toBeVisible());
      else {
        await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
        await expect(
          canvas.getByRole('button', { name: 'Plan' }),
        ).toHaveAttribute('aria-expanded', 'true');
      }
      const spinner = await overlay.findByRole('progressbar', {
        name: 'Update the shared controls in progress',
      });
      await expect(spinner).toBeVisible();
      const spinnerGraphic = spinner.firstElementChild;
      if (!spinnerGraphic) throw new Error('Spinner graphic is missing');
      await expect(getComputedStyle(spinnerGraphic).width).toBe('16px');
      await expect(getComputedStyle(spinnerGraphic).height).toBe('16px');
      const spinnerLabel = overlay
        .getAllByText(
          width < 720
            ? 'Inspect the Composer layout'
            : 'Update the shared controls',
          { exact: true },
        )
        .at(-1);
      if (!spinnerLabel) throw new Error('Spinner label is missing');
      const spinnerColor = getComputedStyle(spinnerLabel).color;
      for (const circle of spinner.querySelectorAll('circle')) {
        await expect(getComputedStyle(circle).stroke).toBe(spinnerColor);
      }
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
      if (width >= 720)
        await expect(
          canvas.getByRole('button', { name: contextWindowLabel }),
        ).toHaveTextContent('12k / 200k');
      else
        await expect(
          within(
            canvas.getByRole('button', { name: contextWindowLabel }),
          ).getByText('12k'),
        ).not.toBeVisible();
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
      await expect(
        canvas.queryByRole('button', { name: 'Stop' }),
      ).not.toBeInTheDocument();
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
  render: (args) => <ComposerMock {...args} sessionStarted running />,
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
    await waitFor(() => {
      expect(scroll.clientHeight).toBeGreaterThan(100);
      expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
    });
    const menu = overlay.getByRole('dialog');
    await Promise.all(
      menu
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
    await waitFor(() =>
      expect(menu.getBoundingClientRect().width).toBeCloseTo(580),
    );
    const heading = overlay.getByText('Agent', { exact: true });
    const headingTop = heading.getBoundingClientRect().top;
    const menuHeight = menu.getBoundingClientRect().height;
    await expect(menuHeight).toBeLessThan(700);
    scroll.scrollTop = scroll.scrollHeight;
    const lastAgent = await overlay.findByRole('button', {
      name: 'Select Agent 40',
    });
    await waitFor(() => {
      const item = lastAgent.getBoundingClientRect();
      const viewport = scroll.getBoundingClientRect();
      expect(item.top).toBeGreaterThanOrEqual(viewport.top);
      expect(item.bottom).toBeLessThanOrEqual(viewport.bottom);
      expect(heading.getBoundingClientRect().top).toBeCloseTo(headingTop);
      expect(menu.getBoundingClientRect().height).toBeCloseTo(menuHeight);
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
    render: (args) => <ComposerMock {...args} sessionStarted />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      const card = input.parentElement?.parentElement;
      if (!card) throw new Error('Composer card is missing.');
      const bounds = card.getBoundingClientRect();
      await expect(bounds.height).toBe(80);
      const attachButton = canvas.getByRole('button', {
        name: width >= 720 ? 'Attach' : attachImagesLabel,
      });
      await expect(attachButton.getBoundingClientRect().width).toBe(16);
      await expect(attachButton.getBoundingClientRect().height).toBe(28);
      await userEvent.hover(attachButton);
      const highlight = attachButton.firstElementChild;
      if (!highlight) throw new Error('Attach highlight is missing.');
      await expect(highlight.getBoundingClientRect().width).toBe(28);
      await expect(highlight.getBoundingClientRect().height).toBe(28);
      await expect(getComputedStyle(highlight).backgroundColor).toBe(
        'rgb(245, 245, 245)',
      );
      const plus = attachButton.querySelector('svg');
      if (!plus) throw new Error('Attach icon is missing.');
      const iconLayer = plus.parentElement;
      if (!iconLayer) throw new Error('Attach icon layer is missing');
      await expect(Number(getComputedStyle(iconLayer).zIndex)).toBeGreaterThan(
        Number(getComputedStyle(highlight).zIndex),
      );
      await userEvent.unhover(attachButton);
      const trigger = canvas.getByRole('button', { name: agentModelLabel });
      await expect(trigger.getBoundingClientRect().height).toBe(28);
      await expect(
        canvas.getByRole('button', { name: 'Mode' }).getBoundingClientRect()
          .height,
      ).toBe(28);
      if (width < 720) {
        const subagents = canvas.getByRole('button', {
          name: subagentCountLabel,
        });
        const shells = canvas.getByRole('button', { name: 'Shells: 1' });
        await expect(subagents).toBeVisible();
        await expect(
          canvas.queryByRole('button', { name: 'Agents: 2' }),
        ).not.toBeInTheDocument();
        const count = within(subagents).getByText('2', { exact: true });
        const shellCount = within(shells).getByText('1', { exact: true });
        await expect(getComputedStyle(count).color).not.toBe(
          getComputedStyle(shellCount).color,
        );
        await expect(
          getComputedStyle(
            within(subagents).getByText('Subagents', { exact: true }),
          ).color,
        ).not.toBe(getComputedStyle(count).color);
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

function workCountTones(agentIndex: number, shellsRunning: boolean): Story {
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
      const countColor = getComputedStyle(
        within(subagents).getByText('2', { exact: true }),
      ).color;
      const shellColor = getComputedStyle(
        within(shells).getByText('1', { exact: true }),
      ).color;
      if (shellsRunning) await expect(shellColor).not.toBe(countColor);
      else await expect(shellColor).toBe(countColor);
      await expect(
        getComputedStyle(
          within(subagents).getByText('Subagents', { exact: true }),
        ).color,
      ).not.toBe(countColor);
      await expect(
        getComputedStyle(within(shells).getByText('Shells', { exact: true }))
          .color,
      ).not.toBe(shellColor);
    },
  };
}
export const WorkSettledFirstAgent = workCountTones(0, false);
export const WorkSettledSecondAgent = workCountTones(1, false);
export const ShellsRunningFirstAgent = workCountTones(0, true);
export const ShellsRunningSecondAgent = workCountTones(1, true);

export const ResponsiveLayoutNarrowPhone: Story = {
  render: (args) => <ComposerMock {...args} sessionStarted />,
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

async function expectWideFooter({ canvas, card }: FooterCheck): Promise<void> {
  const trigger = canvas.getByRole('button', { name: 'Agent and model' });
  await expect(
    within(trigger).getByTestId(agentIconId).getBoundingClientRect().width,
  ).toBe(14);
  const footer = card.parentElement?.lastElementChild;
  if (!footer) throw new Error('Composer footer is missing.');
  await expect(getComputedStyle(footer).boxShadow).toBe(
    getComputedStyle(card).boxShadow,
  );
  const context = canvas.getByRole('button', { name: contextWindowLabel });
  const used = within(context).getByText('34k').getBoundingClientRect();
  const size = within(context).getByText('/ 200k').getBoundingClientRect();
  await expect(used.top).toBe(size.top);
  await expect(size.left).toBeGreaterThanOrEqual(used.right);
}

async function expectWideAgentMenu(): Promise<void> {
  const overlay = within(document.body);
  await waitFor(() => {
    expect(overlay.getByRole('dialog').getBoundingClientRect().width).toBe(580);
    const agentHeading = overlay
      .getByText('Agent', { exact: true })
      .getBoundingClientRect();
    const modelHeading = overlay
      .getByText('Model', { exact: true })
      .getBoundingClientRect();
    expect(modelHeading.left - agentHeading.left).toBe(172);
  });
  await expect(
    overlay.getByText('Start a new Session to switch Agent'),
  ).toBeVisible();
}

function editorScrollsAfterFourLines(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      const { userEvent: browserUserEvent } = await import('vitest/browser');
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.type(
        input,
        'First line\nSecond line\nThird line\nFourth line',
      );
      await waitFor(() =>
        expect(input.getBoundingClientRect().height).toBe(80),
      );
      await expect(input.scrollHeight).toBe(input.clientHeight);
      const card = input.parentElement?.parentElement;
      if (!card) throw new Error('Composer card is missing.');
      const height = card.getBoundingClientRect().height;
      await userEvent.type(input, '\nFifth line\nSixth line');
      await expect(input).toHaveValue(
        'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
      );
      await expect(input.getBoundingClientRect().height).toBe(80);
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
      <ComposerMock {...args} sessionStarted plan={composerPlanDone} />
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
      <ComposerMock
        {...args}
        sessionStarted
        plan={[entry, { ...entry, status: 'in_progress' }]}
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
      await waitFor(() => {
        const steps = list.getAllByText(entry.content, { exact: true });
        expect(steps).toHaveLength(2);
        for (const step of steps) expect(step).toBeVisible();
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
  render: (args) => <ComposerMock {...args} sessionStarted plan={[]} />,
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

export const PlanExpandsSmoothly: Story = {
  render: (args) => <ComposerMock {...args} sessionStarted />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const panel = canvas.getByTestId(planStepsId);
    const heights: number[] = [];
    let collecting = true;
    const sample = (): void => {
      heights.push(panel.getBoundingClientRect().height);
      if (collecting) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      await waitFor(() =>
        expect(panel.getBoundingClientRect().height).toBe(104),
      );
      await expect(heights.some((height) => height > 0 && height < 104)).toBe(
        true,
      );
      const pending = canvas
        .getByText(planTitle)
        .parentElement?.querySelector('svg');
      const spinner = canvas
        .getByRole('progressbar', {
          name: 'Update the shared controls in progress',
        })
        .querySelector('svg');
      if (!pending || !spinner) throw new Error('Plan circles are missing.');
      await expect(pending.getAttribute('viewBox')).toBe(
        spinner.getAttribute('viewBox'),
      );
      for (const dimension of ['width', 'height'] as const) {
        await expect(getComputedStyle(pending)[dimension]).toBe(
          getComputedStyle(spinner)[dimension],
        );
      }
      await expect(pending.querySelector('circle')?.getAttribute('r')).toBe(
        spinner.querySelector('circle')?.getAttribute('r'),
      );
      await expect(
        pending.querySelector('circle')?.getAttribute('stroke-width'),
      ).toBe(spinner.querySelector('circle')?.getAttribute('stroke-width'));
      heights.length = 0;
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      await waitFor(() => expect(panel.getBoundingClientRect().height).toBe(0));
      await expect(heights.some((height) => height > 0 && height < 104)).toBe(
        true,
      );
      await waitFor(() =>
        expect(canvas.getByText(planTitle)).not.toBeVisible(),
      );
    } finally {
      collecting = false;
    }
  },
};
