import { expect, it } from 'vitest';
import { resourcesInText } from './rich-textarea-resources';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

const ticket = (id: string): ComposerSuggestion => ({
  id,
  label: id,
  insert: `${id} `,
  resource: { type: 'resource_link', name: id, uri: `example://ticket/${id}` },
});

it('keeps the resource of a chosen result whose text is still written', () => {
  expect(resourcesInText('Fix T-1 first', [ticket('T-1')])).toEqual([
    ticket('T-1').resource,
  ]);
});

it('drops the resource once its text is deleted', () => {
  expect(resourcesInText('Fix it first', [ticket('T-1')])).toEqual([]);
});

it('lists a resource once however often it was chosen', () => {
  expect(
    resourcesInText('T-1 and T-1', [ticket('T-1'), ticket('T-1')]),
  ).toHaveLength(1);
});

it('ignores a result without a resource', () => {
  expect(
    resourcesInText('/plan ', [
      { id: 'plan', label: '/plan', insert: '/plan ' },
    ]),
  ).toEqual([]);
});
