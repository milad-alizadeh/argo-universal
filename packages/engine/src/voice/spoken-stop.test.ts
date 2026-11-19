import { describe, expect, it } from 'vitest';
import { isStopRequest } from './spoken-stop';

describe('what counts as a spoken "stop"', () => {
  it.each([
    'stop',
    'Stop.',
    'STOP!',
    ' stop, please ',
    'Please stop',
    'Stop it',
    'Stop that now',
    'stop stop',
    'Stop working',
    'stop working now',
    'Stop that',
    'Cancel that',
    'cancel it',
    'Cancel',
    'Halt',
    'halt, please',
    'Please cancel that',
    'OK stop',
  ])('stops on %j', (words) => {
    expect(isStopRequest(words)).toBe(true);
  });

  it.each([
    'Stop using tabs in the config',
    "Don't stop",
    'stop the server on port 3000',
    'nonstop',
    'Can you stop and explain?',
    'Cancel the subscription',
    'stop working on the tests and fix the build',
    'Halt the deploy on Friday',
    'cancellation policy',
  ])('sends %j to the Agent instead', (words) => {
    expect(isStopRequest(words)).toBe(false);
  });
});
