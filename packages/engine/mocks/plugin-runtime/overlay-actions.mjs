import { Button, FieldGroup, Sheet, Stack, Text } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

function nameField(to) {
  const field = jsx(
    FieldGroup.TextField,
    {
      title: 'Name',
      value: 'Initial',
      onChangeText: to.set({ answer: to.payload() }),
    },
    'field',
  );

  const section = jsx(FieldGroup.Section, { children: field }, 'section');

  return jsx(FieldGroup, { children: section }, 'fields');
}

const sheetContent = (to) => [
  nameField(to),
  jsx(
    Button,
    { label: 'Apply', onPress: to.set({ answer: 'Confirmed', open: false }) },
    'apply',
  ),
];

// The overlay's open state is Page state: the App reports open changes into it.
function editSheet(open, to) {
  const props = {
    open,
    label: 'Edit',
    onOpenChange: to.set({ open: to.payload() }),
  };

  return jsxs(Sheet, { ...props, children: sheetContent(to) }, 'sheet');
}

// The answer the sheet set, a button that opens it, and the sheet.
const page = ({ answer, open }, to) =>
  jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: answer }, 'answer'),
      jsx(Button, { label: 'Open', onPress: to.set({ open: true }) }, 'open'),
      editSheet(open, to),
    ],
  });

export function register(argo) {
  argo.pages.define('/', {
    state: { answer: 'Waiting', open: false },
    load: ({ state }) => state,
    render: page,
  });
}
