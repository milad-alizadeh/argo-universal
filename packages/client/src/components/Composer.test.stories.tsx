import { newSessionCatalogs } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  ComposerMock,
  composerImages,
  composerLongAgentCatalog,
  composerPlanDone,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { Composer } from './Composer';

const firstAgent = newSessionCatalogs.bothAvailable[0];
if (!firstAgent) throw new Error('Composer needs a recorded Agent catalog.');

const meta = {
  title: 'Tests/Composer',
  globals: { themeId: 'default', mode: 'light' },
  component: Composer,
  render: (args) => <ComposerMock {...args} />,
  args: {
    draft: { text: '', images: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

async function settleViewport() {
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export const Typography: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const trigger = canvas.getByRole('button', { name: 'Agent and model' });
      const model = within(trigger).getByText('Opus 5.5', { exact: true });
      const effort =
        width >= 720
          ? within(trigger).getByText('Medium', { exact: true })
          : undefined;
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
      if (width >= 720)
        await expect(
          getComputedStyle(canvas.getByText('54%', { exact: true })).fontWeight,
        ).toBe('400');
      if (width >= 720) {
        const checkout = getComputedStyle(
          canvas.getByText('New worktree', { exact: true }),
        );
        await expect(checkout.fontFamily).toContain('SF Pro Text');
        await expect(checkout.fontWeight).toBe('400');
      }
      await userEvent.click(
        canvas.getByRole('button', { name: 'Attach images' }),
      );
      const attachment = await within(document.body).findByRole('button', {
        name: width >= 720 ? 'Files and Folder' : 'Camera',
      });
      const label = within(attachment).getByText(
        width >= 720 ? 'Files and Folder' : 'Camera',
        { exact: true },
      );
      const style = getComputedStyle(label);
      await expect(style.fontWeight).toBe('400');
      await expect(style.fontSize).toBe('14px');
      await expect(style.lineHeight).toBe('20px');
      await userEvent.keyboard('{Escape}');
    }
  },
};

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
    await settleViewport();
    await expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) await expect(face.status).toBe('loaded');
    await expect(document.fonts.status).toBe('loaded');
  },
};

export const Empty: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Attach images' }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: 'Agent and model' }),
      ).not.toHaveTextContent('First Agent');
      await expect(
        canvas.getByRole('button', { name: 'Agent and model', hidden: true }),
      ).not.toHaveTextContent('(recommended)');
      await expect(canvas.queryAllByTestId('composer-agent-icon')).toHaveLength(
        width < 720 ? 0 : 1,
      );
      const model = canvas
        .getByRole('button', { name: 'Agent and model' })
        .getBoundingClientRect();
      const mode = canvas
        .getByRole('button', { name: 'Mode' })
        .getBoundingClientRect();
      await expect(model.right).toBeLessThanOrEqual(mode.left);
      for (const text of canvas
        .getByRole('button', { name: 'Agent and model' })
        .querySelectorAll('[dir]')) {
        await expect(text.scrollWidth).toBeLessThanOrEqual(
          text.clientWidth + 1,
        );
      }
    }
  },
};

export const Typing: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.clear(input);
      await userEvent.type(input, 'Match the spacing.');
      await expect(input).toHaveValue('Match the spacing.');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await expect(args.onSend).toHaveBeenLastCalledWith({
        text: 'Match the spacing.',
        images: [],
      });
    }
  },
};

export const WithImages: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Attach images' }),
      );
      await userEvent.click(
        await within(document.body).findByRole('button', {
          name: width >= 720 ? 'Files and Folder' : 'Photos',
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
    }
  },
};

export const AttachmentMenus: Story = {
  args: {
    onAttachCamera: fn(),
    onAttachFiles: fn(),
    onSelectSlashCommand: fn(),
    onCreateGoal: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const choices =
        width < 720
          ? ([
              ['Camera', args.onAttachCamera],
              ['Photos', args.onAttachImages],
              ['Files', args.onAttachFiles],
            ] as const)
          : ([
              ['Files and Folder', args.onAttachFiles],
              ['Slash Commands', args.onSelectSlashCommand],
              ['Goal', args.onCreateGoal],
            ] as const);
      for (const [label, callback] of choices) {
        await userEvent.click(
          canvas.getByRole('button', { name: 'Attach images' }),
        );
        await expect(
          overlay.queryByRole('button', {
            name: width < 720 ? 'Goal' : 'Camera',
          }),
        ).not.toBeInTheDocument();
        await userEvent.click(
          await overlay.findByRole('button', { name: label }),
        );
        await expect(callback).toHaveBeenCalled();
        await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
      }
    }
  },
};

