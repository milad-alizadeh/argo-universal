import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { ProjectsNewSessionPreview } from '../../mocks/projects-new-session-preview';
import { projectsListProps } from '../../mocks/projects-list-mock';
import { ProjectsList } from './ProjectsList';

const onNewSession = fn();
const onProjectSettings = fn();
const meta = {
  title: 'Tests/ProjectsList',
  component: ProjectsList,
  args: {
    ...projectsListProps,
    onSelect: fn(),
    onEndReached: fn(),
    onNewSession,
    onProjectSettings,
  },
  render: (args) => (
    <View className="w-full wide:w-shell-list" style={{ height: 320 }}>
      <ProjectsList {...args} />
    </View>
  ),
  beforeEach: () => {
    onNewSession.mockClear();
    onProjectSettings.mockClear();
  },
} satisfies Meta<typeof ProjectsList>;
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
      projectsListProps.projects[0]?.id,
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
  render: (args) => <ProjectsNewSessionPreview {...args} />,
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: 'Example Project',
    });
    await userEvent.hover(heading);
    await userEvent.click(
      canvas.getByRole('button', { name: 'New Session in Example Project' }),
    );
    const inserted = await canvas.findByRole('button', {
      name: 'New Session 1, Idle',
    });
    const existing = canvas.getByRole('button', {
      name: 'Large Session 0, Idle',
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
    }
    await waitFor(() => {
      const newRectangle = inserted.getBoundingClientRect();
      const oldRectangle = existing.getBoundingClientRect();
      expect(newRectangle.bottom).toBeLessThanOrEqual(oldRectangle.top + 1);
    });
    await userEvent.hover(inserted);
    assertOpaqueRow(inserted);
  },
};
export const InsertSessionOpaqueRowsDark: Story = {
  ...InsertSessionOpaqueRows,
  globals: { mode: 'dark' },
};

export const ScrollFadePadding: Story = {
  render: (args) => <ProjectsNewSessionPreview {...args} />,
  play: async ({ canvas }) => {
    const scroll = canvas.getByTestId('projects-scroll');
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
