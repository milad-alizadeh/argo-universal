import { useEffect, useState, useCallback } from 'react';
import type { Text as NativeText } from 'react-native';
import { Text } from '#primitives/content/text';
import type {
  MeasuredTextProps,
  TextMeasurement,
} from './canvas-measured-text-props';

function measure(node: HTMLElement): TextMeasurement {
  const range = document.createRange();
  range.selectNodeContents(node);
  const rect = range.getBoundingClientRect();
  const line = Number.parseFloat(getComputedStyle(node).lineHeight);

  return {
    width: rect.width,
    height: rect.height,
    singleLine: rect.height <= line,
  };
}

function observe(
  node: HTMLElement,
  onMeasure: MeasuredTextProps['onMeasure'],
): () => void {
  const observer = new ResizeObserver(() => onMeasure(measure(node)));
  observer.observe(node);

  return () => observer.disconnect();
}

type TextRef = React.RefCallback<NativeText>;

function useTextNode(): [HTMLElement | null, TextRef] {
  const [node, setNode] = useState<HTMLElement | null>(null);

  const ref = useCallback<TextRef>(
    (element) => setNode(element instanceof HTMLElement ? element : null),
    [],
  );

  return [node, ref];
}

function textProps(
  props: MeasuredTextProps,
  ref: TextRef,
): React.ComponentProps<typeof Text> {
  return {
    role: 'body',
    accessible: false,
    'aria-hidden': true,
    ref,
    style: { color: props.color, opacity: props.visible ? 1 : 0 },
  };
}

export function MeasuredText(props: MeasuredTextProps): React.JSX.Element {
  const [node, ref] = useTextNode();
  useEffect(
    () => (node ? observe(node, props.onMeasure) : undefined),
    [node, props.onMeasure, props.text],
  );

  return <Text {...textProps(props, ref)}>{props.text}</Text>;
}
