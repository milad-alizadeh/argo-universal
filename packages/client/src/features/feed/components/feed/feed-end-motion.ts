import type { MaintainScrollAtEndOptions } from '@legendapp/list/react-native';
import type { FeedRowData } from './feed-row-data';

export type FeedEndMotion = MaintainScrollAtEndOptions;

export interface FeedTail {
  items: FeedRowData[];
  turnRunning: boolean;
}

// The Feed follows the viewport and Composer as well as the rows (#1811).
export const followEnd = {
  on: { layout: true, footerLayout: true, dataChange: true, itemLayout: true },
};
