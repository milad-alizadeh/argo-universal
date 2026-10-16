import type { PendingElicitation } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { questionsRequest } from '../../../../../mocks/elicitation-questions';
import {
  configurationRequest,
  functionNameRequest,
  refactorRequest,
} from '../../../../../mocks/requests/elicitation-requests';
import { elicitationDetent } from './elicitation-detent';

const fourOptions = ['Header', 'Composer', 'Feed', 'Sidebar'].map((title) => ({
  const: title,
  title,
}));

const fourOptionRequest: PendingElicitation = {
  ...refactorRequest,
  requestedSchema: {
    properties: { part: { type: 'string', oneOf: fourOptions } },
    required: ['part'],
  },
};

describe('elicitationDetent', () => {
  it('opens a question of three options at the medium height', () => {
    expect(elicitationDetent(refactorRequest)).toBe('medium');
    expect(elicitationDetent(questionsRequest)).toBe('medium');
  });

  it('opens a question of more than three options large', () => {
    expect(elicitationDetent(fourOptionRequest)).toBe('large');
  });

  it('opens any form of fields large', () => {
    expect(elicitationDetent(configurationRequest)).toBe('large');
    expect(elicitationDetent(functionNameRequest)).toBe('large');
  });
});
