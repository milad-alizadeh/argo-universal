import { Column, Button, Text, useState } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function Page({ argo }) {
  const [value, setValue] = useState('empty');

  return (
    <Column>
      {jsx('Page', { onSearchTextChange: setValue }, 'search')}
      <Button label="Run fixture" onPress={runFixture(argo, setValue)} />
      <Text>{value}</Text>
    </Column>
  );
}

const runFixture = (argo, setValue) => async () => {
  const result = await argo.process.run(['fixture-cli']);

  setValue(result.stdout.trim());
};

export function register(argo) {
  argo.pages.register('/', () => jsx(Page, { argo }));
}
