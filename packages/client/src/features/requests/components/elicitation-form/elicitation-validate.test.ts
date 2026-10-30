import type { PendingElicitation } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  createElicitationSchema,
  type ElicitationValues,
} from './elicitation-schema';

type Properties = PendingElicitation['requestedSchema']['properties'];

const formOf = (
  properties: Properties,
  required: string[] = [],
): PendingElicitation['requestedSchema'] => ({ properties, required });

function messages(
  schema: PendingElicitation['requestedSchema'],
  values: ElicitationValues,
): Record<string, string> | undefined {
  const form = createElicitationSchema(schema);

  return form.validate({ value: form.defaultValues(values) })?.fields;
}

const port = formOf(
  { port: { type: 'integer', title: 'Port', minimum: 1024, maximum: 65535 } },
  ['port'],
);

const dates = formOf({
  day: { type: 'string', title: 'Day', format: 'date' },
  moment: { type: 'string', title: 'Moment', format: 'date-time' },
});

const choice = formOf({
  colour: {
    type: 'string',
    title: 'Colour',
    oneOf: [
      { const: 'blue', title: 'Blue' },
      { const: 'green', title: 'Green' },
    ],
  },
});

describe('an answer a form asks for', () => {
  it('is required when the form says so', () => {
    expect(messages(port, {})).toEqual({
      property0: 'This field is required.',
    });
  });

  it('counts an empty answer as given', () => {
    const name = formOf({ name: { type: 'string', title: 'Name' } }, ['name']);

    expect(messages(name, { name: '' })).toBeUndefined();
  });
});

describe('a number answer', () => {
  it('must be whole where the form asks for a whole one', () => {
    expect(messages(port, { port: '3.5' })).toEqual({
      property0: 'Enter a whole number.',
    });
  });

  it('must sit between the bounds the form sets', () => {
    expect(messages(port, { port: '80' })).toEqual({
      property0: 'Enter a whole number from 1024 to 65535.',
    });
  });

  it('passes between those bounds', () => {
    expect(messages(port, { port: '8080' })).toBeUndefined();
  });
});

describe('a date answer', () => {
  it('names a day the calendar has not', () => {
    expect(messages(dates, { day: '2026-02-30' })).toEqual({
      property0: 'Enter a valid date.',
    });
  });

  it('takes a leap day', () => {
    expect(messages(dates, { day: '2024-02-29' })).toBeUndefined();
  });

  it('wants a time of day beside the date', () => {
    expect(messages(dates, { moment: '2026-10-06' })).toEqual({
      property1: 'Enter a valid date and time.',
    });
  });

  it('takes an instant', () => {
    expect(
      messages(dates, { moment: '2026-10-06T12:30:00.000Z' }),
    ).toBeUndefined();
  });
});

describe('a choice answer', () => {
  it('must be one the form offers', () => {
    expect(messages(choice, { colour: 'purple' })).toEqual({
      property0: 'Choose an available option.',
    });
  });

  it('passes when it is', () => {
    expect(messages(choice, { colour: 'green' })).toBeUndefined();
  });
});

describe('an answer measured against a bound', () => {
  const note = formOf({
    note: { type: 'string', title: 'Note', minLength: 4, maxLength: 8 },
  });

  it('is too short', () => {
    expect(messages(note, { note: 'hi' })).toEqual({
      property0: 'Enter 4 characters or more.',
    });
  });

  it('is too long', () => {
    expect(messages(note, { note: 'far too long' })).toEqual({
      property0: 'Enter 8 characters or fewer.',
    });
  });

  // JSON Schema counts code points, so an emoji is one character, not the two it is stored as.
  it('counts a character stored as a pair once', () => {
    const short = formOf({
      note: { type: 'string', title: 'Note', maxLength: 4 },
    });

    expect(messages(short, { note: 'ab\u{1F600}d' })).toBeUndefined();
  });

  it('wants more of the options it offers', () => {
    const picks = formOf({
      picks: {
        type: 'array',
        title: 'Picks',
        minItems: 2,
        items: { type: 'string', enum: ['one', 'two'] },
      },
    });

    expect(messages(picks, { picks: ['one'] })).toEqual({
      property0: 'Choose 2 or more.',
    });
  });
});

describe('a form Argo cannot read', () => {
  it('is reported as the Agent sending an invalid one', () => {
    const broken = formOf({
      value: { type: 'string', title: 'Value', pattern: '[' },
    });

    expect(createElicitationSchema(broken).error).toBe(
      'The Agent provided an invalid form.',
    );
  });
});
