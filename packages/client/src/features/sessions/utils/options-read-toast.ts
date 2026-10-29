import { errorToast } from '@repo/kit/error-toast';
import type { ErrorToast } from '@repo/kit/primitives/overlays/toast';
import { decodeOpenFailure } from './open-failure';

const optionsReadFailedTitle = "Couldn't load the Agent's options";

/*
 * A New worktree's options read that failed, as for a failed load. The Agent's own launch or
 * sign-in failure is left to Send's callout, and a dropped Connection to the Connection banner.
 */
export const optionsReadToast = (
  cause: unknown,
  dropped: boolean,
): ErrorToast | undefined =>
  dropped || decodeOpenFailure(cause)
    ? undefined
    : errorToast(optionsReadFailedTitle, cause);
