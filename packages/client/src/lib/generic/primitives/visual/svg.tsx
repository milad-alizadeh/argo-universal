import type * as React from 'react';
import { Pressable } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { Text } from '#primitives/content/text';
import type { Tone } from '#primitives/content/text';

export interface SvgProps {
  xml: string;
  label: string;
  tone?: Tone;
  aspectRatio?: number;
  onPress?: () => void;
}

interface ArtworkProps {
  xml: string;
  label: string;
  color: React.ComponentProps<typeof SvgXml>['color'];
}

// Plugin SVG is already sanitized by the Server. The App only draws its canonical markup.
export function Svg(props: SvgProps): React.JSX.Element {
  const { color } = useResolveClassNames(toneClass(props.tone));
  const ratio = props.aspectRatio ?? viewBoxRatio(props.xml) ?? 1;

  return (
    <Pressable
      accessibilityLabel={props.label}
      accessibilityRole={accessibilityRole(props.onPress)}
      accessible
      onPress={props.onPress}
      style={{ width: '100%', aspectRatio: ratio }}
    >
      <SvgArtwork xml={props.xml} label={props.label} color={color} />
    </Pressable>
  );
}

function SvgArtwork({ xml, label, color }: ArtworkProps): React.JSX.Element {
  return (
    <SvgXml
      accessible={false}
      xml={xml}
      width="100%"
      height="100%"
      color={color}
      fallback={<Text role="body">{label}</Text>}
      onError={() => {}}
    />
  );
}

function accessibilityRole(onPress: SvgProps['onPress']): 'button' | 'image' {
  return onPress ? 'button' : 'image';
}

function toneClass(tone: Tone | undefined): string {
  const classes = {
    neutral: 'text-foreground',
    muted: 'text-muted-foreground',
    accent: 'text-accent',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    done: 'text-done',
  } satisfies Record<Tone, string>;

  return classes[tone ?? 'neutral'];
}

function viewBoxRatio(xml: string): number | null {
  const viewBox = /<svg\b[^>]*\bview-?box\s*=\s*["']([^"']+)["']/i.exec(
    xml,
  )?.[1];

  if (!viewBox) return null;

  const values = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  return dimensionsRatio(values[2], values[3]);
}

function dimensionsRatio(
  width: number | undefined,
  height: number | undefined,
): number | null {
  if (!isDimension(width)) return null;

  if (!isDimension(height)) return null;

  return finiteRatio(width / height);
}

function finiteRatio(ratio: number): number | null {
  if (Number.isFinite(ratio)) return ratio;

  return null;
}

function isDimension(value: number | undefined): value is number {
  return value !== undefined && value !== 0;
}
