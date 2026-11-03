import type { ColorValue } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { FieldGroupKitProps } from '../../kit-props';

export type Mark = NonNullable<
  FieldGroupKitProps<'FieldGroup.Link'>['leadingMark']
>;

const colors = {
  neutral: ['bg-tone-neutral-100', 'text-tone-neutral-700'],
  info: ['bg-tone-info-100', 'text-tone-info-700'],
  done: ['bg-tone-done-100', 'text-tone-done-700'],
  warning: ['bg-tone-warning-100', 'text-tone-warning-700'],
  success: ['bg-tone-success-100', 'text-tone-success-700'],
  danger: ['bg-tone-neutral-100', 'text-danger'],
} as const;

type MarkColors = {
  fill: ColorValue | undefined;
  ink: ColorValue | undefined;
  status: ColorValue | undefined;
};

export function useMarkColors(mark: Mark): MarkColors {
  const fill = useResolveClassNames(colors[mark.tone][0]).backgroundColor;

  const ink = useResolveClassNames(colors[mark.tone][1]).color;

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
