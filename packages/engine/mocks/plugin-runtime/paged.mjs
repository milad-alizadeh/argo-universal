import { Button, Stack, Text, useState } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

// A page whose More handler loads asynchronously, shows a longer list and then resolves, as a paged List's onLoadMore does.
const Page = () => {
  const [count, setCount] = useState(1);

  const more = async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    setCount((previous) => previous + 1);
  };

  return jsxs(Stack, {
    direction: 'column',
    children: [
      jsx(Text, { children: `rows ${count}` }),
      jsx(Button, { label: 'More', onPress: more }, 'more'),
    ],
  });
};

export function register(argo) {
  argo.pages.register('/', Page);
}
