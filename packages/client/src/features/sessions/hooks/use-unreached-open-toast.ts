import { useErrorToast } from '#primitives/overlays/toast';
import { unreachedOpenToast } from '../utils/open-failure';

// An open that failed short of the Agent, such as on a dropped Connection, shows the error toast once; the Agent's own failure is the callout's.
export function useUnreachedOpenToast(cause: unknown): void {
  useErrorToast(unreachedOpenToast(cause));
}
