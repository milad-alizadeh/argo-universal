import type { ShellTerminal } from '@repo/contracts';
import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { withStack } from '@repo/kit/story-stack';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn, screen, within } from 'storybook/test';
import { workbenchRuns } from '../../../../mocks/run-configurations';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';
import { openWorkbench } from './session-workbench-sheet.test.mocks';

type Props = {
  closed: (id: string) => void;
};

function ShellPreview({ closed }: Props): ReactElement {
  const [shells, setShells] = useState<ShellTerminal[]>([]);

  return (
    <FramedSessionPreview
      state="open"
      {...idleSession}
      runs={{
        runs: workbenchRuns,
        shells,
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

export const OpensFromCardAndMoreAndClosesEachShellIndependently: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: newTerminal }),
    );
    await expect(
      await canvas.findByRole('tabpanel', { name: 'Shell 1' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Hide Inspector' }),
    );
    await expect(args.closed).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Shell 1 shell' }),
    );
    await expect(
      await canvas.findByRole('tabpanel', { name: 'Shell 1' }),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
    const menu = within(document.body);
    const item = await menu.findByRole('menuitem', { name: newTerminal });
    await settleOverlays(item);
    await userEvent.click(item);
    await expect(
      await canvas.findByRole('tabpanel', { name: 'Shell 2' }),
    ).toBeVisible();
    await expect(canvas.getByRole('tab', { name: 'Shell 1' })).toBeVisible();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Shell 2' }),
    );
    await expect(args.closed).toHaveBeenCalledTimes(1);
    await expect(args.closed).toHaveBeenCalledWith('shell-2');
    await expect(canvas.getByRole('tab', { name: 'Shell 1' })).toBeVisible();
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
    const row = sheet.getByRole('link', { name: /Runs.*1/ });

    await settleOverlays(row);
    await context.userEvent.click(row);
    await context.userEvent.click(
      await sheet.findByRole('button', { name: newTerminal }),
    );
    await expect(
      await sheet.findByRole('heading', { name: 'Shell 1' }),
    ).toBeVisible();

    await context.userEvent.click(
      sheet.getByRole('button', { name: 'Back to Runs' }),
    );
    await expect(context.args.closed).not.toHaveBeenCalled();

    const shell = await sheet.findByRole('button', {
      name: 'Open Shell 1 shell',
    });

    await settleOverlays(shell);
    await context.userEvent.click(shell);
    await context.userEvent.click(
      await sheet.findByRole('button', { name: 'Close', exact: true }),
    );
    await expect(context.args.closed).toHaveBeenCalledWith('shell-1');
    await expect(
      await sheet.findByRole('heading', { name: 'Runs' }),
    ).toBeVisible();
  },
};

export const OpensThePhoneRunsSheetFromMore: Story = {
  ...phone,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'More' }));
    const item = await screen.findByRole('menuitem', { name: newTerminal });

    await settleOverlays(item);
    await userEvent.click(item);

    const sheet = within(
      await screen.findByRole('dialog', { name: 'Workbench' }),
    );

    await expect(
      await sheet.findByRole('heading', { name: 'Shell 1' }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Back to Runs' }),
    ).toBeVisible();
  },
};
