import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fn } from 'storybook/test';
import { DesktopShellFrame } from './desktop-shell-frame.mocks';

export const preservedDraft = 'Keep my draft';

/*
 * With the sidebar and the Inspector open on this window, the Session column
 * is narrower than 480 pixels, so it draws the phone layout. At 1440 the
 * column stays wide (Paper 4EV9).
 */
export const narrowDesktopWidth = 1180;

type ShellProps = React.ComponentProps<typeof DesktopShellFrame>;

export type InspectorState = NonNullable<ShellProps['inspectorState']>;

export const shellMeta = {
  component: DesktopShellFrame,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    sidebarShown: true,
    inspectorState: 'closed',
    onSectionChange: fn(),
    onSidebarShownChange: fn(),
    onInspectorStateChange: fn(),
  },
  render: (): React.JSX.Element => (
    <View testID="controlled-shell" className="w-full" />
  ),
} satisfies Meta<typeof DesktopShellFrame>;

export type ShellStory = StoryObj<typeof shellMeta>;

export type ShellPlayContext = Parameters<NonNullable<ShellStory['play']>>[0];

export interface ControlledShell {
  root: ReturnType<typeof createRoot>;
  render: (props: Partial<ShellProps>) => Promise<void>;
  onSectionChange: ReturnType<typeof fn>;
  onSidebarShownChange: ReturnType<typeof fn>;
  onInspectorStateChange: ReturnType<typeof fn>;
}

function CommittedShell({
  children,
  onCommit,
}: {
  children: React.ReactNode;
  onCommit: () => void;
}): React.ReactNode {
  useLayoutEffect(onCommit, [onCommit]);

  return children;
}

function shellTree(props: ShellProps, onCommit: () => void): React.JSX.Element {
  return (
    <CommittedShell onCommit={onCommit}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <View className="h-[700px] w-full">
            <DesktopShellFrame {...props} />
          </View>
          <PortalHost />
        </KeyboardProvider>
      </SafeAreaProvider>
    </CommittedShell>
  );
}

function shellSpies(): Omit<ControlledShell, 'root' | 'render'> {
  return {
    onSectionChange: fn(),
    onSidebarShownChange: fn(),
    onInspectorStateChange: fn(),
  };
}

function commitShell(
  root: ReturnType<typeof createRoot>,
  props: ShellProps,
): Promise<void> {
  return new Promise<void>((resolve) => root.render(shellTree(props, resolve)));
}

function mountShell(
  element: HTMLElement,
  initial: ShellProps,
): ControlledShell {
  const root = createRoot(element);
  const spies = shellSpies();
  let props = initial;

  const render = async (next: Partial<ShellProps>): Promise<void> => {
    props = { ...props, ...next };
    await commitShell(root, { ...props, ...spies });
    await new Promise(requestAnimationFrame);
  };

  return { root, render, ...spies };
}

type ControlledBody = (
  context: ShellPlayContext,
  controlled: ControlledShell,
) => Promise<void>;

async function runControlled(
  context: ShellPlayContext,
  play: ControlledBody,
): Promise<void> {
  const element = context.canvas.getByTestId('controlled-shell');
  const controlled = mountShell(element, context.args);

  try {
    await controlled.render({});
    await context.canvas.findByTestId('desktop-shell');
    await play(context, controlled);
  } finally {
    controlled.root.unmount();
  }
}

export function controlledPlay(
  play: ControlledBody,
): NonNullable<ShellStory['play']> {
  return (context) => runControlled(context, play);
}
