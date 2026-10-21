import { Json } from '@repo/contracts/plugins/hook-protocol';

// Removed options fail at registration, before the Hook can enter a chain.
export function requireNoHookOptions(options: Json | undefined): void {
  if (options === undefined) return;
  const supplied = Json.parse(options);

  throw new Error(`Unknown Hook options: ${JSON.stringify(supplied)}`);
}
