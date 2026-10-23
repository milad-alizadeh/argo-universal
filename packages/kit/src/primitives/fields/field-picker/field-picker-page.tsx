import type { ReactElement } from 'react';
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

  return (
    <PageFrame search={searchOf(props)} footer={<PageFooter {...props} />}>
      <PageList {...props} options={options} />
    </PageFrame>
  );
}

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
