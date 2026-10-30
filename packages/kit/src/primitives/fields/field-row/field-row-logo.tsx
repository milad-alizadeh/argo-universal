import { RNHostView } from '@expo/ui';
import type { ReactElement } from 'react';
import { AgentLogo } from '#primitives/content/agent-logo';
import { IconSlot } from '#primitives/content/icon';
import { rowGlyphSize } from '../../../symbols/row-glyph';

const hostedSlot = {
  collapsable: false,
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/*
 * A picker option's logo in a native row. Expo UI's SwiftUI Image and Compose Icon draw only SF Symbols, asset
 * names and Material XML, never SVG markup or a remote image, so the logo is hosted from React Native as the
 * monochrome AgentLogo, in the slot a row's leading glyph takes (row-glyph.ts).
 */
export function RowLogo(props: { logo: string; title: string }): ReactElement {
  return (
    <RNHostView matchContents>
      <IconSlot size={rowGlyphSize} {...hostedSlot}>
        <AgentLogo logo={props.logo} label={props.title} size={rowGlyphSize} />
      </IconSlot>
    </RNHostView>
  );
}
