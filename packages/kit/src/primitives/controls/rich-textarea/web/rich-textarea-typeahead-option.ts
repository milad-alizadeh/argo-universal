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
}

export class TypeaheadInteraction {
  private opened = false;
  open = (): void => {
    this.opened = true;
  };
  close = (): void => {
    this.opened = false;
  };
  isOpen = (): boolean => this.opened;
}
