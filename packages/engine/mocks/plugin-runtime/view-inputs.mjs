import { Stack, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const Page = () => {
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState([]);

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx('SearchField', { onChangeText: setSearch }, 'page'),
      jsx('List.Section', { onSelectionChange: setSelection }, 'list'),
      jsx(Text, { children: JSON.stringify({ search, selection }) }, 'heard'),
    ],
  });
};

export function register(argo) {
  argo.pages.register('/', Page);
}
