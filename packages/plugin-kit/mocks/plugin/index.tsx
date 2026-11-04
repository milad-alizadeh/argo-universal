import { Button, Screen, Text, type Argo, type PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

type HarnessState = { value: string; ran: boolean };

// What the page shows: the search's text, or the fixture CLI's answer once Run fixture asked for it.
async function shown(
  argo: Argo,
  { value, ran }: HarnessState,
): Promise<string> {
  if (!ran) return value;

  return (await argo.process.run(['fixture-cli'])).stdout.trim();
}

const harness = (text: string, to: PageTo<HarnessState>): JSX.Element => (
  <Screen
    key="search"
    title="Harness"
    search={{ label: 'Search' }}
    value={text}
    onChangeText={to.bind('value')}
  >
    <Button label="Run fixture" onPress={to.set({ ran: true })} />
    <Text>{text}</Text>
  </Screen>
);

export function register(argo: Argo): void {
  argo.pages.define('/', {
    state: { value: 'empty', ran: false },
    load: ({ state }) => shown(argo, state),
    render: harness,
  });
}
