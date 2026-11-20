import type { MaintainScrollAtEndOptions } from '@legendapp/list/react-native';

export type FeedEndMotion = MaintainScrollAtEndOptions;

// The Feed follows the viewport and Composer as well as the rows (#1811).
export const followEnd = {
  on: { layout: true, footerLayout: true, dataChange: true, itemLayout: true },
};
