import {
  DecoratorNode,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import type * as React from 'react';
import { createContext, useContext } from 'react';

// Draws a token; the view supplies it, so the node and the Markdown that registers it stay free of native imports.
export const CommandTokenContext = createContext<
  (name: string, nodeKey: string) => React.JSX.Element | null
>(() => null);

function CommandSlot({
  name,
  nodeKey,
}: {
  name: string;
  nodeKey: string;
}): React.JSX.Element | null {
  return useContext(CommandTokenContext)(name, nodeKey);
}

type SerializedCommandNode = Spread<{ name: string }, SerializedLexicalNode>;

/*
 * A Slash command, drawn as a token and written as `/name` (ADR-0023). Its hint comes from the
 * suggestions the editor is given, so the draft stores only the name.
 */
export class CommandNode extends DecoratorNode<React.JSX.Element> {
  __name: string;

  static override getType(): string {
    return 'slash-command';
  }

  static override clone(node: CommandNode): CommandNode {
    return new CommandNode(node.__name, node.__key);
  }

  static override importJSON({ name }: SerializedCommandNode): CommandNode {
    return $createCommandNode(name);
  }

  constructor(name: string, key?: string) {
    super(key);
    this.__name = name;
  }

  override exportJSON(): SerializedCommandNode {
    return { type: 'slash-command', version: 1, name: this.__name };
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
    return `/${this.__name}`;
  }

  override decorate(): React.JSX.Element {
    return <CommandSlot name={this.__name} nodeKey={this.getKey()} />;
  }
}

export function $createCommandNode(name: string): CommandNode {
  return new CommandNode(name);
}

export function $isCommandNode(
  node: LexicalNode | null | undefined,
): node is CommandNode {
  return node instanceof CommandNode;
}
