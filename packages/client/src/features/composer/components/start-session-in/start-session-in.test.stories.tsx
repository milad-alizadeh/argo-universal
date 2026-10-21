import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { newSessionProjects, serverInfo } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ServerPlaceProvider } from '../../../../lib/product/server-place';
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
        await overlay.findByRole('searchbox', { name: 'Search Projects' }),
        landingSearch,
      );
      await expect(
        overlay.queryByRole('radio', { name: exampleProject.name }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        overlay.getByRole('radio', { name: landingProject.name }),
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
          overlay.queryByRole('searchbox', { name: 'Search Projects' }),
        ).not.toBeInTheDocument(),
      );
    },
  };
}

export const SwitchProjectPhone = switchProject(layoutWidths.phone);

export const SwitchProjectWide = switchProject(layoutWidths.wide);

// On the Server's own computer the App does not name the host.
export const ServerOnThisComputer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(serverInfo.name)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('img', { name: 'Connected' }),
    ).not.toBeInTheDocument();
  },
};

// A lost Connection still shows, even without the host's name.
export const ReconnectingOnThisComputer: Story = {
  args: { serverConnected: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Reconnecting…')).toBeVisible();
    await expect(canvas.queryByText(serverInfo.name)).not.toBeInTheDocument();
  },
};

// A device paired to a Server on another computer names that computer.
export const PairedToAnotherComputer: Story = {
  render: (args): React.JSX.Element => (
    <ServerPlaceProvider paired>
      <ChoosingProject {...args} />
    </ServerPlaceProvider>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(serverInfo.name)).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Connected' })).toBeVisible();
  },
};
