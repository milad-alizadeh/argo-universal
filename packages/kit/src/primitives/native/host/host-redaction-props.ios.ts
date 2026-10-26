import { redacted } from '@expo/ui/swift-ui/modifiers';
import { useContext } from 'react';
import { HostRedactionContext } from './host-redaction';
import type { RedactionProps } from './host-redaction-props';

const placeholder = [redacted('placeholder')];

// Inside a loading Skeleton SwiftUI draws its own placeholder shapes, one per text line and image.
export function useRedactionProps(): RedactionProps {
  return useContext(HostRedactionContext) ? { modifiers: placeholder } : {};
}
