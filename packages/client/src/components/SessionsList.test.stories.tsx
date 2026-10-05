import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { sessionsListProps } from '../../mocks/sessions-list-mock';
import { SessionsNewSessionPreview } from '../../mocks/sessions-new-session-preview';
import { SessionsPaginationPreview } from '../../mocks/sessions-pagination-preview';
import { SessionsList } from './SessionsList';

const onNewSession = fn();
const onProjectSettings = fn();
const meta = {
  title: 'Tests/SessionsList',
  component: SessionsList,
  args: {
    ...sessionsListProps,
    onSelect: fn(),
    onEndReached: fn(),
    onNewSession,
    onProjectSettings,
  },
  render: (args) => (
    <View className="w-full wide:w-shell-list" style={{ height: 320 }}>
      <SessionsList {...args} />
    </View>
  ),
  beforeEach: () => {
    onNewSession.mockClear();
    onProjectSettings.mockClear();
  },
} satisfies Meta<typeof SessionsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ProjectActions: Story = {
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: 'Example Project',
    });
    await waitFor(() => expect(heading).toBeVisible());
    await userEvent.hover(heading);
    const settings = canvas.getByRole('button', {
      name: 'Project settings for Example Project',
    });
    const newSession = canvas.getByRole('button', {
      name: 'New Session in Example Project',
    });
    const actions = settings.parentElement;
    if (!actions) throw new Error('Missing Project actions');
    await waitFor(() => expect(getComputedStyle(actions).opacity).toBe('1'));
    await expect(settings).toBeVisible();
    await expect(newSession).toBeVisible();
    await userEvent.click(settings);
    await expect(onProjectSettings).toHaveBeenCalledWith('Example Project');
    await userEvent.click(newSession);
    await expect(onNewSession).toHaveBeenCalledWith(
      sessionsListProps.projects[0]?.id,
    );
    await expect(heading).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(heading);
    await expect(heading).toHaveAttribute('aria-expanded', 'false');
    await expect(heading).toHaveTextContent(/^Example Project$/);
    await userEvent.hover(heading);
    await userEvent.click(newSession);
    await expect(heading).toHaveAttribute('aria-expanded', 'false');
  },
};
export const ProjectActionsDark: Story = {
  ...ProjectActions,
  globals: { mode: 'dark' },
};

