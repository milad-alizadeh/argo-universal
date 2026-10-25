import { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { Spinner } from '#primitives/status/spinner';

interface Props {
  label: string;
  // A new source, such as a new scene or new series, retries a drawing that failed.
  source: unknown;
  children: ReactNode;
}

interface State {
  source?: unknown;
  failed: boolean;
}

export class CanvasBoundary extends Component<Props, State> {
  public override state: State = { failed: false };
  public static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }
  public static getDerivedStateFromProps(
    props: Props,
    state: State,
  ): Partial<State> | null {
    return props.source === state.source
      ? null
      : { source: props.source, failed: false };
  }
  public override render(): ReactNode {
    return this.state.failed ? (
      <CanvasFallback label={this.props.label} />
    ) : (
      this.props.children
    );
  }
}

const fallback = {
  className: 'flex-1 items-center justify-center gap-2',
  accessibilityRole: 'image',
} as const;

export function CanvasFallback({
  label,
  loading,
}: {
  label: string;
  loading?: boolean;
}): React.JSX.Element {
  return (
    <View {...fallback} accessibilityLabel={label}>
      {loading && <Spinner accessibilityLabel={`Loading ${label}`} />}
      <Text role="body">{loading ? `Loading ${label}…` : label}</Text>
    </View>
  );
}
