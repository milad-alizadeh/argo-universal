import { createRejectionCounter } from '@repo/machine-log';

const rejections = createRejectionCounter('Agent installation metadata');

export const rejectInstallMetadata = (message: string): Error => {
  rejections.report(message);
  return new Error(message);
};
