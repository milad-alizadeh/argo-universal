import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SessionFillProvider } from './session-fill';

// A Session column's height for a request that fills it, as SessionLayout gives one.
export function FilledSessionFrame({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [filled, setFilled] = useState(false);
  const fill = useMemo(() => ({ filled, setFilled }), [filled]);

  return (
    <SessionFillProvider value={fill}>
      <View className="h-160 justify-end">{children}</View>
    </SessionFillProvider>
  );
}
