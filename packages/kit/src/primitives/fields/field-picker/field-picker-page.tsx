import { useEffect, useRef, useState, type ReactElement } from 'react';
import { matchingOptions, type FieldPickerProps } from './field-picker-model';
import { PageFrame } from './field-picker-page-frame';
import {
  PageFooter,
  PageSearch,
  PageStatus,
  pageStatus,
} from './field-picker-page-parts';
import { PageRows } from './field-picker-page-rows';

export type FieldPickerPageProps = FieldPickerProps & {
  // Called after a single choice, so the page it sits on can close.
  onClose?: () => void;
};

type PageState = FieldPickerPageProps & {
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
export function FieldPickerPage(props: PageState): ReactElement {
  const options = matchingOptions(props.options, props.query);
  const chosen = useClosesWhenSettled(props);

  return (
    <PageFrame search={searchOf(props)} footer={<PageFooter {...props} />}>
      <PageList {...props} options={options} onClose={chosen} />
    </PageFrame>
  );
}

/*
 * A single choice closes the page once no option is `pending`: a caller that is still applying the choice (an Agent
 * whose settings are on their way) marks it pending, and the page holds, showing the spinner, until it is done.
 */
function useClosesWhenSettled(props: PageState): () => void {
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
const settled = (chosen: boolean, props: PageState): boolean =>
  chosen && !props.options.some((option) => option.pending);

function searchOf(props: PageState): ReactElement | null {
  if (!props.searchable || props.searchInHeader) return null;

  return (
    <PageSearch
      title={props.title}
      value={props.query}
      onChange={props.onQueryChange}
    />
  );
}

function PageList(props: FieldPickerPageProps): ReactElement {
  return (
    <>
      <PageRows {...props} />
      <PageStatus {...pageStatus(props)} />
    </>
  );
}
