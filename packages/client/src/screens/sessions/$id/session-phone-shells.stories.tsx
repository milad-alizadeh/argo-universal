import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { idleSession } from './session-detail-view.mocks';
import {
  shellTerminal,
  shellTerminalActions,
} from './session-shell-terminal-fixtures';
import { WorkbenchRunList } from './session-workbench-run-pages';
import { SessionWorkbenchSheet } from './session-workbench-sheet';
import { WorkbenchShellRuntime } from './session-workbench-shell-page';

const noChange = (): void => {};

function PhoneShells({ terminal }: { terminal: boolean }): ReactElement {
  if (terminal)
    return (
      <SessionWorkbenchSheet
        content={{ ...idleSession, runs: shellTerminalActions }}
        initialShell={shellTerminal}
        open
        onOpenChange={noChange}
      />
    );

  return (
    <WorkbenchShellRuntime value={shellTerminalActions}>
      <Sheet
        label="Workbench"
        detents={['large']}
        contentScrolls
        open
        onOpenChange={noChange}
      >
        <Sheet.Screen name="runs" title="Runs">
          <WorkbenchRunList runs={shellTerminalActions} />
        </Sheet.Screen>
      </Sheet>
    </WorkbenchShellRuntime>
  );
}

const meta = {
  title: 'Screens/Sessions/Session/PhoneShells',
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  render: PhoneShells,
  args: { terminal: false },
} satisfies Meta<{ terminal: boolean }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RunsWithShells: Story = {};

export const ShellTerminal: Story = { args: { terminal: true } };
