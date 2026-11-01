import type { PendingElicitation } from '@repo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createElicitationSchema,
  type ElicitationValues,
} from './elicitation-schema';

const editOption = 'Edit specific text';

// The Elicitation Codex sent in #1553, as it arrived.
const codexSchema: PendingElicitation['requestedSchema'] = {
  type: 'object',
  properties: {
    change: {
      title: 'What would you like to change in sample.txt?',
      description: 'Change',
      type: 'string',
      oneOf: [
        { const: 'Replace contents (Recommended)', title: 'Replace contents' },
        { const: editOption, title: editOption },
        { const: 'None of the above', title: 'None of the above' },
      ],
    },
    change_note: { title: 'Additional answer or note', type: 'string' },
  },
  required: ['change'],
};

const refused = (): never => {
  throw new EvalError('Code generation from strings disallowed');
};

/*
 * The desktop window, whose Content Security Policy allows no `unsafe-eval`, and a Hermes release
 * build both refuse to turn a string into a function. No test environment refuses on its own, so
 * this stands in for that refusal while a form is read.
 */
function withoutCodeGeneration<Result>(body: () => Result): Result {
  vi.stubGlobal(
    'Function',
    new Proxy(Function, { construct: refused, apply: refused }),
  );

  return body();
}

type ElicitationForm = ReturnType<typeof createElicitationSchema>;

type FormErrors = ReturnType<ElicitationForm['validate']>;

const codexForm = (): ElicitationForm =>
  withoutCodeGeneration(() => createElicitationSchema(codexSchema));

const errorsFor = (values: ElicitationValues): FormErrors => {
  const form = codexForm();

  return form.validate({ value: form.defaultValues(values) });
};

afterEach(() => vi.unstubAllGlobals());

describe('a form read where code generation is unavailable', () => {
  it('is one Argo can check', () => {
    expect(codexForm().error).toBeUndefined();
  });

  it('passes the answers it asked for', () => {
    expect(
      errorsFor({ change: editOption, change_note: 'the second line' }),
    ).toBeUndefined();
  });

  it('asks for a required answer that is missing', () => {
    expect(errorsFor({})).toEqual({
      fields: { property0: 'This field is required.' },
    });
  });

  it('turns down an answer the form does not offer', () => {
    expect(errorsFor({ change: 'Rewrite it all' })).toEqual({
      fields: { property0: 'Choose an available option.' },
    });
  });
});

// The Elicitation Claude sends for AskUserQuestion: the choices, and an optional Other answer.
const askedQuestion: PendingElicitation['requestedSchema'] = {
  type: 'object',
  properties: {
    question_0: {
      title: 'Color',
      type: 'string',
      oneOf: [
        { const: 'Red', title: 'Red' },
        { const: 'Blue', title: 'Blue' },
      ],
    },
    question_0_custom: { title: 'Other', type: 'string' },
  },
};

describe('a form whose every answer is optional', () => {
  const form = createElicitationSchema(askedQuestion);
  const validate = (values: ElicitationValues): FormErrors =>
    form.validate({ value: form.defaultValues(values) });

  it('cannot be submitted with nothing answered', () => {
    expect(validate({})?.form).toBe('Answer at least one to submit.');
  });

  it('counts blank text as nothing answered', () => {
    expect(validate({ question_0_custom: '  ' })?.form).toBeDefined();
  });

  it.each([
    ['a choice', { question_0: 'Red' }],
    ['an Other answer', { question_0_custom: 'Green' }],
  ])('can be submitted once %s is given', (_name, values) => {
    expect(validate(values)).toBeUndefined();
  });

  it('does not demand an answer when a field is required', () => {
    const required = createElicitationSchema({
      ...askedQuestion,
      required: ['question_0_custom'],
    });

    expect(
      required.validate({ value: required.defaultValues({}) })?.form,
    ).toBeUndefined();
  });
});

describe('a form with nothing to answer', () => {
  it('can be submitted', () => {
    const form = createElicitationSchema({ type: 'object', properties: {} });

    expect(form.validate({ value: form.defaultValues({}) })).toBeUndefined();
  });
});
