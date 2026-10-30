import { Button, Stack, Text, useEffect, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const useSettled = () => {
  const [stage, setStage] = useState('cached');

  useEffect(() => {
    const settled = setTimeout(() => setStage('fetched'), 50);

    return () => clearTimeout(settled);
  }, []);

  return stage;
};

/*
 * A page that settles on its own after its first rows are drawn, as the Issue tracker does when the
 * fetched page replaces the cached one. Its More button stays the same node throughout.
 */
const Page = () => {
  const stage = useSettled();
  const [rows, setRows] = useState(30);
  const more = () => setRows((previous) => previous + 30);

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: `${stage} ${rows}` }),
      jsx(Button, { label: 'More', onPress: more }, 'more'),
    ],
  });
};

export function register(argo) {
  argo.pages.register('/', Page);
}
