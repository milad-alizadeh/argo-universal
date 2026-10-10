import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LoadError } from '#lib/product/load-error';

export type FirstSessionViewProps =
  | { state: 'loading' }
  | { state: 'load-failed'; onRetry: () => void }
  // The chosen Session or New Session, as a slot.
  | { state: 'chosen'; children: ReactNode };

// The wide window's `/`: blank while the Sessions load, then the chosen page.
export function FirstSessionView(props: FirstSessionViewProps): ReactNode {
  switch (props.state) {
    case 'loading':
      return <View className="flex-1 bg-background" />;
    case 'load-failed':
      return (
        <LoadError
          title="Couldn't load Sessions"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={props.onRetry}
        />
      );
    case 'chosen':
      return props.children;
  }
}
