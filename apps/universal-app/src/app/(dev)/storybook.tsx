import StorybookUIRoot from '../../../.rnstorybook';

// Production bundles stub .rnstorybook out (metro.config.js), and the route renders nothing.
export default function StorybookRoute() {
  return __DEV__ ? <StorybookUIRoot /> : null;
}
