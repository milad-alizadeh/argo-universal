import { useEffect, useState } from 'react';
import type { DrillProps } from './drill-props';

/*
 * Material's bottom sheet takes this long to rise. A page drawn before it has arrived would be laid out
 * under the sheet's own motion, which is the work standby is here to move out of the way.
 */
const sheetEnter = 300;

/*
 * Whether an eager drill's page should take its place in the sheet yet. Mounting a page is the work a push
 * used to do, and the moment after the sheet has finished opening is the one moment nothing else is
 * moving; a reader who presses the row before then is pushed the page as they always were.
 */
export function useStandby(mount: DrillProps['mount']): boolean {
  const [ready, setReady] = useState(false);
  const eager = mount === 'eager';

  useEffect(() => {
    if (!eager) return;

    const timer = setTimeout(() => setReady(true), sheetEnter);

    return (): void => clearTimeout(timer);
  }, [eager]);

  return eager && ready;
}
