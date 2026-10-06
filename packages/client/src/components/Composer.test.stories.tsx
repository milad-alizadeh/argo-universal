import { newSessionCatalogs } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  ComposerMock,
  composerImages,
  composerLongAgentCatalog,
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
      const effort = within(trigger).getByText('Medium', { exact: true });
      const input = canvas.getByRole('textbox', { name: 'Message' });
      for (const [element, weight, size, lineHeight] of [
        [model, '400', '14px', '20px'],
        [effort, '400', '14px', '20px'],
        [
          input,
          '400',
          width < 720 ? '16px' : '14px',
          width < 720 ? '24px' : '20px',
        ],
      ] as const) {
        const style = getComputedStyle(element);
        await document.fonts.load(`${weight} 14px ${style.fontFamily}`);
        await document.fonts.ready;
        await expect(style.fontFamily).toContain('SF Pro Text');
        await expect(style.fontWeight).toBe(weight);
        await expect(style.fontSize).toBe(size);
        await expect(style.lineHeight).toBe(lineHeight);
      }
      await expect(
        getComputedStyle(canvas.getByText('54%', { exact: true })).fontWeight,
      ).toBe('400');
      if (width >= 720) {
        await expect(
          getComputedStyle(canvas.getByText('New worktree', { exact: true }))
            .fontWeight,
        ).toBe('400');
        const branch = getComputedStyle(
          canvas.getByText('main', { exact: true }),
        );
        await expect(branch.fontFamily).toContain('monospace');
        await expect(branch.fontWeight).toBe('400');
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
      await expect(canvas.getAllByTestId('composer-agent-icon')).toHaveLength(
        1,
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
          ).toHaveTextContent(slider.getAttribute('aria-valuetext') ?? '');
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
        }
        await userEvent.keyboard('{Escape}');
        await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
        const mode = agent.configOptions.find(
          (entry) => entry.category === 'mode' && entry.type === 'select',
        );
        if (mode?.type !== 'select')
          throw new Error('Recorded catalog needs mode options.');
        const dangerous = mode.options
          .flatMap((entry) => ('groupId' in entry ? entry.options : [entry]))
          .find((entry) => entry._meta?.argo?.tone === 'dangerous');
        if (!dangerous)
          throw new Error('Recorded catalog needs a dangerous mode.');
        await userEvent.click(
          await overlay.findByRole('button', { name: dangerous.name }),
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
    for (const width of [1440]) {
      await page.viewport(width, 844);
      await settleViewport();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Base branch' }),
      );
      const search = await overlay.findByRole('textbox', {
        name: 'Search branches',
      });
      await expect(
        getComputedStyle(overlay.getByRole('button', { name: /^main$/ }))
          .backgroundColor,
      ).toBe('rgb(245, 245, 245)');
      await expect(getComputedStyle(search).outlineStyle).toBe('none');
      await expect(search.getBoundingClientRect().width).toBeGreaterThan(200);
      await userEvent.type(
        await overlay.findByRole('textbox', { name: 'Search branches' }),
        'release',
      );
      await expect(
        overlay.queryByRole('button', { name: 'main' }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        await overlay.findByRole('button', { name: 'release' }),
      );
      await expect(
        canvas.getByRole('button', { name: 'Base branch' }),
      ).toHaveTextContent('release');
      await userEvent.click(canvas.getByText('New worktree', { exact: true }));
      await expect(
        canvas.getByRole('button', { name: 'Base branch' }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Base branch' }),
      ).toHaveTextContent('main');
      await userEvent.click(canvas.getByText('New worktree', { exact: true }));
      await expect(
        canvas.getByRole('button', { name: 'Base branch' }),
      ).toHaveTextContent('release');
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
      await waitFor(() =>
        expect(
          within(overlay.getByRole('dialog')).getByText(
            'Update the shared controls',
          ),
        ).toBeVisible(),
      );
      const spinner = await overlay.findByRole('progressbar', {
        name: 'Update the shared controls in progress',
      });
      await expect(spinner).toBeVisible();
      // Measure the rotating element before its transform enlarges the bounding box.
      await expect(
        getComputedStyle(spinner.firstElementChild as Element).width,
      ).toBe('14px');
      await expect(
        getComputedStyle(spinner.firstElementChild as Element).height,
      ).toBe('14px');
      if (width >= 720) {
        await userEvent.tab();
        await expect(overlay.getByRole('dialog')).toHaveFocus();
        await expect(
          getComputedStyle(overlay.getByRole('dialog')).outlineStyle,
        ).toBe('none');
      }
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Context window' }),
      );
      await waitFor(() =>
        expect(overlay.getByText('Smart zone · below 20%')).toBeVisible(),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: 'Compact' }),
      );
      await expect(
        canvas.getByRole('button', { name: 'Context window' }),
      ).toHaveTextContent(width < 720 ? '12k' : '12k / 200k');
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
      checkout: { branch: 'main', branches: ['main'], newWorktree: true },
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
      checkout: { branch: 'main', branches: ['main'], newWorktree: true },
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
      await expect(bounds.height).toBe(width < 720 ? 86 : 80);
      const trigger = canvas.getByRole('button', { name: 'Agent and model' });
      await expect(trigger.getBoundingClientRect().height).toBe(28);
      await expect(
        within(trigger).getAllByTestId('composer-agent-icon'),
      ).toHaveLength(1);
      await expect(
        canvas.getByRole('button', { name: 'Mode' }).getBoundingClientRect()
          .height,
      ).toBe(width < 720 ? 44 : 28);
      if (width < 720) {
        await expect(
          canvas.queryByRole('button', { name: 'Checkout' }),
        ).not.toBeInTheDocument();
        await expect(
          canvas.getByRole('button', { name: 'Context window' }),
        ).toHaveTextContent('34k');
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
        await expect(work.right).toBeLessThan(bounds.right - 12);
        await expect(work.top).toBe(tray.top);
      } else {
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
    await expect(within(compact).getByText('Opus 5.5')).not.toBeVisible();
    await expect(within(compact).getByText('Medium')).not.toBeVisible();
    await expect(compact.getBoundingClientRect().width).toBe(44);
  },
};
