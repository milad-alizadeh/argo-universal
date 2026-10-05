import {
  type Navigate,
  NavigationProvider,
  ProjectsScreen,
} from '@repo/client';
import { router } from 'expo-router';

const navigate: Navigate = (destination) => {
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
      router.push({ pathname: '/sessions/[id]', params: { id: 'new' } });
      return;
    default:
      throw new Error(`Unsupported Sessions destination: ${destination.to}`);
  }
};

export default function ProjectsRoute() {
  return (
    <NavigationProvider navigate={navigate}>
      <ProjectsScreen />
    </NavigationProvider>
  );
}