export const Multiline: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.clear(input);
      await userEvent.type(
        input,
        'Match the spacing.\nKeep the phone readable.\nUse both themes.',
      );
      await expect(input).toHaveValue(
        'Match the spacing.\nKeep the phone readable.\nUse both themes.',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await expect(args.onSend).toHaveBeenLastCalledWith({
        text: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
        images: [],
      });
    }
  },
};

export const ImageTooLarge: Story = {
  args: {
    draft: {
      text: 'Match these screenshots.',
      images: [oversizedComposerImage],
    },
  },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Image exceeds 20 MB.',
    );
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    await page.viewport(1440, 844);
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

export const Sending: Story = {
  args: { draft: { text: 'Match the spacing.', images: [] }, sending: true },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await expect(
        canvas.getByRole('progressbar', { name: 'Sending' }),
      ).toBeVisible();
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Match the spacing.',
      );
      for (const circle of canvas
        .getByRole('progressbar', { name: 'Sending' })
        .querySelectorAll('circle')) {
        const channels = getComputedStyle(circle).stroke.match(/\d+/g);
        await expect(channels?.[0]).toBe(channels?.[1]);
        await expect(channels?.[1]).toBe(channels?.[2]);
      }
      await userEvent.type(canvas.getByRole('textbox'), 'Another prompt');
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Match the spacing.',
      );
      await expect(
        canvas.getByRole('button', { name: 'Attach images' }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(args.onSend).not.toHaveBeenCalled();
    }
  },
};

export const Disabled: Story = {
  args: {
    draft: { text: 'Match the spacing.', images: composerImages.slice(0, 1) },
    disabled: true,
  },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await userEvent.type(canvas.getByRole('textbox'), 'Another prompt');
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Match the spacing.',
      );
      await expect(
        canvas.getByRole('button', { name: 'Attach images' }),
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
    }
  },
};

export const DraftsStayOnTheirDevice: Story = {
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
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const first = within(canvas.getByTestId('first-device'));
      const second = within(canvas.getByTestId('second-device'));
      await userEvent.clear(first.getByRole('textbox'));
      await userEvent.clear(second.getByRole('textbox'));
      await userEvent.type(first.getByRole('textbox'), 'Draft on this device.');
      await expect(second.getByRole('textbox')).toHaveValue('');
      await userEvent.type(second.getByRole('textbox'), 'A different draft.');
      await userEvent.click(first.getByRole('button', { name: 'Send' }));
      await expect(first.getByRole('textbox')).toHaveValue('');
      await expect(second.getByRole('textbox')).toHaveValue(
        'A different draft.',
      );
    }
  },
};

