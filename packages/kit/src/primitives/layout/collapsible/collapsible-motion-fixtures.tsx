import { type ReactElement, useLayoutEffect, useState } from 'react';
import { View, type ViewInstance } from 'react-native';
import { Text } from '#primitives/content/text';

// When content takes its final height: in the commit that mounts it, as a placeholder gives way, or a frame later, as a Plugin's tree arrives.
export type Settles = 'on-mount' | 'next-frame';

const settleNow =
  (height: number) =>
  (view: ViewInstance | null): void => {
    if (view instanceof HTMLElement) view.style.height = `${height}px`;
  };

function useSettledNextFrame(): boolean {
  const [settled, setSettled] = useState(false);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));

    return (): void => cancelAnimationFrame(frame);
  }, []);

  return settled;
}

// Content that first lays out at `first` points tall and then at `last`, the way a body whose children load as it mounts does.
export function SettlingContent(props: {
  first: number;
  last: number;
  settles: Settles;
}): ReactElement {
  const settled = useSettledNextFrame();
  const onMount = props.settles === 'on-mount' ? settleNow(props.last) : null;

  return (
    <View ref={onMount} style={{ height: settled ? props.last : props.first }}>
      <Text>Tool call detail</Text>
    </View>
  );
}
