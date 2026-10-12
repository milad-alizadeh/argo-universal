import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
const InstallerExit = z.strictObject({
  type: z.literal('installer.exit'),
  code: z.number().int().nonnegative().nullable(),
});
const rejections = createRejectionCounter('Installer messages');
export const readInstallerExitCode = (message: unknown): number | null => {
  const exit = InstallerExit.safeParse(message);
  if (exit.success) return exit.data.code;
  rejections.report('Unrecognised installer completion');
  throw new Error('Unrecognised installer completion');
};
