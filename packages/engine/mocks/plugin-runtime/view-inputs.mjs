import { Page, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const searchPage = (value, onChangeText) => ({
  title: 'Inputs',
  search: { label: 'Search inputs' },
  value,
  onChangeText,
});

const addInput = (setAdded) => ({
  label: 'Add input',
  icon: 'add',
  onPress: () => setAdded((count) => count + 1),
});

const content = (setSelection, heard) => [
  jsx('List', { onSelectionChange: setSelection }, 'list'),
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
    Page,
    { ...searchPage(search, setSearch), primaryAction, children },
    'page',
  );
};

export function register(argo) {
  argo.pages.register('/', Inputs);
}
