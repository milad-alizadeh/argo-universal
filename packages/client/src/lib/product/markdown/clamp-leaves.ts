import type * as React from 'react';
import { createContext, useCallback, useContext } from 'react';
import type { View } from 'react-native';
import {
  type TextRole,
  useTextStyle,
} from '#lib/generic/primitives/display/text/text';

type MeasurableNode = Pick<React.ComponentRef<typeof View>, 'measureLayout'>;

// A drawn piece of markdown a clamp may cut below; text also gives its line height.
export interface ClampLeaf {
  node: MeasurableNode;
  lineHeight?: number;
}

type RegisterLeaf = (leaf: ClampLeaf) => () => void;

// Supplied by a clamped message, so its markdown reports where each line and block ends.
export const ClampLeaves = createContext<RegisterLeaf | undefined>(undefined);

// The web resolves a line height as a pixel string, native as a number.
export function useLineHeight(role: TextRole): number | undefined {
  const lineHeight = Number.parseFloat(String(useTextStyle(role).lineHeight));
  return Number.isFinite(lineHeight) ? lineHeight : undefined;
}

export function useClampLeaf(
  lineHeight?: number,
): (node: MeasurableNode | null) => (() => void) | undefined {
  const register = useContext(ClampLeaves);
  return useCallback(
    (node: MeasurableNode | null) =>
      node && register ? register({ node, lineHeight }) : undefined,
    [register, lineHeight],
  );
}
