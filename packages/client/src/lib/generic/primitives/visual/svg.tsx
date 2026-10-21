import type * as React from 'react';
import { useContext } from 'react';
import { Platform, Pressable, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { Text } from '#primitives/content/text';
import type { Tone } from '#primitives/content/text';
import { ListTileContext } from '../../list-context';
import type { KitProps } from '../kit-props';
import { useSvgDrawing } from './svg-budget';

export type SvgProps = KitProps<'Svg'>;

interface ArtworkProps {
  xml: string;
  label: string;
  color: React.ComponentProps<typeof SvgXml>['color'];
}

type AccessibilityProps = Pick<
  React.ComponentProps<typeof Pressable>,
  'accessibilityLabel' | 'accessibilityRole' | 'accessible' | 'onPress'
>;

// Server sanitizes the markup; native rendering resolves currentColor gradient stops to the tone.
export function Svg(props: SvgProps): React.JSX.Element {
  const { color } = useResolveClassNames(toneClass(props.tone));
  const frame = useArtworkFrame(artworkRatio(props));

  const draws = useSvgDrawing();

  return draws ? (
    svgPressable(props, color, frame)
  ) : (
    <Text role="secondary">{props.label}</Text>
  );
}

function svgPressable(
  props: SvgProps,
  color: ArtworkProps['color'],
  frame: ViewStyle,
): React.JSX.Element {
  return (
    <Pressable {...accessibilityProps(props)} style={frame}>
      {svgArtwork(props, color)}
    </Pressable>
  );
}

function svgArtwork(
  props: SvgProps,
  color: ArtworkProps['color'],
): React.JSX.Element {
  return (
    <SvgArtwork
      xml={nativeSvgXml(props.xml, color)}
      label={props.label}
      color={color}
    />
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

function accessibilityProps(props: SvgProps): AccessibilityProps {
  return {
    accessibilityLabel: props.label,
    accessibilityRole: props.onPress ? ('button' as const) : ('image' as const),
    accessible: true,
    onPress: props.onPress,
  } satisfies AccessibilityProps;
}

function nativeSvgXml(xml: string, color: ArtworkProps['color']): string {
  if (Platform.OS === 'web' || typeof color !== 'string') return xml;

  return xml.replaceAll(
    /(\bstop-?color\s*=\s*)(["'])currentColor\2/gi,
    (_match, attribute: string, quote: string) =>
      `${attribute}${quote}${color}${quote}`,
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

function artworkRatio(props: SvgProps): number {
  return props.aspectRatio ?? viewBoxRatio(props.xml) ?? 1;
}

function useArtworkFrame(ratio: number): ViewStyle {
  const tile = useContext(ListTileContext);

  return tile
    ? { width: '100%', height: '100%' }
    : { width: '100%', aspectRatio: ratio };
}
