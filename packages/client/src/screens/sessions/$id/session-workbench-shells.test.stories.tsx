import type { ShellTerminal } from '@repo/contracts';
import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { withStack } from '@repo/kit/story-stack';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn, screen, within } from 'storybook/test';
import {
  partiallyReadyGroup,
  workbenchRuns,
} from '../../../../mocks/run-configurations';
import { titleTrigger } from '../../../../mocks/session-view/session-view-story.test.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';
import { openWorkbench } from './session-workbench-sheet.test.mocks';

type Props = {
  closed: (id: string) => void;
  draft?: () => void;
};

function ShellPreview({ closed, draft }: Props): ReactElement {
  const [shells, setShells] = useState<ShellTerminal[]>([]);

  return (
    <FramedSessionPreview
      state="open"
      {...idleSession}
      header={{
        ...idleSession.header,
        changes: {
          summary: { files: 4, additions: 16, deletions: 2 },
          open: false,
          onOpenChange: () => {},
        },
      }}
      runs={{
        runs: draft ? [] : workbenchRuns,
        shells,
        draft: draft && { pending: false, onPress: draft },
        defaultGroup: draft
          ? undefined
          : {
              status: partiallyReadyGroup,
              onStart: fn(),
              onStop: fn(),
            },
        onStart: fn(),
        onStop: fn(),
        onRestart: fn(),
        renderTerminal: () => null,
        renderShell: () => null,
        openShell: (opened: (shell: ShellTerminal) => void): void => {
          const number = shells.length + 1;

          const shell = {
            id: `shell-${number}`,
            name: `Shell ${number}`,
            cwd: '/repo/worktree',
          };

          setShells((current) => [...current, shell]);

          opened(shell);
        },
        closeShell: (id: string): void => {
          closed(id);

          setShells((current) => current.filter((shell) => shell.id !== id));
        },
      }}
    />
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchShells',
  parameters: { screenPreview: true },
  render: ShellPreview,
  beforeEach: (): Promise<void> => settleLayout(2560),
  args: { closed: fn() },
} satisfies Meta<Props>;

export default meta;

type Story = StoryObj<typeof meta>;

const newTerminal = 'New Terminal';

const firstShell = 'Shell 1';

const reopenFirstShell = 'Open Shell 1 shell';

export const OpensFromHeaderAndInspectorAndClosesEachShellIndependently: Story =
  {
    play: async ({ args, canvas, userEvent }) => {
      await userEvent.click(
        await canvas.findByRole('button', { name: newTerminal }),
      );
      await expect(
        await canvas.findByRole('tabpanel', { name: firstShell }),
      ).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Hide Inspector' }),
      );
      await expect(args.closed).not.toHaveBeenCalled();
      await userEvent.click(
        canvas.getByRole('button', { name: reopenFirstShell }),
      );
      await expect(
        await canvas.findByRole('tabpanel', { name: firstShell }),
      ).toBeVisible();

      // The title in the title bar opens the Session's menu.
      await userEvent.click(await titleTrigger(canvas));
      const menu = within(document.body);
      await expect(
        await menu.findByRole('menuitem', { name: 'Rename' }),
      ).toBeVisible();
      await expect(
        menu.queryByRole('menuitem', { name: newTerminal }),
      ).toBeNull();
      await expect(
        menu.queryByRole('menuitem', { name: /^Changed files/ }),
      ).toBeNull();
      await userEvent.keyboard('{Escape}');

      const add = await canvas.findByRole('button', {
        name: 'Add Terminal tab',
      });

      await settleOverlays(add);
      await userEvent.click(add);
      await expect(
        await canvas.findByRole('tabpanel', { name: 'Shell 2' }),
      ).toBeVisible();
      await expect(canvas.getByRole('tab', { name: firstShell })).toBeVisible();

      await userEvent.click(
        canvas.getByRole('button', { name: 'Close Shell 2' }),
      );
      await expect(args.closed).toHaveBeenCalledTimes(1);
      await expect(args.closed).toHaveBeenCalledWith('shell-2');
      await expect(canvas.getByRole('tab', { name: firstShell })).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Stop dev group' }),
      ).toBeVisible();
    },
  };

export const ClosesDesktopShellFromTheHeader: Story = {
  args: { closed: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: newTerminal }),
    );

    const terminal = within(
      await canvas.findByRole('tabpanel', { name: firstShell }),
    );

    await userEvent.click(terminal.getByRole('button', { name: /^Close$/ }));
    await expect(args.closed).toHaveBeenCalledOnce();
    await expect(args.closed).toHaveBeenCalledWith('shell-1');
    await expect(
      canvas.queryByRole('button', { name: reopenFirstShell }),
    ).toBeNull();
  },
};

const phone = {
  decorators: [withStack()],
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Partial<Story>;

export const OpensInThePhoneRunsSheet: Story = {
  ...phone,
  args: { closed: fn() },
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const row = sheet.getByRole('link', { name: /^Manage Runs/ });

    await settleOverlays(row);
    await context.userEvent.click(row);
    await context.userEvent.click(
      await sheet.findByRole('button', { name: newTerminal }),
    );
    await expect(
      await sheet.findByRole('heading', { name: firstShell }),
    ).toBeVisible();

    await context.userEvent.click(
      sheet.getByRole('button', { name: 'Back to Runs' }),
    );
    await expect(context.args.closed).not.toHaveBeenCalled();

    const shell = await sheet.findByRole('button', {
      name: reopenFirstShell,
    });

    await settleOverlays(shell);
    await context.userEvent.click(shell);
    await context.userEvent.click(
      await sheet.findByRole('button', { name: /^Close$/ }),
    );
    await expect(context.args.closed).toHaveBeenCalledWith('shell-1');
    await expect(
      await sheet.findByRole('heading', { name: 'Runs' }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Stop dev group' }),
    ).toBeVisible();
  },
};

export const OpensThePhoneTerminalFromTheHeader: Story = {
  ...phone,
  play: async ({ canvas, userEvent }) => {
    const item = await canvas.findByRole('button', { name: newTerminal });

    await settleOverlays(item);
    await userEvent.click(item);

    const sheet = within(
      await screen.findByRole('dialog', { name: 'Workbench' }),
    );

    await expect(
      await sheet.findByRole('heading', { name: firstShell }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Back to Runs' }),
    ).toBeVisible();
  },
};

const createRunFile = 'Create .argo/run.json';

export const OffersRunSetupInTheWorkbench: Story = {
  args: { draft: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: createRunFile }),
    );
    await expect(args.draft).toHaveBeenCalledOnce();
  },
};

export const OffersRunSetupInThePhoneWorkbench: Story = {
  ...phone,
  args: { draft: fn() },
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const setup = await sheet.findByRole('button', { name: createRunFile });

    await expect(sheet.queryByRole('link', { name: 'Manage Runs' })).toBeNull();
    await settleOverlays(setup);
    await context.userEvent.click(setup);
    await expect(context.args.draft).toHaveBeenCalledOnce();
  },
};
