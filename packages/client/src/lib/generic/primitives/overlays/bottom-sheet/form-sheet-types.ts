import type { ReactNode } from 'react';
import type { BottomSheetProps } from './bottom-sheet.types';

export type FormSheetProps = BottomSheetProps & { headerTitle?: string };

export type SheetPage = { title: string; content: ReactNode };

export type SheetState = {
  owner: string;
  props: FormSheetProps;
  page?: SheetPage;
};

export interface FormSheetRoutes {
  present: () => void;
  dismiss: () => void;
  push: () => void;
  back: () => void;
}

export interface SheetCommands {
  show: (owner: string, props: FormSheetProps) => void;
  update: (owner: string, props: FormSheetProps) => void;
  hide: (owner: string) => void;
  push: (page: SheetPage) => void;
  back: () => void;
  closed: () => void;
  canDismiss: () => boolean;
}

export type SheetOwner = {
  routes: FormSheetRoutes;
  read: () => SheetState | undefined;
  publish: (sheet?: SheetState) => void;
};
