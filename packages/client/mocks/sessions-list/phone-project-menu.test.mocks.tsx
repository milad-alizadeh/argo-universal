import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { expect, waitFor, within } from 'storybook/test';
import { sessionsListProps } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';
import {
  exampleProjectName,
  newSessionLabel,
  onNewSession,
  onProjectSettings,
  projectButtonName,
  projectSettingsLabel,
  type Story,
} from './sessions-list-story-context.test.mocks';

const body = within(document.body);

// A phone's heading draws no buttons: a long press opens New Session and Project settings, titled with the Project. The web's long touch, like a right-click, opens the context menu.
export const phoneProjectMenu: Story = {
  beforeEach: () => settleViewport(layoutWidths.phone),
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });

    await expect(
      canvas.queryByRole('button', {
        name: projectButtonName(projectSettingsLabel),
      }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', {
        name: projectButtonName(newSessionLabel),
      }),
    ).toBeNull();
    await userEvent.pointer({ keys: '[MouseRight]', target: heading });
    const menu = within(await body.findByRole('menu'));
    const [first, second] = menu.getAllByRole('menuitem');
    await expect(first).toHaveAccessibleName(newSessionLabel);
    await expect(second).toHaveAccessibleName(projectSettingsLabel);
    await userEvent.click(
      menu.getByRole('menuitem', { name: newSessionLabel }),
    );
    await expect(onNewSession).toHaveBeenCalledWith(
      sessionsListProps.projects[0]?.id,
    );
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    await userEvent.pointer({ keys: '[MouseRight]', target: heading });
    await userEvent.click(
      within(await body.findByRole('menu')).getByRole('menuitem', {
        name: projectSettingsLabel,
      }),
    );
    await expect(onProjectSettings).toHaveBeenCalledWith(exampleProjectName);
  },
};
