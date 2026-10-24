import { Action, Screen, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const searchPage = (value, onChangeText) => ({
  title: 'Inputs',
  search: { label: 'Search inputs' },
  value,
  onChangeText,
});

const addInput = (setAdded) =>
  jsx(
    Action,
    {
      label: 'Add input',
      icon: 'add',
      onPress: () => setAdded((count) => count + 1),
    },
    'add',
  );

const content = (setSelection, heard) => [
  jsx('List.Section', { onSelectionChange: setSelection }, 'list'),
  jsx(Text, { children: heard }, 'heard'),
];

const Inputs = () => {
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState([]);
  const [added, setAdded] = useState(0);
  const heard = JSON.stringify({ search, selection, added });

  const children = content(setSelection, heard);

  const primaryAction = addInput(setAdded);

  return jsxs(
    Screen,
    { ...searchPage(search, setSearch), primaryAction, children },
    'page',
  );
};

export function register(argo) {
  argo.pages.register('/', Inputs);
}
