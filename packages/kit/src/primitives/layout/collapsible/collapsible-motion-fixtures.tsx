import { type ReactElement, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';

// When content takes its final height: in the commit that mounts it, as a placeholder gives way, or a frame later, as a Plugin's tree arrives.
export type Settles = 'on-mount' | 'next-frame';

function useSettled(settles: Settles): boolean {
  const [settled, setSettled] = useState(false);
  useLayoutEffect(() => {
    if (settles === 'on-mount') return setSettled(true);
    const frame = requestAnimationFrame(() => setSettled(true));

    return () => cancelAnimationFrame(frame);
  }, [settles]);

  return settled;
}

// Content that first lays out at `first` points tall and then at `last`, the way a body whose children load as it mounts does.
export function SettlingContent(props: {
  first: number;
  last: number;
  settles: Settles;
}): ReactElement {
  const settled = useSettled(props.settles);

  return (
    <View style={{ height: settled ? props.last : props.first }}>
      <Text>Tool call detail</Text>
    </View>
  );
}
