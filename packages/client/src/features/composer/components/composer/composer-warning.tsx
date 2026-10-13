import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';

interface WarningProps {
  numberOfLines?: number;
  children: string;
}
const warningTextProps = {
  role: 'secondary',
  className: 'min-w-0 flex-1 text-destructive',
} as const;
export function ComposerWarning(props: WarningProps): React.JSX.Element {
  return (
    <View role="alert" className="mx-4 mt-2 flex-row items-start gap-2">
      <Icon role="control" name="error" className="text-destructive" />
      <Text {...warningTextProps} numberOfLines={props.numberOfLines}>
        {props.children}
      </Text>
    </View>
  );
}
