import { createRejectionCounter } from '@repo/machine-log';

const rejections = createRejectionCounter('git');

// Reports and counts a git answer this package does not recognise, then throws.
export const rejectResponse = (what: string, detail?: string): never => {
  rejections.report(`rejected ${what} response`, detail);
  throw new Error(`Unrecognised git ${what} response`);
};