export const Pickers: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page, userEvent: browserUserEvent } = await import(
      'vitest/browser'
    );
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      for (const agent of newSessionCatalogs.bothAvailable) {
        await userEvent.click(
          canvas.getByRole('button', { name: 'Agent and model' }),
        );
        if (width < 720)
          await userEvent.click(
            await overlay.findByRole('button', { name: 'Choose Agent' }),
          );
        await userEvent.click(
          await overlay.findByRole('button', { name: `Select ${agent.label}` }),
        );
        const model = agent.configOptions.find(
          (entry) => entry.category === 'model' && entry.type === 'select',
        );
        if (model?.type !== 'select')
          throw new Error('Recorded catalog needs model options.');
        const options = model.options.flatMap((entry) =>
          'groupId' in entry ? entry.options : [entry],
        );
        const withoutEffort = options.find(
          (entry) => entry._meta?.argo?.supportsEffort === false,
        );
        const withEffort = options.find(
          (entry) =>
            entry._meta?.argo?.supportsEffort &&
            entry._meta.argo.supportedEffortLevels?.includes('high'),
        );
        if (agent.agent === firstAgent.agent) {
          await expect(
            await overlay.findByRole('slider', { name: 'Effort' }),
          ).toHaveAttribute('aria-valuetext', 'Medium');
        }
        const effortSlider = overlay.queryByRole('slider', { name: 'Effort' });
        if (effortSlider) {
          await Promise.all(
            overlay
              .getByRole('dialog')
              .getAnimations({ subtree: true })
              .filter(
                (animation) =>
                  animation.effect?.getTiming().iterations !== Infinity,
              )
              .map((animation) => animation.finished),
          );
          const heading = overlay.getByText('Effort', { exact: true });
          const sliderBounds = effortSlider.getBoundingClientRect();
          const headingBounds = heading.getBoundingClientRect();
          await expect(
            Math.abs(sliderBounds.left - headingBounds.left),
          ).toBeLessThan(1);
          await expect(
            Math.abs(sliderBounds.right - headingBounds.right),
          ).toBeLessThan(1);
          await expect(getComputedStyle(effortSlider).backgroundImage).not.toBe(
            'none',
          );
          const labels = overlay.getAllByRole('button', {
            name: /^Set effort to /,
          });
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
            await expect(text.scrollWidth).toBeLessThanOrEqual(
              text.clientWidth + 1,
            );
            await expect(
              text.getBoundingClientRect().height,
            ).toBeLessThanOrEqual(
              Number.parseFloat(getComputedStyle(text).lineHeight) + 1,
            );
          }
        }
        const chooseModel = async (name: string) => {
          if (width < 720)
            await userEvent.click(
              await overlay.findByRole('button', { name: 'Choose model' }),
            );
          await userEvent.click(await overlay.findByRole('button', { name }));
          if (width < 720)
            await expect(
              await overlay.findByRole('button', { name: 'Choose model' }),
            ).toBeVisible();
        };
        const fastModel = options.find(
          (entry) => entry._meta?.argo?.supportsFastMode,
        );
        if (fastModel) {
          await chooseModel(fastModel.name);
          await userEvent.click(
            await overlay.findByRole('switch', { name: 'Fast mode' }),
          );
          await expect(
            await overlay.findByRole('switch', { name: 'Fast mode' }),
          ).toBeChecked();
          await expect(
            within(
              canvas.getByRole('button', {
                name: 'Agent and model',
                hidden: true,
              }),
            ).getByRole('img', { name: 'Fast mode enabled', hidden: true }),
          ).toBeVisible();
          const fastTrigger = canvas.getByRole('button', {
            name: 'Agent and model',
            hidden: true,
          });
          for (const text of fastTrigger.querySelectorAll('[dir]')) {
            await expect(text.scrollWidth).toBeLessThanOrEqual(
              text.clientWidth + 1,
            );
          }
          const slowModel = options.find(
            (entry) => !entry._meta?.argo?.supportsFastMode,
          );
          if (slowModel) {
            await chooseModel(slowModel.name);
            await expect(
              overlay.queryByRole('switch', { name: 'Fast mode' }),
            ).not.toBeInTheDocument();
            await chooseModel(fastModel.name);
            await expect(
              await overlay.findByRole('switch', { name: 'Fast mode' }),
            ).not.toBeChecked();
          }
        }
        if (withEffort) {
          await chooseModel(withEffort.name);
          await userEvent.click(
            await overlay.findByRole('button', {
              name: /^Set effort to high$/i,
            }),
          );
          await expect(
            await overlay.findByRole('slider', { name: 'Effort' }),
          ).toHaveAttribute('aria-valuetext', expect.stringMatching(/^high$/i));
          const slider = overlay.getByRole('slider', { name: 'Effort' });
          slider.focus();
          await browserUserEvent.keyboard('{ArrowRight}');
          await expect(
            canvas.getByRole('button', {
              name: 'Agent and model',
              hidden: true,
            }),
          ).toHaveTextContent(
            width >= 720
              ? (slider.getAttribute('aria-valuetext') ?? '')
              : withEffort.name.replace(/\s*\(recommended\)/i, ''),
          );
          await expect(slider).not.toHaveAttribute(
            'aria-valuetext',
            expect.stringMatching(/^high$/i),
          );
        }
        if (withoutEffort) {
          await chooseModel(withoutEffort.name);
          await expect(
            overlay.queryByRole('slider', { name: 'Effort' }),
          ).not.toBeInTheDocument();
          await expect(
            canvas
              .getByRole('button', { name: 'Agent and model', hidden: true })
              .textContent?.trim(),
          ).toBe(withoutEffort.name.replace(/\s*\(recommended\)/i, ''));
        }
        await userEvent.keyboard('{Escape}');
        await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
        const mode = agent.configOptions.find(
          (entry) => entry.category === 'mode' && entry.type === 'select',
        );
        if (mode?.type !== 'select')
          throw new Error('Recorded catalog needs mode options.');
        const modes = mode.options.flatMap((entry) =>
          'groupId' in entry ? entry.options : [entry],
        );
        const dangerous = modes.find(
          (entry) => entry._meta?.argo?.tone === 'dangerous',
        );
        const planning = modes.find(
          (entry) => entry._meta?.argo?.tone === 'planning',
        );
        if (!dangerous || !planning)
          throw new Error('Recorded catalog needs Plan and dangerous modes.');
        const labelColor = (name: string) =>
          getComputedStyle(
            within(overlay.getByRole('button', { name })).getByText(name),
          ).color;
        const planMode = await overlay.findByRole('button', {
          name: planning.name,
        });
        await waitFor(() => expect(planMode).toBeVisible());
        await expect(
          within(planMode).getByTestId(
            'phosphor-react-native-map-trifold-regular',
          ),
        ).toBeInTheDocument();
        const red = labelColor(dangerous.name);
        await expect(labelColor(planning.name)).not.toBe(red);
        await userEvent.click(
          await overlay.findByRole('button', { name: dangerous.name }),
        );
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
              getComputedStyle(within(modeTrigger).getByText(dangerous.name))
                .color,
            ).toBe(red),
          );
        await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
        await expect(
          await overlay.findByRole('button', { name: dangerous.name }),
        ).toHaveAttribute('aria-pressed', 'true');
        await userEvent.keyboard('{Escape}');
      }
    }
  },
};

