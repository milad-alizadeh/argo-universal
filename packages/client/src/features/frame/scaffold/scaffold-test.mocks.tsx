import { PortalProvider } from '@repo/kit/primitives/overlays/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fn } from 'storybook/test';
import { ScaffoldMock } from './scaffold.mocks';

export const preservedDraft = 'Keep my draft';

/*
 * With the sidebar and the Inspector open on this window, the Session column
 * is narrower than 480 pixels, so it draws the phone layout. At 1440 the
 * column stays wide (Paper 4EV9).
 */
export const narrowDesktopWidth = 1180;

type MockProps = React.ComponentProps<typeof ScaffoldMock>;

export type InspectorState = NonNullable<MockProps['inspectorState']>;

export const scaffoldMeta = {
  component: ScaffoldMock,
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
    <View testID="controlled-scaffold" className="w-full" />
  ),
} satisfies Meta<typeof ScaffoldMock>;

export type ScaffoldStory = StoryObj<typeof scaffoldMeta>;

export type ScaffoldPlayContext = Parameters<
  NonNullable<ScaffoldStory['play']>
>[0];

export interface ControlledScaffold {
  root: ReturnType<typeof createRoot>;
  render: (props: Partial<MockProps>) => Promise<void>;
  onSectionChange: ReturnType<typeof fn>;
  onSidebarShownChange: ReturnType<typeof fn>;
  onInspectorStateChange: ReturnType<typeof fn>;
}

function CommittedScaffold({
  children,
  onCommit,
}: {
  children: React.ReactNode;
  onCommit: () => void;
}): React.ReactNode {
  useLayoutEffect(onCommit, [onCommit]);

  return children;
}

type Commit = () => void;

function scaffoldTree(props: MockProps, onCommit: Commit): React.JSX.Element {
  return (
    <CommittedScaffold onCommit={onCommit}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <PortalProvider>
            <View className="h-175 w-full">
              <ScaffoldMock {...props} />
            </View>
          </PortalProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </CommittedScaffold>
  );
}

function scaffoldSpies(): Omit<ControlledScaffold, 'root' | 'render'> {
  return {
    onSectionChange: fn(),
    onSidebarShownChange: fn(),
    onInspectorStateChange: fn(),
  };
}

function commitScaffold(
  root: ReturnType<typeof createRoot>,
  props: MockProps,
): Promise<void> {
  return new Promise<void>((resolve) =>
    root.render(scaffoldTree(props, resolve)),
  );
}

function mountScaffold(
  element: HTMLElement,
  initial: MockProps,
): ControlledScaffold {
  const root = createRoot(element);
  const spies = scaffoldSpies();
  let props = initial;

  const render = async (next: Partial<MockProps>): Promise<void> => {
    props = { ...props, ...next };
    await commitScaffold(root, { ...props, ...spies });
    await new Promise(requestAnimationFrame);
  };

  return { root, render, ...spies };
}

type ControlledBody = (
  context: ScaffoldPlayContext,
  controlled: ControlledScaffold,
) => Promise<void>;

async function runControlled(
  context: ScaffoldPlayContext,
  play: ControlledBody,
): Promise<void> {
  const element = context.canvas.getByTestId('controlled-scaffold');
  const controlled = mountScaffold(element, context.args);

  try {
    await controlled.render({});
    await context.canvas.findByTestId('wide-frame');
    await play(context, controlled);
  } finally {
    controlled.root.unmount();
  }
}

export function controlledPlay(
  play: ControlledBody,
): NonNullable<ScaffoldStory['play']> {
  return (context) => runControlled(context, play);
}
