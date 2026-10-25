import { nativeRowKinds } from '../../../native-row-kinds';
import type { NativeKinds } from './list-phone-rows';
import { ListSection } from './list-section';

export const nativeKinds: NativeKinds = {
  section: ListSection,
  rows: nativeRowKinds,
};
