import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
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
