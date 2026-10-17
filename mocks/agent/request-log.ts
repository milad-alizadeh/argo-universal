// App E2E reads the ACP messages a scripted Agent process received and answered from its request log.
export type LoggedMessage =
  | {
      method: string;
      id: string | number | null | undefined;
      params?: unknown;
    }
  | { answered: string | number | null };

// Writing this file beside the request log releases every held `wait-for-release` step.
export const releaseMarker = (requestLog: string): string =>
  `${requestLog}.released`;
