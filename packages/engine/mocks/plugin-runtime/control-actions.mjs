import {
  Action,
  SplitButton,
  Slider,
  Text,
  Stack,
  useState,
} from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const refuse = async () => {
  throw new Error('Secondary refused');
};

const action = (key, label, onPress) =>
  jsx(Action, { label, icon: 'add', onPress }, key);

// The secondary menu's entries are keyed Action children.
function secondaryActions(setResult) {
  return [
    action('first', 'First', () => setResult('First')),
    action('second', 'Second', () => setResult('Second')),
    action('refuse', 'Refuse', refuse),
  ];
}

function runButton(setResult) {
  return jsxs(
    SplitButton,
    {
      label: 'Run',
      menuLabel: 'Other runs',
      children: secondaryActions(setResult),
    },
    'run',
  );
}

function sliderControl(setResult) {
  return jsx(
    Slider,
    {
      value: 0,
      min: 0,
      max: 10,
      step: 1,
      onValueChange: (value) => setResult(`Level ${value}`),
    },
    'slider',
  );
}

function Page() {
  const [result, setResult] = useState('Waiting');

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: result }, 'result'),
      runButton(setResult),
      sliderControl(setResult),
    ],
  });
}

export function register(argo) {
  argo.pages.register('/', Page);
}
