import {
  Button,
  FieldGroup,
  Sheet,
  Stack,
  Text,
  useState,
} from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

function nameField(setAnswer) {
  const field = jsx(
    FieldGroup.TextField,
    { title: 'Name', value: 'Initial', onChangeText: setAnswer },
    'field',
  );

  const section = jsx(FieldGroup.Section, { children: field }, 'section');

  return jsx(FieldGroup, { children: section }, 'fields');
}

function sheetContent(setAnswer) {
  return [
    nameField(setAnswer),
    jsx(
      Button,
      { label: 'Apply', onPress: () => setAnswer('Confirmed') },
      'apply',
    ),
  ];
}

// The Plugin owns its overlay's state; the App reports open changes.
function openChange(setOpen, setAnswer) {
  return (next) => {
    setOpen(next);

    if (!next) setAnswer('Dismissed');
  };
}

function editSheet(open, setOpen, setAnswer) {
  const onOpenChange = openChange(setOpen, setAnswer);

  const props = { open, label: 'Edit', onOpenChange };

  return jsxs(Sheet, { ...props, children: sheetContent(setAnswer) }, 'sheet');
}

function Page() {
  const [answer, setAnswer] = useState('Waiting');
  const [open, setOpen] = useState(false);

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: answer }, 'answer'),
      jsx(Button, { label: 'Open', onPress: () => setOpen(true) }, 'open'),
      editSheet(open, setOpen, setAnswer),
    ],
  });
}

export function register(argo) {
  argo.pages.register('/', Page);
}