export const InsertSessionOpaqueRows: Story = {
  render: (args) => <SessionsNewSessionPreview {...args} />,
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: 'Example Project',
    });
    const existing = canvas.getByRole('button', {
      name: 'Large Session 0, Idle',
    });
    await userEvent.hover(heading);
    await waitFor(() => {
      const firstRow = existing.getBoundingClientRect();
      const project = heading.getBoundingClientRect();
      expect(Math.abs(firstRow.top - project.bottom)).toBeLessThanOrEqual(3);
    });
    const initialTop = existing.getBoundingClientRect().top;
    const positions = [initialTop];
    const movement = new Promise<void>((resolve) => {
      const started = performance.now();
      function sample() {
        positions.push(existing.getBoundingClientRect().top);
        if (performance.now() - started < 600) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    await userEvent.click(
      canvas.getByRole('button', { name: 'New Session in Example Project' }),
    );
    const inserted = await canvas.findByRole('button', {
      name: 'New Session 1, Idle',
    });
    function assertOpaqueRow(button: HTMLElement) {
      const surface = button.parentElement;
      if (!surface) throw new Error('Missing Session row surface');
      const color = getComputedStyle(surface).backgroundColor;
      expect(
        color,
        'The animated row surface must be opaque, not only its button',
      ).not.toBe('rgba(0, 0, 0, 0)');
      expect(color).not.toBe('transparent');
      expect(getComputedStyle(surface).opacity).toBe('1');
      expect(getComputedStyle(surface).overflow).toBe('hidden');
    }
    assertOpaqueRow(inserted);
    assertOpaqueRow(existing);
    for (let frame = 0; frame < 12; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      assertOpaqueRow(inserted);
      assertOpaqueRow(existing);
      positions.push(existing.getBoundingClientRect().top);
    }
    await waitFor(() => {
      const newRectangle = inserted.getBoundingClientRect();
      const oldRectangle = existing.getBoundingClientRect();
      expect(newRectangle.bottom).toBeLessThanOrEqual(oldRectangle.top + 1);
    });
    await movement;
    const finalTop = existing.getBoundingClientRect().top;
    expect(finalTop - initialTop).toBeGreaterThan(20);
    expect(
      positions.some((top) => top > initialTop + 1 && top < finalTop - 1),
      'Existing rows must pass through intermediate positions, not jump',
    ).toBe(true);
    await userEvent.hover(inserted);
    assertOpaqueRow(inserted);
  },
};
export const InsertSessionOpaqueRowsDark: Story = {
  ...InsertSessionOpaqueRows,
  globals: { mode: 'dark' },
};

export const ScrollFadePadding: Story = {
  render: (args) => <SessionsNewSessionPreview {...args} />,
  play: async ({ canvas }) => {
    const scroll = canvas.getByTestId('sessions-scroll');
    const topFade = canvas.getByTestId('scroll-fade-top');
    const bottomFade = canvas.getByTestId('scroll-fade-bottom');
    const surface = topFade.parentElement;
    if (!surface) throw new Error('Missing list surface');
    expect(
      getComputedStyle(surface).maskImage,
      'The list surface must stay opaque instead of revealing the page behind it',
    ).toBe('none');
    const surfaceColor = getComputedStyle(surface).backgroundColor;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = 1;
    const context = colorCanvas.getContext('2d');
    if (!context) throw new Error('Missing browser color context');
    function colorPixel(color: string) {
      if (!context) throw new Error('Missing browser color context');
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    }
    for (const fade of [topFade, bottomFade]) {
      const stops = fade.querySelectorAll('stop');
      expect(stops.length).toBeGreaterThan(0);
      for (const stop of stops)
        expect(colorPixel(getComputedStyle(stop).stopColor)).toEqual(
          colorPixel(surfaceColor),
        );
    }
    expect(topFade.getBoundingClientRect().height).toBe(20);
    expect(bottomFade.getBoundingClientRect().height).toBe(28);
    const heading = await canvas.findByRole('button', {
      name: 'Example Project',
    });
    await waitFor(() => {
      expect(
        heading.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top,
      ).toBeGreaterThanOrEqual(19);
    });
    scroll.scrollTop = scroll.scrollHeight;
    const last = await canvas.findByRole('button', {
      name: 'Large Session 11, Idle',
    });
    await waitFor(() => {
      scroll.scrollTop = scroll.scrollHeight;
      const viewportBottom = scroll.getBoundingClientRect().bottom;
      expect(
        viewportBottom - last.getBoundingClientRect().bottom,
      ).toBeGreaterThanOrEqual(27);
      expect(last.getBoundingClientRect().bottom).toBeGreaterThan(
        scroll.getBoundingClientRect().top,
      );
    });
  },
};
export const ScrollFadePaddingDark: Story = {
  ...ScrollFadePadding,
  globals: { mode: 'dark' },
};

export const PaginationSpinnerVisible: Story = {
  render: (args) => <SessionsPaginationPreview {...args} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('sessions-scroll');
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
    );
    const initialHeight = scroll.scrollHeight;
    scroll.scrollTop = initialHeight;
    const spinner = await canvas.findByRole('progressbar', {
      name: 'Loading more Sessions',
    });
    await waitFor(
      () => {
        const viewport = scroll.getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        expect(indicator.top).toBeGreaterThanOrEqual(viewport.top + 20);
        expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom - 28);
      },
      { timeout: 1000 },
    );
    await waitFor(
      () => expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(initialHeight + 500),
    );
  },
};
export const PaginationSpinnerVisibleDark: Story = {
  ...PaginationSpinnerVisible,
  globals: { mode: 'dark' },
};
