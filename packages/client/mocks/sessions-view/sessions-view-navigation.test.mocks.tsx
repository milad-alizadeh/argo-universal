import { activeSessions, projectsList } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import {
  exampleProjectName,
  type Story,
} from './sessions-view-story-context.test.mocks';

interface FirstSessionAndProject {
  running: NonNullable<(typeof activeSessions.sessions)[number]>;
  project: NonNullable<(typeof projectsList)[number]>;
}

function firstSessionAndProject(): FirstSessionAndProject {
  const running = activeSessions.sessions[0];
  const project = projectsList[0];

  if (!running || !project) throw new Error('Missing Session or Project mock');

  return { running, project };
}

export const navigationCallbacks: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const { running, project } = firstSessionAndProject();
    await userEvent.click(canvas.getByRole('button', { name: 'New Session' }));
    await expect(args.onNewSession).toHaveBeenCalledTimes(1);

    const [row] = await canvas.findAllByRole('button', {
      name: new RegExp(`^${running.title}, `),
    });

    if (!row) throw new Error('Missing Session row');
    await userEvent.click(row);
    await expect(args.onSelect).toHaveBeenCalledWith(running.sessionId);

    const heading = canvas.getByRole('button', { name: exampleProjectName });
    await userEvent.hover(heading);
    await userEvent.click(
      canvas.getByRole('button', {
        name: `New Session in ${exampleProjectName}`,
      }),
    );
    await expect(args.onNewSessionInProject).toHaveBeenCalledWith(project.id);
    await userEvent.hover(heading);
    await userEvent.click(
      canvas.getByRole('button', {
        name: `Project settings for ${exampleProjectName}`,
      }),
    );
    await expect(args.onProjectSettings).toHaveBeenCalledWith(project.name);
  },
};
