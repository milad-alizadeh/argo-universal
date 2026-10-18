import { Column, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const Page = () => {
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState([]);

  return jsxs(Column, {
    children: [
      jsx('Page', { onSearchTextChange: setSearch }, 'page'),
      jsx('List', { onSelectionChange: setSelection }, 'list'),
      jsx(Text, { children: JSON.stringify({ search, selection }) }, 'heard'),
    ],
  });
};

export function register(argo) {
  argo.pages.register('/', Page);
}
