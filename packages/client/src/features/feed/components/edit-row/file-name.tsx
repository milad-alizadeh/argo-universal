import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { Platform, type TextStyle } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { fileName } from '../../view/file-edit-label';

const fileNameClassName =
  'select-none min-w-0 shrink web:underline web:decoration-focus web:underline-offset-2';

function useNativeUnderline(): TextStyle | undefined {
  const underlineColor = useCSSVariable('--color-focus');

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
      {fileName(props.path)}
    </Text>
  );
}
