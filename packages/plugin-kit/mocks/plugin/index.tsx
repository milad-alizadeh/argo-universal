import { Screen, Button, Text, useState, type Argo } from '@argo/plugin-kit';
import { jsx, type JSX } from '@argo/plugin-kit/jsx-runtime';

type SetValue = (value: string) => void;

function Harness({ argo }: { argo: Argo }): JSX.Element {
  const [value, setValue] = useState('empty');

  return (
    <Screen
      key="search"
      title="Harness"
      search={{ label: 'Search' }}
      value={value}
      onChangeText={setValue}
    >
      <Button label="Run fixture" onPress={runFixture(argo, setValue)} />
      <Text>{value}</Text>
    </Screen>
  );
}

const runFixture =
  (argo: Argo, setValue: SetValue): (() => Promise<void>) =>
  async () => {
    const result = await argo.process.run(['fixture-cli']);

    setValue(result.stdout.trim());
  };

export function register(argo: Argo): void {
  argo.pages.register('/', () => jsx(Harness, { argo }));
}