export const Checkout: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
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
      await userEvent.click(trigger);
      await expect(
        await overlay.findByRole('button', {
          name: /^New worktree$/,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
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
      await userEvent.click(trigger);
      await expect(
        await overlay.findByRole('button', { name: /^Local$/ }),
      ).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(
        overlay.getByRole('button', { name: /^New worktree$/ }),
      );
      await waitFor(() =>
        expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      await expect(trigger).toHaveTextContent('New worktree');
    }
  },
};

export const CreatedCheckoutIsReadOnly: Story = {
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
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const name = canvas.getByText('created-worktree', { exact: true });
      await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
      await userEvent.click(name);
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('textbox', { name: 'Search branches' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('switch', { name: 'New worktree' }),
      ).not.toBeInTheDocument();
      await expect(
        args.configuration?.checkout.onNewWorktreeChange,
      ).not.toHaveBeenCalled();
    }
  },
};

export const SessionControls: Story = {
  render: (args) => (
    <ComposerMock {...args} sessionStarted running onStop={args.onStop} />
  ),
  args: { onStop: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expect(canvas.getByText('session', { exact: true })).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Choose Agent' }),
      ).not.toBeInTheDocument();
      const ring = canvas
        .getByRole('button', { name: 'Context window' })
        .querySelectorAll('circle');
      await expect(ring).toHaveLength(2);
      for (const circle of ring) {
        await expect(getComputedStyle(circle).stroke).not.toBe('none');
        await expect(getComputedStyle(circle).strokeWidth).toBe('2px');
      }
      const contextSvg = canvas
        .getByRole('button', { name: 'Context window' })
        .querySelector('svg');
      if (!contextSvg) throw new Error('Context ring is missing.');
      await expect(getComputedStyle(contextSvg).width).toBe('14px');
      await expect(getComputedStyle(contextSvg).height).toBe('14px');
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      if (width < 720)
        await waitFor(() => expect(overlay.getByRole('dialog')).toBeVisible());
      else {
        await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() =>
          expect(canvas.getByText('Verify phone and desktop')).toBeVisible(),
        );
        await expect(
          canvas.getByRole('button', { name: 'Plan' }),
        ).toHaveAttribute('aria-expanded', 'true');
      }
      const spinner = await overlay.findByRole('progressbar', {
        name: 'Update the shared controls in progress',
      });
      await expect(spinner).toBeVisible();
      const expectedSize = width < 720 ? '14px' : '16px';
      await expect(
        getComputedStyle(spinner.firstElementChild as Element).width,
      ).toBe(expectedSize);
      await expect(
        getComputedStyle(spinner.firstElementChild as Element).height,
      ).toBe(expectedSize);
      const spinnerColor = getComputedStyle(
        overlay
          .getAllByText(
            width < 720
              ? 'Inspect the Composer layout'
              : 'Update the shared controls',
            { exact: true },
          )
          .at(-1) as Element,
      ).color;
      for (const circle of spinner.querySelectorAll('circle')) {
        await expect(getComputedStyle(circle).stroke).toBe(spinnerColor);
      }
      if (width < 720) await userEvent.keyboard('{Escape}');
      else {
        await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
        await waitFor(() =>
          expect(
            canvas.queryByText('Verify phone and desktop'),
          ).not.toBeVisible(),
        );
      }
      await userEvent.click(
        canvas.getByRole('button', { name: 'Context window' }),
      );
      await waitFor(() =>
        expect(overlay.getByText('Smart zone · below 20%')).toBeVisible(),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: 'Compact' }),
      );
      if (width >= 720)
        await expect(
          canvas.getByRole('button', { name: 'Context window' }),
        ).toHaveTextContent('12k / 200k');
      else
        await expect(
          within(
            canvas.getByRole('button', { name: 'Context window' }),
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
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }));
    await expect(args.onStop).toHaveBeenCalledOnce();
    await expect(
      canvas.queryByRole('button', { name: 'Stop' }),
    ).not.toBeInTheDocument();
  },
};

