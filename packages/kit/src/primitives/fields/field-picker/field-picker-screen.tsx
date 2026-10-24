import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useDrillBeside } from '#primitives/overlays/drill';
import { matchingOptions, type FieldPickerProps } from './field-picker-model';
import { ScreenFrame } from './field-picker-screen-frame';
import {
  ScreenFooter,
  ScreenSearch,
  ScreenStatus,
  screenStatus,
} from './field-picker-screen-parts';
import { ScreenRows } from './field-picker-screen-rows';

export type FieldPickerScreenProps = FieldPickerProps & {
  // Called after a single choice, so the page it sits on can close.
  onClose?: () => void;
};

type ScreenState = FieldPickerScreenProps & {
  query: string;
  onQueryChange: (query: string) => void;
  // A pushed page's header holds the search, so the page draws no field of its own.
  searchInHeader: boolean;
};

/*
 * The choices of a `page` presentation (ADR-0042), the same on every platform: the kit's shared search field when
 * `searchable`, the options in sections with a mark on the chosen ones, an empty state, and an action button in a
 * place of its own below. A single choice reports and closes; a `multiple` page stays open and reports each toggle.
 */
export function FieldPickerScreen(props: ScreenState): ReactElement {
  const options = matchingOptions(props.options, props.query);
  const chosen = useClosesWhenSettled(props);
  // A pushed page's header holds the action; a popover has none, so the action sits below the choices.
  const footer = useDrillBeside() ? <ScreenFooter {...props} /> : null;

  return (
    <ScreenFrame search={searchOf(props)} footer={footer}>
      <ScreenList {...props} options={options} onClose={chosen} />
    </ScreenFrame>
  );
}

/*
 * A single choice closes the page once no option is `pending`: a caller that is still applying the choice (an Agent
 * whose settings are on their way) marks it pending, and the page holds, showing the spinner, until it is done.
 */
function useClosesWhenSettled(props: ScreenState): () => void {
  const chosen = useRef(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!settled(chosen.current, props)) return;

    chosen.current = false;
    props.onClose?.();
  });

  return () => {
    chosen.current = true;
    rerender((count) => count + 1);
  };
}

// Chosen, and nothing is still being applied.
const settled = (chosen: boolean, props: ScreenState): boolean =>
  chosen && !props.options.some((option) => option.pending);

function searchOf(props: ScreenState): ReactElement | null {
  if (!props.searchable || props.searchInHeader) return null;

  return (
    <ScreenSearch
      title={props.title}
      value={props.query}
      onChange={props.onQueryChange}
    />
  );
}

function ScreenList(props: FieldPickerScreenProps): ReactElement {
  return (
    <>
      <ScreenRows {...props} />
      <ScreenStatus {...screenStatus(props)} />
    </>
  );
}
