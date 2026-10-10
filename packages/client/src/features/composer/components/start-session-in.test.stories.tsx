import { newSessionProjects, serverInfo } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { StartSessionIn, type StartSessionInProps } from './start-session-in';

const [exampleProject, landingProject] = ((): [
  (typeof newSessionProjects)[number],
  (typeof newSessionProjects)[number],
] => {
  const [first, second] = newSessionProjects;
  if (!first || !second)
    throw new Error('Recorded catalog needs two Projects.');
  return [first, second];
})();
// A search that only the second Project's name or folder matches.
const landingSearch = landingProject.name.slice(0, 4).toLowerCase();
if (
  [exampleProject.name, exampleProject.path].some((text) =>
    text.toLowerCase().includes(landingSearch),
  )
)
  throw new Error(
    'Recorded catalog needs a Project whose name the other Project lacks.',
  );

// Swaps the chosen Project in, as New Session does when the reader picks one.
function ChoosingProject(props: StartSessionInProps): React.JSX.Element {
  const [projectId, setProjectId] = useState(props.projectId);
  return (
    <View className="p-4">
      <StartSessionIn
        {...props}
        projectId={projectId}
        onProjectChange={(id) => {
          props.onProjectChange(id);
          setProjectId(id);
        }}
      />
    </View>
  );
}

const meta = {
  title: 'Tests/StartSessionIn',
  component: StartSessionIn,
  render: (args): React.JSX.Element => <ChoosingProject {...args} />,
  args: {
    serverName: serverInfo.name,
    serverConnected: true,
    projects: newSessionProjects,
    projectId: exampleProject.id,
    onProjectChange: fn(),
    checkout: {
      branch: 'main',
      newWorktree: true,
      onNewWorktreeChange: fn(),
    },
  },
} satisfies Meta<typeof StartSessionIn>;
export default meta;
type Story = StoryObj<typeof meta>;

function switchProject(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const overlay = within(document.body);
      await userEvent.click(
        canvas.getByRole('button', {
          name: `Project: ${exampleProject.name}`,
        }),
      );
      await userEvent.type(
        await overlay.findByRole('textbox', { name: 'Find a Project' }),
        landingSearch,
      );
      await expect(
        overlay.queryByRole('button', { name: exampleProject.name }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        overlay.getByRole('button', { name: landingProject.name }),
      );
      await expect(args.onProjectChange).toHaveBeenCalledOnce();
      await expect(args.onProjectChange).toHaveBeenCalledWith(
        landingProject.id,
      );
      await expect(
        await canvas.findByRole('button', {
          name: `Project: ${landingProject.name}`,
        }),
      ).toBeVisible();
      // One tap picks a Project and closes the picker.
      await waitFor(() =>
        expect(
          overlay.queryByRole('textbox', { name: 'Find a Project' }),
        ).not.toBeInTheDocument(),
      );
    },
  };
}
export const SwitchProjectPhone = switchProject(layoutWidths.phone);
export const SwitchProjectWide = switchProject(layoutWidths.wide);
