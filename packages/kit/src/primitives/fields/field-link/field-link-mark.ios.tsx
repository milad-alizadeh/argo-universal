import { RNHostView } from '@expo/ui';
import { Circle, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  frame,
  foregroundStyle,
  opacity,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { leadingMarkPixels } from '../../../leading-mark';
import { iosImage } from '../../../symbols/ios-image';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { rowGlyphSize } from '../../../symbols/row-glyph';
import { ToneMark } from '../../../tone-mark';
import {
  markLabel,
  markOpacity,
  type Mark,
  useMarkColors,
} from './field-link-mark-colors';

type MarkProps = { mark: Mark };

const markFrame = frame({
  width: leadingMarkPixels,
  height: leadingMarkPixels,
});

export function FieldLinkMark({ mark }: MarkProps): ReactElement {
  return (
    <ZStack
      alignment="topTrailing"
      modifiers={[
        markFrame,
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
  return iosImage(mark.icon) ? (
    <SymbolFace mark={mark} />
  ) : (
    <HostedFace mark={mark} />
  );
}

// The native Button owns the press. The hosted SVG only draws the desktop glyph (ADR-0041).
function HostedFace({ mark }: MarkProps): ReactElement {
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ToneMark
          icon={mark.icon}
          tone={mark.tone}
          form={mark.plain ? 'bare' : 'disc'}
          disc="leading"
        />
      </View>
    </RNHostView>
  );
}

function SymbolFace({ mark }: MarkProps): ReactElement {
  const { fill, ink } = useMarkColors(mark);

  return (
    <ZStack>
      <MarkDisc mark={mark} fill={String(fill ?? 'clear')} />
      <NativeSymbol
        name={mark.icon}
        size={rowGlyphSize}
        lane="row"
        color={ink}
      />
    </ZStack>
  );
}

function MarkDisc(props: MarkProps & { fill: string }): ReactElement | null {
  if (props.mark.plain) return null;

  return <Circle modifiers={[markFrame, foregroundStyle(props.fill)]} />;
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
