import {
  MenuOption,
  type TriggerFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { TextNode } from 'lexical';
import type { ReactNode } from 'react';

export class TypeaheadOption extends MenuOption {
  constructor(
    key: string,
    readonly display: { title: string; content: ReactNode; className: string },
    readonly insert: (node: TextNode | null) => void,
  ) {
    super(key);
  }
}

export interface TypeaheadAdapter {
  trigger: TriggerFn;
  options: (query: string) => TypeaheadOption[];
  // A source's promise has not settled, so the menu may yet have options for this query.
  pending?: (query: string) => boolean;
  // Hears when an answer arrives for the query last asked about.
  subscribe?: (listener: () => void) => () => void;
}

export class TypeaheadInteraction {
  private opened = false;
  private options = 0;
  open = (): void => {
    this.opened = true;
  };
  close = (): void => {
    this.opened = false;
  };
  // How many options the menu shows; one that waits for a late answer shows none.
  show = (options: number): void => {
    this.options = options;
  };
  isOpen = (): boolean => this.opened && this.options > 0;
}
