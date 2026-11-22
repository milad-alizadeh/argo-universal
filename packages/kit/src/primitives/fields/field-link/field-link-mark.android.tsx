import { Badge, BadgedBox, Box, Icon } from '@expo/ui/jetpack-compose';
import {
  alpha,
  background,
  clip,
  size,
  Shapes,
  semantics,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { leadingMarkPixels } from '../../../leading-mark';
import { useIconPixels } from '../../../symbols/icon-size';
import { rowGlyphSize } from '../../../symbols/row-glyph';
import { leadingSource } from '../field-row/field-row-leading-source.android';
import {
  markLabel,
  markOpacity,
  type Mark,
  useMarkColors,
} from './field-link-mark-colors';

type MarkProps = { mark: Mark };

export function FieldLinkMark({ mark }: MarkProps): ReactElement {
  if (!mark.status) return <UnbadgedMark mark={mark} />;

  return <BadgedMark mark={mark} />;
}

function UnbadgedMark({ mark }: MarkProps): ReactElement {
  return (
    <Box modifiers={markSemantics(mark)}>
      <MarkFace mark={mark} />
    </Box>
  );
}

function BadgedMark({ mark }: MarkProps): ReactElement {
  return (
    <BadgedBox modifiers={markSemantics(mark)}>
      <MarkFace mark={mark} />
      <MarkStatus mark={mark} />
    </BadgedBox>
  );
}

const markSemantics = (mark: Mark): ReturnType<typeof alpha>[] => [
  alpha(markOpacity(mark)),
  semantics({ contentDescription: markLabel(mark) }),
];

function MarkFace({ mark }: MarkProps): ReactElement {
  const color = useMarkColors(mark);
  const source = leadingSource(mark.icon);
  const glyph = useIconPixels(rowGlyphSize);

  const modifiers = markModifiers(mark, color.fill);

  return (
    <Box contentAlignment="center" modifiers={modifiers}>
      <MarkIcon source={source} glyph={glyph} tint={color.ink} />
    </Box>
  );
}

function markModifiers(
  mark: Mark,
  fill: ReturnType<typeof useMarkColors>['fill'],
): ReturnType<typeof size>[] {
  return [
    size(leadingMarkPixels, leadingMarkPixels),
    clip(Shapes.Circle),
    ...(mark.plain ? [] : [background(fill ?? 'transparent')]),
  ];
}

type IconProps = ComponentProps<typeof Icon>;

function MarkIcon({
  source,
  glyph,
  tint,
}: {
  source: IconProps['source'] | undefined;
  glyph: number;
  tint: IconProps['tint'];
}): ReactElement | null {
  return source ? <Icon source={source} size={glyph} tint={tint} /> : null;
}

function MarkStatus({ mark }: MarkProps): ReactElement | null {
  const { status } = useMarkColors(mark);

  return mark.status ? (
    <BadgedBox.Badge>
      <Badge containerColor={status} />
    </BadgedBox.Badge>
  ) : null;
}
