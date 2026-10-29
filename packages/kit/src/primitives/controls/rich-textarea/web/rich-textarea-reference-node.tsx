import {
  DecoratorNode,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import type * as React from 'react';
import { createContext, useContext } from 'react';

// Draws a token; the view supplies it, so the node and the Markdown that registers it stay free of native imports.
export const ReferenceTokenContext = createContext<
  (number: number) => React.JSX.Element | null
>(() => null);

function ReferenceSlot({
  number,
}: {
  number: number;
}): React.JSX.Element | null {
  return useContext(ReferenceTokenContext)(number);
}

type SerializedReferenceNode = Spread<
  { number: number },
  SerializedLexicalNode
>;

/*
 * An Issue or pull request reference, drawn as a token and written as `#123` (ADR-0023). Its title
 * and state come from the references the editor is given, so the draft stores only the number.
 */
export class ReferenceNode extends DecoratorNode<React.JSX.Element> {
  __number: number;

  static override getType(): string {
    return 'reference';
  }

  static override clone(node: ReferenceNode): ReferenceNode {
    return new ReferenceNode(node.__number, node.__key);
  }

  static override importJSON({
    number,
  }: SerializedReferenceNode): ReferenceNode {
    return $createReferenceNode(number);
  }

  constructor(number: number, key?: string) {
    super(key);
    this.__number = number;
  }

  override exportJSON(): SerializedReferenceNode {
    return { type: 'reference', version: 1, number: this.__number };
  }

  override createDOM(): HTMLElement {
    return document.createElement('span');
  }

  override updateDOM(): boolean {
    return false;
  }

  override isInline(): boolean {
    return true;
  }

  override getTextContent(): string {
    return `#${this.__number}`;
  }

  override decorate(): React.JSX.Element {
    return <ReferenceSlot number={this.__number} />;
  }
}

export function $createReferenceNode(number: number): ReferenceNode {
  return new ReferenceNode(number);
}
