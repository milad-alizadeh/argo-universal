import { Button, Stack, Text, useEffect, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

// 'cached' until the fetched page lands, as the Issue tracker shows a cached page first.
const useFetchStage = () => {
  const [stage, setStage] = useState('cached');

  useEffect(() => {
    const fetched = setTimeout(() => setStage('fetched'), 50);

    return () => clearTimeout(fetched);
  }, []);

  return stage;
};

// Drawn only while the cached page is on screen, so settling takes it out of the tree.
const retryButton = (stage, retry) =>
  stage === 'cached'
    ? [jsx(Button, { label: 'Retry', onPress: retry }, 'retry')]
    : [];

/*
 * A page that settles on its own after its first rows are drawn. Its More button is the same node
 * throughout; its Retry button is gone once the page has settled.
 */
const Page = () => {
  const stage = useFetchStage();
  const [rows, setRows] = useState(30);
  const more = () => setRows((previous) => previous + 30);
  const retry = () => setRows(30);

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: `${stage} ${rows}` }),
      jsx(Button, { label: 'More', onPress: more }, 'more'),
      ...retryButton(stage, retry),
    ],
  });
};

export function register(argo) {
  argo.pages.register('/', Page);
}
