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

// Plugin SVG is already sanitized by the Server. The App only draws its canonical markup.
export function Svg(props: SvgProps): React.JSX.Element {
  const { color } = useResolveClassNames(toneClass(props.tone));
  const ratio = props.aspectRatio ?? viewBoxRatio(props.xml) ?? 1;

  return (
    <Pressable
      accessibilityLabel={props.label}
      accessibilityRole={props.onPress ? 'button' : 'image'}
      accessible
      onPress={props.onPress}
      style={{ width: '100%', aspectRatio: ratio }}
    >
      <SvgXml
        accessible={false}
        xml={props.xml}
        width="100%"
        height="100%"
        color={color}
        fallback={<Text role="body">{props.label}</Text>}
        onError={() => {}}
      />
    </Pressable>
  );
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
  const viewBox = /<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i.exec(xml)?.[1];

  if (!viewBox) return null;
  const values = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const width = values[2];
  const height = values[3];

  return width && height && Number.isFinite(width / height)
    ? width / height
    : null;
}
