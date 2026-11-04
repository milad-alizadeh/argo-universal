import { Action, SplitButton, Slider, Text, Stack } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const action = (key, label, onPress) =>
  jsx(Action, { label, icon: 'add', onPress }, key);

// The secondary menu's entries are keyed Action children, each with its own value.
const secondaryActions = (to) => [
  action('first', 'First', to.set({ result: 'First' })),
  action('second', 'Second', to.set({ result: 'Second' })),
  action('refuse', 'Refuse', to.run('refuse', { level: 1 })),
];

const runButton = (to) =>
  jsxs(
    SplitButton,
    {
      label: 'Run',
      menuLabel: 'Other runs',
      children: secondaryActions(to),
    },
    'run',
  );

const sliderControl = (level, to) =>
  jsx(
    Slider,
    {
      value: level,
      minimumValue: 0,
      maximumValue: 10,
      step: 1,
      accessibilityLabel: 'Level',
      valueLabel: 'Level',
      onValueChange: to.set({ level: to.payload() }),
    },
    'slider',
  );

// The last run's result above the controls that change it.
const controls = ({ result, level }, to) =>
  jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: result }, 'result'),
      runButton(to),
      sliderControl(level, to),
    ],
  });

export function register(argo) {
  argo.operations.register('refuse', async () => {
    throw new Error('Secondary refused');
  });
  argo.pages.define('/', {
    state: { result: 'Waiting', level: 0 },
    load: ({ state }) => state,
    render: controls,
  });
}
