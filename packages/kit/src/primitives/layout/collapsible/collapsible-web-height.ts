import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type RefCallback,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { LayoutChangeEvent } from 'react-native';

export type Region = RefObject<HTMLDivElement | null>;

type SetHeight = Dispatch<SetStateAction<number | undefined>>;

interface Measurement {
  region: Region;
  mounted: boolean;
  setHeight: SetHeight;
  // Content open from the start that has no height yet: it draws at its own for now.
  unheld: boolean;
}

export interface HeightState {
  region: Region;
  height: number | undefined;
  measure: (event: LayoutChangeEvent) => void;
  attach: RefCallback<HTMLDivElement>;
}

const measuredBody = (region: Region): Element | null | undefined =>
  region.current?.firstElementChild?.firstElementChild;

const bodyHeight = (region: Region): number | undefined =>
  measuredBody(region)?.getBoundingClientRect().height;

const takeHeight = ({ region, setHeight }: Measurement): void =>
  setHeight(bodyHeight(region));

/*
 * Content that opens measures its new body here, the height it opens to. Content open from the start keeps its own
 * height for its first frame: what it draws in the commit that mounts it, such as a fitted List still at the window's
 * height, is not a height to hold it to. It takes a height a frame later, which a close animates from.
 */
function attachRegion(node: HTMLDivElement | null, options: Measurement): void {
  options.region.current = node;

  if (node && options.mounted) measureBody(options);
}

function measureBody(options: Measurement): void {
  if (options.unheld) requestAnimationFrame(() => takeHeight(options));
  else takeHeight(options);
}

function useRegionAttachment({
  region,
  mounted,
  setHeight,
  unheld,
}: Measurement): RefCallback<HTMLDivElement> {
  return useCallback(
    (node: HTMLDivElement | null): void =>
      attachRegion(node, { region, mounted, setHeight, unheld }),
    [region, mounted, setHeight, unheld],
  );
}

const measured =
  (setHeight: SetHeight) =>
  (event: LayoutChangeEvent): void =>
    setHeight(event.nativeEvent.layout.height);

// The height the content's box is held to; none while content open from the start draws at its own.
export function useHeight(mounted: boolean, initialOpen: boolean): HeightState {
  const region = useRef<HTMLDivElement>(null);

  const [height, setHeight] = useState<number | undefined>(
    initialOpen ? undefined : 0,
  );

  const unheld = height === undefined;
  const attach = useRegionAttachment({ region, mounted, setHeight, unheld });

  return { region, height, measure: measured(setHeight), attach };
}
