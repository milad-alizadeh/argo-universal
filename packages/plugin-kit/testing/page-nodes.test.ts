import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { findByText, findNode } from './page-nodes';

const node = (
  type: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key: type, props, children, slots: {} });

const page = node('Screen', { title: 'Sign in', caption: 'Jira Cloud' }, [
  node('FieldGroup.Section', { footer: 'This token wasn’t accepted.' }, [
    node('FieldGroup.SecretField', {
      title: 'API token',
      error: 'Paste a token with scopes.',
    }),
  ]),
  node('Callout', { title: 'Jira is busy', message: 'Try again in a minute.' }),
]);

it.each([
  ['caption', 'Jira Cloud', 'Screen'],
  ['footer', 'This token wasn’t accepted.', 'FieldGroup.Section'],
  ['error', 'Paste a token with scopes.', 'FieldGroup.SecretField'],
  ['message', 'Try again in a minute.', 'Callout'],
])('finds a node by the text in its %s', (_prop, text, type) => {
  expect(findByText(page, text)?.node.type).toBe(type);
});

it('names the props a text is read from when nothing matches', () => {
  expect(() => findNode(page, 'Signed in')).toThrow(/caption, footer, error/);
});
