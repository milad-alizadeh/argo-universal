import { Circle, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  frame,
  foregroundStyle,
  opacity,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useResolveClassNames } from 'uniwind';
import { NativeSymbol } from '../../../symbols/native-symbol';
import {
  markLabel,
  markOpacity,
  type Mark,
  useMarkColors,
} from './field-link-mark-colors';

type MarkProps = { mark: Mark };

export function FieldLinkMark({ mark }: MarkProps): ReactElement {
  return (
    <ZStack
      alignment="topTrailing"
      modifiers={[
        accessibilityLabel(markLabel(mark)),
        opacity(markOpacity(mark)),
      ]}
    >
      <MarkFace mark={mark} />
      <MarkStatus mark={mark} />
    </ZStack>
  );
}

function MarkFace({ mark }: MarkProps): ReactElement {
  const { fill, ink } = useMarkColors(mark);
  const size = Number(useResolveClassNames('size-9 wide-type:size-7').width);

  return (
    <ZStack>
      <MarkDisc mark={mark} fill={String(fill ?? 'clear')} size={size} />
      <NativeSymbol name={mark.icon} size="sm" color={ink} />
    </ZStack>
  );
}

function MarkDisc(
  props: MarkProps & { fill: string; size: number },
): ReactElement | null {
  if (props.mark.plain) return null;

  return (
    <Circle
      modifiers={[
        frame({ width: props.size, height: props.size }),
        foregroundStyle(props.fill),
      ]}
    />
  );
}

function MarkStatus({ mark }: MarkProps): ReactElement | null {
  const { status } = useMarkColors(mark);
  const size = Number(useResolveClassNames('size-2').width);

  return mark.status ? (
    <Circle
      modifiers={[
        frame({ width: size, height: size }),
        foregroundStyle(String(status ?? 'clear')),
      ]}
    />
  ) : null;
}
