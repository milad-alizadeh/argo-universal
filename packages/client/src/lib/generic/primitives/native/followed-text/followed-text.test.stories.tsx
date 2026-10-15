import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { act, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { useFollowedText } from './followed-text';

type NativeText = Parameters<typeof useFollowedText>[0];

type Change = (value: string) => void;

// React runs the real hook; this adapter exposes its event handler to the native boundary fixture.
function Binding(props: {
  native: NativeText;
  value: string;
  onChange: Change;
  ready: (change: Change) => void;
}): null {
  const change = useFollowedText(props.native, props.value, props.onChange);
  useLayoutEffect(() => props.ready(change));

  return null;
}

const meta = { title: 'Tests/NativeTextSynchronization' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Scenario {
  initial: string;
  edits: string[];
  commits: { value: string; displayed: string }[];
  changes: string[][];
}

const partial = 'Native field chec';

const complete = 'Native field check';

export const DelayedEcho = follows({
  initial: '',
  edits: [partial, complete],
  commits: [
    { value: partial, displayed: complete },
    { value: complete, displayed: complete },
  ],
  changes: [[partial], [complete]],
});

export const ExternalReset = follows({
  initial: 'old',
  edits: ['draft'],
  commits: [{ value: '', displayed: '' }],
  changes: [['draft']],
});

function follows(scenario: Scenario): Story {
  return {
    render: () => <View testID="native-text-binding" />,
    play: async ({ canvas }) => {
      const root = createRoot(canvas.getByTestId('native-text-binding'));
      let nativeValue = scenario.initial;

      // Only Expo's native state is replaced: reads, writes and edit timing are controlled here.
      const native: NativeText = {
        get: () => nativeValue,
        set: (value: string) => {
          nativeValue = value;
        },
      };

      const onChange = fn();
      let change: Change = fn<Change>();

      const ready = (next: Change): void => {
        change = next;
      };

      const render = async (value: string): Promise<void> => {
        await act(async () =>
          root.render(<Binding {...{ native, value, onChange, ready }} />),
        );
      };

      try {
        await render(scenario.initial);

        for (const edit of scenario.edits) {
          nativeValue = edit;
          change(edit);
        }

        for (const commit of scenario.commits) {
          await render(commit.value);
          await expect(native.get()).toBe(commit.displayed);
        }

        await expect(onChange.mock.calls).toEqual(scenario.changes);
      } finally {
        await act(async () => root.unmount());
      }
    },
  };
}
