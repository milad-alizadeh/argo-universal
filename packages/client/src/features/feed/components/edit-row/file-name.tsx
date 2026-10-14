import type * as React from 'react';
import { Platform, type TextStyle } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';

const fileNameClassName =
  'select-none min-w-0 shrink web:underline web:decoration-ring web:underline-offset-2';

function useNativeUnderline(): TextStyle | undefined {
  const underlineColor = useCSSVariable('--color-ring');

  return Platform.select({
    native: {
      textDecorationLine: 'underline',
      textDecorationColor: String(underlineColor),
    },
  });
}

interface FileNameProps {
  path: string;
  className?: string;
}

export function FileName(props: FileNameProps): React.JSX.Element {
  return (
    <Text
      selectable={false}
      numberOfLines={1}
      style={useNativeUnderline()}
      role="code"
      className={cn(fileNameClassName, props.className)}
    >
      {props.path.split('/').at(-1)}
    </Text>
  );
}
