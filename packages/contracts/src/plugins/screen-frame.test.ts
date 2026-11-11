import { describe, expect, it } from 'vitest';
import { kitComponent } from './kit';
import { supportsWireNode } from './prepare-tree';
import type { WireJson, WireNode } from './wire';

function node(
  type: string,
  props: Record<string, WireJson> = {},
  slots: Record<string, WireNode[]> = {},
): WireNode {
  return { type, key: type, props, children: [], slots };
}

const screen = (slots: Record<string, WireNode[]>): WireNode =>
  node('Screen', { title: 'Page' }, slots);

const textArea = node('TextArea', {
  label: 'Message',
  value: '',
  onChangeText: { bind: 'draft' },
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
  it('takes its text and the value that binds it through the schema', () => {
    const props = kitComponent('TextArea')?.props;

    expect(props?.parse(textArea.props)).toEqual(textArea.props);
    expect(props?.safeParse({ ...textArea.props, value: 3 }).success).toBe(
      false,
    );
  });

  it('sends with an IconButton beside it', () => {
    const field = {
      ...textArea,
      slots: {
        action: [
          node('IconButton', {
            icon: 'arrow-up',
            accessibilityLabel: 'Send',
            onPress: { operation: 'send', args: {} },
          }),
        ],
      },
    };

    expect(supportsWireNode(field)).toBe(true);
  });

  it('takes no Screen inside its action', () => {
    const field = { ...textArea, slots: { action: [node('Screen')] } };

    expect(supportsWireNode(field)).toBe(false);
  });
});

describe('loading and failure', () => {
  const retry = node('Button', {
    label: 'Try again',
    onPress: { operation: 'retry', args: {} },
  });

  it('draws a Spinner named for its work', () => {
    const spinner = node('Spinner', { accessibilityLabel: 'Loading Issues' });

    expect(supportsWireNode(spinner)).toBe(true);
    expect(
      kitComponent('Spinner')?.props.safeParse({}).success,
      'a Spinner without a name is refused',
    ).toBe(false);
  });

  it('draws a danger Callout with a Button to try again', () => {
    const props = {
      tone: 'danger',
      title: 'Couldn’t load this Issue',
      description: 'The tracker did not answer.',
    };
    const callout = node('Callout', props, { actions: [retry] });

    expect(supportsWireNode(callout)).toBe(true);
    expect(kitComponent('Callout')?.props.parse(props)).toMatchObject(props);
    expect(
      supportsWireNode(node('Callout', props, { actions: [node('Screen')] })),
    ).toBe(false);
  });
});