export const RunningWithoutStop: Story = {
  render: (args) => <ComposerMock {...args} sessionStarted running />,
  args: { draft: { text: 'A draft during a Turn.', images: [] } },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
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
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await settleViewport();
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Agent and model' }),
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

export const UnavailableAgents: Story = {
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
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Agent and model' }),
      );
      if (width < 720)
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose Agent' }),
        );
      for (const agent of args.configuration?.agents ?? []) {
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
    }
  },
};

export const ResponsiveLayout: Story = {
  render: (args) => <ComposerMock {...args} sessionStarted />,
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      const card = input.parentElement?.parentElement;
      if (!card) throw new Error('Composer card is missing.');
      const bounds = card.getBoundingClientRect();
      await expect(bounds.height).toBe(80);
      const attach = canvas
        .getByRole('button', { name: 'Attach images' })
        .getBoundingClientRect();
      await expect(attach.width).toBe(16);
      await expect(attach.height).toBe(28);
      const attachButton = canvas.getByRole('button', {
        name: 'Attach images',
      });
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
      await expect(
        Number(getComputedStyle(plus.parentElement as Element).zIndex),
      ).toBeGreaterThan(Number(getComputedStyle(highlight).zIndex));
      await userEvent.unhover(attachButton);
      const trigger = canvas.getByRole('button', { name: 'Agent and model' });
      await expect(trigger.getBoundingClientRect().height).toBe(28);
      await expect(
        within(trigger).queryAllByTestId('composer-agent-icon'),
      ).toHaveLength(width < 720 ? 0 : 1);
      if (width >= 720)
        await expect(
          within(trigger)
            .getByTestId('composer-agent-icon')
            .getBoundingClientRect().width,
        ).toBe(14);
      await expect(
        canvas.getByRole('button', { name: 'Mode' }).getBoundingClientRect()
          .height,
      ).toBe(28);
      if (width < 720) {
        await expect(
          canvas.queryByRole('button', { name: 'Checkout' }),
        ).not.toBeInTheDocument();
        await expect(
          within(
            canvas.getByRole('button', { name: 'Context window' }),
          ).getByText('34k'),
        ).not.toBeVisible();
        await expect(
          within(
            canvas.getByRole('button', { name: 'Context window' }),
          ).getByText('/ 200k'),
        ).not.toBeVisible();
        const work = canvas
          .getByRole('button', { name: 'Shells: 1' })
          .getBoundingClientRect();
        const tray = canvas
          .getByRole('button', { name: 'Plan' })
          .getBoundingClientRect();
        await expect(work.right).toBeLessThan(bounds.right);
        await expect(work.top).toBeGreaterThanOrEqual(tray.top);
        await expect(work.bottom).toBeLessThanOrEqual(bounds.top);
        await expect(canvas.getByText('session')).toBeVisible();
      } else {
        const footer = card.parentElement?.lastElementChild;
        if (!footer) throw new Error('Composer footer is missing.');
        await expect(getComputedStyle(footer).boxShadow).toBe(
          getComputedStyle(card).boxShadow,
        );
        const context = canvas.getByRole('button', { name: 'Context window' });
        const used = within(context).getByText('34k').getBoundingClientRect();
        const size = within(context)
          .getByText('/ 200k')
          .getBoundingClientRect();
        await expect(used.top).toBe(size.top);
        await expect(size.left).toBeGreaterThanOrEqual(used.right);
      }
      await userEvent.click(trigger);
      if (width < 720) {
        await expect(
          await overlay.findByRole('button', { name: 'Choose Agent' }),
        ).toBeDisabled();
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose model' }),
        );
        await expect(
          await overlay.findByRole('button', {
            name: 'Back to Agent and model',
          }),
        ).toBeVisible();
        await userEvent.click(
          overlay.getByRole('button', { name: 'Back to Agent and model' }),
        );
        await expect(
          await overlay.findByRole('slider', { name: 'Effort' }),
        ).toBeVisible();
      } else {
        await waitFor(() => {
          expect(
            overlay.getByRole('dialog').getBoundingClientRect().width,
          ).toBe(580);
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
      await userEvent.keyboard('{Escape}');
    }
    await page.viewport(320, 844);
    await settleViewport();
    const compact = canvas.getByRole('button', { name: 'Agent and model' });
    await expect(within(compact).getByText('Opus 5.5')).toBeVisible();
    await expect(within(compact).queryByText('Medium')).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Send' }).getBoundingClientRect()
        .right,
    ).toBeLessThanOrEqual(320);
  },
};

