import { describe, expect, it } from 'vitest';
import { kitComponent } from './kit';
import { supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

function node(
  type: string,
  props: Record<string, unknown> = {},
  slots: Record<string, WireNode[]> = {},
): WireNode {
  return { type, key: type, props, children: [], slots };
}

const screen = (slots: Record<string, WireNode[]>): WireNode =>
  node('Screen', { title: 'Page' }, slots);

const textArea = node('TextArea', {
  label: 'Message',
  value: '',
  onChangeText: { $event: 'onChangeText' },
});

describe("a Screen's frame", () => {
  it('takes Metadata as its aside', () => {
    expect(supportsWireNode(screen({ aside: [node('Metadata')] }))).toBe(true);
  });

  it('takes nothing else as its aside', () => {
    expect(supportsWireNode(screen({ aside: [node('List')] }))).toBe(false);
  });

  it('pins a message field in its footer', () => {
    expect(supportsWireNode(screen({ footer: [textArea] }))).toBe(true);
  });

  it('runs content to its edges', () => {
    const props = { title: 'Map', width: 'bleed' };

    expect(kitComponent('Screen')?.props.parse(props)).toEqual(props);
  });
});

describe('a Detail', () => {
  it('no longer holds Metadata itself', () => {
    const detail = node('Detail', {}, { metadata: [node('Metadata')] });

    expect(supportsWireNode(detail)).toBe(false);
  });
});

describe('a multi-line field', () => {
  it('sends with an IconButton beside it', () => {
    const field = {
      ...textArea,
      slots: { action: [node('IconButton', { icon: 'arrow-up', accessibilityLabel: 'Send' })] },
    };

    expect(supportsWireNode(field)).toBe(true);
  });
});

describe('loading and failure', () => {
  it.each(['Spinner', 'Callout'])('%s is on the wire', (type) => {
    expect(kitComponent(type)).toBeDefined();
  });
});
