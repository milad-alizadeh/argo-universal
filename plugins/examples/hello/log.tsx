import { Action, List, Screen, Text, useState } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

const initial = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}`);

function lineRow(line: string): JSX.Element {
  return <Text key={line}>{line}</Text>;
}

export function HelloLog(): JSX.Element {
  const [lines, setLines] = useState(initial);
  const append = (): void => setLines([...lines, `Line ${lines.length + 1}`]);
  const actions = <Action label="Append line" icon="add" onPress={append} />;

  return (
    <Screen title="Hello log" actions={actions}>
      <List anchor="end" items={lines} renderItem={lineRow} />
    </Screen>
  );
}
