import type { ColorValue } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { toneDisc } from '../../../tone-mark';
import type { FieldLinkMarkData } from './field-link-props';

export type Mark = FieldLinkMarkData;

const danger = { fill: 'bg-tone-neutral-100', ink: 'text-danger' };

type MarkColors = {
  fill: ColorValue | undefined;
  ink: ColorValue | undefined;
  status: ColorValue | undefined;
};

export function useMarkColors(mark: Mark): MarkColors {
  const palette = mark.tone === 'danger' ? danger : toneDisc(mark.tone);
  const fill = useResolveClassNames(palette.fill).backgroundColor;

  const ink = useResolveClassNames(palette.ink).color;

  const status = useResolveClassNames(
    mark.status?.tone === 'warning' ? 'bg-warning' : 'bg-success',
  ).backgroundColor;

  return { fill, ink, status };
}

export const markLabel = (mark: Mark): string =>
  mark.status ? `${mark.label}, ${mark.status.label}` : mark.label;

const dimOpacity = 0.5;

export const markOpacity = (mark: Mark): number =>
  mark.dimmed ? dimOpacity : 1;
