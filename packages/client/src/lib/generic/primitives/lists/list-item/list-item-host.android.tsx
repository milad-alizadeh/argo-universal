import { type ReactNode, useContext } from 'react';
import { View } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import { FieldRowEnd } from '../../fields/field-layout';
import { Host } from '../../native/host';

// Material's grouped rows stand 1dp apart, as FieldSection spaces them.
const rowGap = 1;

// A phone row in a native Host of its own, for a virtualised list; Material's row draws its own tile, so it needs nothing more; a wide window draws the row in React Native.
export function ListItemHost({ children }: { children: ReactNode }): ReactNode {
  const last = useContext(FieldRowEnd);
  if (useWide()) return children;
  return (
    <View style={last === false ? { paddingBottom: rowGap } : undefined}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        {children}
      </Host>
    </View>
  );
}
