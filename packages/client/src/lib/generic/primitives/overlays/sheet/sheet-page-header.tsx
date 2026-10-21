import type { ReactElement } from 'react';
import { backLabel } from './sheet-page-label';
import type { SheetPageEntry, SheetStack } from './sheet-pages';
import { SheetTitleRow } from './sheet-title-row';

export interface SheetPageHeaderProps {
  page: SheetPageEntry;
  stack: SheetStack;
  // A root page with no title of its own draws no header; a pushed page always does, for its way back.
  hidden: boolean;
  root: boolean;
  // The sheet's own way out, which only the root page carries.
  onClose?: () => void;
}

// One title row for both the web's page stack and Android's sliding pages: Back names the page below it.
export function SheetPageHeader(
  props: SheetPageHeaderProps,
): ReactElement | null {
  if (props.hidden) return null;

  return (
    <SheetTitleRow
      title={props.page.title}
      action={props.page.action}
      backLabel={props.root ? undefined : backLabel(props.stack)}
      onBack={props.stack.navigation.back}
      onClose={props.onClose}
    />
  );
}
