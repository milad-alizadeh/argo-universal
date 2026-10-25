import type { redacted } from '@expo/ui/swift-ui/modifiers';

export interface RedactionProps {
  modifiers?: ReturnType<typeof redacted>[];
}

// Only SwiftUI has redaction; the web walk and the Compose cover are drawn by the Skeleton itself.
export function useRedactionProps(): RedactionProps {
  return {};
}
