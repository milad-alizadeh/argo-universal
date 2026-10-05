import type { Navigate } from '@repo/client';
import { router } from 'expo-router';

export const navigate: Navigate = (destination) => {
  switch (destination.to) {
    case 'sessions':
      router.push('/');
      return;
    case 'session':
      router.push({
        pathname: '/sessions/[id]',
        params: { id: destination.id },
      });
      return;
    case 'new-session':
      router.push('/sessions/new');
      return;
    default:
      throw new Error(`Unsupported Sessions destination: ${destination.to}`);
  }
};
