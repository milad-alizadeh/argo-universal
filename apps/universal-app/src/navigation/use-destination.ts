import type { NavigationDestination } from '@repo/client';
import { useGlobalSearchParams, useSegments } from 'expo-router';
import { destinationFor } from './routes';

export function useDestination(): NavigationDestination {
  return destinationFor(useSegments(), useGlobalSearchParams());
}
