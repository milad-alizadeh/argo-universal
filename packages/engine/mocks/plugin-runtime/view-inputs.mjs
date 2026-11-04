import { Action, Screen, Text } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const searchPage = (value, to) => ({
  title: 'Inputs',
  search: { label: 'Search inputs' },
  value,
  onChangeText: to.bind('search'),
});

const addInput = (added, to) =>
  jsx(
    Action,
    { label: 'Add input', icon: 'add', onPress: to.set({ added: added + 1 }) },
    'add',
  );

const content = (to, heard) => [
  jsx('List.Section', { onSelectionChange: to.bind('selection') }, 'list'),
  jsx(Text, { children: heard }, 'heard'),
];

// The search, the selection and the count are Page state, so each address draws its own.
const inputs = (state, to) => {
  const heard = JSON.stringify(state);

  return jsxs(
    Screen,
    {
      ...searchPage(state.search, to),
      primaryAction: addInput(state.added, to),
      children: content(to, heard),
    },
    'page',
  );
};

export function register(argo) {
  argo.pages.define('/', {
    state: { search: '', selection: [], added: 0 },
    load: ({ state }) => state,
    render: inputs,
  });
}
