import type * as React from 'react';
import StorybookUIRoot from '../../../.rnstorybook';

// Production bundles stub .rnstorybook out (metro.config.js), and the route renders nothing.
export default function StorybookRoute(): React.JSX.Element | null {
  return __DEV__ ? <StorybookUIRoot /> : null;
}
