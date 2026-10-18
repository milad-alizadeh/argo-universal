import { SplitButton, Switch, Text, Stack, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const refuse = async () => {
  throw new Error('Secondary refused');
};

function secondaryActions(setResult) {
  return [
    { label: 'First', onPress: () => setResult('First') },
    { label: 'Second', onPress: () => setResult('Second') },
    { label: 'Refuse', onPress: refuse },
  ];
}

function runButton(setResult) {
  return jsx(
    SplitButton,
    {
      label: 'Run',
      menuLabel: 'Other runs',
      actions: secondaryActions(setResult),
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