export const EditorScrollsAfterFourLines: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.clear(input);
      await userEvent.type(
        input,
        'First line\nSecond line\nThird line\nFourth line',
      );
      await waitFor(() =>
        expect(input.getBoundingClientRect().height).toBe(80),
      );
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
      const { userEvent: browserUserEvent } = await import('vitest/browser');
      await browserUserEvent.wheel(input, { delta: { y: 200 } });
      await waitFor(() => expect(input.scrollTop).toBeGreaterThan(0));
    }
  },
};

export const PlanDone: Story = {
  render: (args) => (
    <ComposerMock {...args} sessionStarted plan={composerPlanDone} />
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    const overlay = within(document.body);
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      const plan = canvas.getByRole('button', { name: 'Plan' });
      await expect(plan).toBeVisible();
      if (width >= 720) await expect(plan).toHaveTextContent('Plan 3/3');
      await userEvent.click(plan);
      if (width < 720)
        await waitFor(() =>
          expect(overlay.getByText('3 of 3 done')).toBeVisible(),
        );
      else
        await waitFor(() =>
          expect(canvas.getByText('Verify phone and desktop')).toBeVisible(),
        );
      await expect(
        overlay.queryByRole('progressbar', { name: /in progress$/ }),
      ).not.toBeInTheDocument();
      if (width < 720) await userEvent.keyboard('{Escape}');
      else await userEvent.click(plan);
    }
  },
};

export const PlanDoneDark: Story = { ...PlanDone, globals: { mode: 'dark' } };

export const NoPlan: Story = {
  render: (args) => <ComposerMock {...args} sessionStarted plan={[]} />,
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Plan' }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByTestId('composer-plan-steps'),
      ).not.toBeInTheDocument();
    }
  },
};

export const PlanExpandsSmoothly: Story = {
  render: (args) => <ComposerMock {...args} sessionStarted />,
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await settleViewport();
    const panel = canvas.getByTestId('composer-plan-steps');
    const heights: number[] = [];
    let collecting = true;
    const sample = () => {
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
        .getByText('Verify phone and desktop')
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
        expect(canvas.getByText('Verify phone and desktop')).not.toBeVisible(),
      );
    } finally {
      collecting = false;
    }
  },
};
