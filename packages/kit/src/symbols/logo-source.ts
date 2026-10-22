import type * as React from 'react';
import type { SvgProps } from 'react-native-svg';
import githubMark from './assets/logos/brand-github.svg';

/*
 * A logo's SVG file, imported as a react-native-svg component: Metro's react-native-svg-transformer converts it for
 * the app and the desktop app, and vite-plugin-svgr for Storybook. Its fills are `currentColor`.
 */
export type LogoSvg = React.ComponentType<SvgProps>;

// A brand mark, drawn from its own SVG the same on every platform; native symbols and the SVG symbol components are for glyphs (ADR-0019, ADR-0041).
export interface LogoSource {
  svg: LogoSvg;
  // The brand's name, which the logo speaks when it stands alone.
  label: string;
}

export const logoSources = {
  github: { svg: githubMark, label: 'GitHub' },
} as const satisfies Record<string, LogoSource>;
