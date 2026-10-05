import { useResolveClassNames } from 'uniwind';

export function useWide(): boolean {
  return useResolveClassNames('hidden wide:flex').display === 'flex';
}
