import { Page, Button, Text, useState } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

function Harness({ argo }) {
  const [value, setValue] = useState('empty');

  return (
    <Page
      key="search"
      title="Harness"
      search={{ label: 'Search' }}
      value={value}
      onChangeText={setValue}
    >
      <Button label="Run fixture" onPress={runFixture(argo, setValue)} />
      <Text>{value}</Text>
    </Page>
  );
}

const runFixture = (argo, setValue) => async () => {
  const result = await argo.process.run(['fixture-cli']);

  setValue(result.stdout.trim());
};

export function register(argo) {
  argo.pages.register('/', () => jsx(Harness, { argo }));
}
