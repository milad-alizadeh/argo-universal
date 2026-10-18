import { Button, Stack, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const invalid = jsx(
  'Row',
  { gap: 'invalid', children: jsx(Text, { children: 'Hidden' }) },
  'invalid',
);

function content(changed, setChanged) {
  return [
    jsx(
      Text,
      {
        children: changed ? 'After' : 'Before',
        accessibilityLabel: 'New optional prop',
      },
      'label',
    ),
    jsx(Button, { label: 'Change', onPress: () => setChanged(true) }, 'tap'),
    invalid,
  ];
}

function Page() {
  const [changed, setChanged] = useState(false);

  return jsxs(Stack, {
    direction: changed ? 'row' : 'column',
    children: content(changed, setChanged),
  });
}

export function register(argo) {
  argo.pages.register('/', Page);
  argo.slots.register('argo/project/details/v1', Page);
}
