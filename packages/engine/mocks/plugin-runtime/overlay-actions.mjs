import { Button, Stack, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const unsafeSvg = {
  type: 'Svg',
  key: 'unsafe',
  props: { xml: '<svg><script>unsafe()</script></svg>', label: 'Unsafe' },
  children: [],
  slots: {},
};

function field(setAnswer) {
  return {
    type: 'TextInput',
    key: 'field',
    props: {
      label: 'Name',
      value: 'Initial',
      onChangeText: (value) => setAnswer(value),
    },
    children: [],
    slots: {},
  };
}

function content(setAnswer) {
  return {
    type: 'Stack',
    key: 'content',
    props: { direction: 'column' },
    slots: {},
    children: [unsafeSvg, field(setAnswer)],
  };
}

function openButton(setAnswer) {
  const action = {
    action: 'dialog',
    title: 'Edit',
    onConfirm: () => setAnswer('Confirmed'),
    onDismiss: () => setAnswer('Dismissed'),
    content: content(setAnswer),
  };

  return jsx(Button, { label: 'Open', onPress: action }, 'open');
}

function Page() {
  const [answer, setAnswer] = useState('Waiting');

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: answer }, 'answer'),
      openButton(setAnswer),
    ],
  });
}

export function register(argo) {
  argo.pages.register('/', Page);
}
