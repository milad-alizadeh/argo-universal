import { expect, it } from 'vitest';
import { rules as rules1 } from '#mocks/session-info-activity';
import { rules as rules0 } from '#mocks/session-info-requests';
import { rules as rules2 } from '#mocks/session-info-status';
import { toSessionInfo } from './session-info';

it.each([...rules0, ...rules1, ...rules2])(
  '$rule',
  ({ input, expected }): void => {
    const before = structuredClone(input);
    expect(toSessionInfo(input)).toEqual(expected);
    expect(input).toEqual(before);
  },
);
