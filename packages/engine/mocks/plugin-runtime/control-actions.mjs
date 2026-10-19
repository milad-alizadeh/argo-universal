import {
  Action,
  SplitButton,
  Switch,
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

function switchControl(setResult) {
  return jsx(
    Switch,
    {
      value: false,
      onValueChange: (value) => setResult(value ? 'Enabled' : 'Disabled'),
    },
    'switch',
  );
}

function Page() {
  const [result, setResult] = useState('Waiting');

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: result }, 'result'),
      runButton(setResult),
      switchControl(setResult),
    ],
  });
}

export function register(argo) {
  argo.pages.register('/', Page);
}
