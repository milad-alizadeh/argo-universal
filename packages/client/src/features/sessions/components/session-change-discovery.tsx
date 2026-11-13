import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { type DiscoveryResult, discoveryMessage } from './change-discovery';

export interface SessionChangeDiscoveryProps {
  /*
   * Looks for the pull requests of the Session's branch and attaches them. Answers what it found, or nothing when the
   * Operation itself was refused, which the App toasts.
   */
  onDiscover: () => Promise<DiscoveryResult | undefined>;
}

interface Looking {
  pending: boolean;
  result?: DiscoveryResult;
}

interface Discovery {
  state: Looking;
  find: () => void;
}

function useDiscovery({ onDiscover }: SessionChangeDiscoveryProps): Discovery {
  const [state, setState] = useState<Looking>({ pending: false });

  const find = async (): Promise<void> => {
    setState({ pending: true });
    setState({ pending: false, result: await onDiscover() });
  };

  return { state, find: () => void find() };
}

const labelOf = (pending: boolean): string =>
  pending ? 'Finding pull requests…' : 'Find pull requests';

const toneOf = ({ result }: DiscoveryResult): 'warning' | 'muted' =>
  result === 'unavailable' ? 'warning' : 'muted';

function Answer({ result }: Pick<Looking, 'result'>): ReactElement | null {
  if (!result) return null;

  return (
    <Text role="secondary" tone={toneOf(result)} accessibilityRole="alert">
      {discoveryMessage(result)}
    </Text>
  );
}

function FindButton({ state, find }: Discovery): ReactElement {
  return (
    <Button
      size="sm"
      label={labelOf(state.pending)}
      disabled={state.pending}
      onPress={find}
    />
  );
}

// Provisional (the owner reviews it in Storybook): a "Find pull requests" button, a pending label and the answer in words.
export function SessionChangeDiscovery(
  props: SessionChangeDiscoveryProps,
): ReactElement {
  const discovery = useDiscovery(props);

  return (
    <View className="gap-2 px-3 py-2">
      <FindButton {...discovery} />
      <Answer result={discovery.state.result} />
    </View>
  );
}
