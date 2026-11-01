import {
  useDesktopNavigation,
  useNotifications,
  usePluginListChanges,
  useRememberShownPage,
} from '@repo/client';
import { usePathname } from 'expo-router';

// What the shell keeps running beside its pages, whichever Section is shown.
export function useShellListeners(): void {
  useNotifications(usePathname());
  useDesktopNavigation();
  useRememberShownPage();
  // A Plugin turned off elsewhere leaves the rail and its open page, as it does when the App reloads.
  usePluginListChanges();
}
