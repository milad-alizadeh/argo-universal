import { useContext } from 'react';
import { Platform } from 'react-native';
import { ListContext, type ListAppearance } from './list-context';

// On the web a grouped List is drawn as a FieldGroup section on LegendList; iOS and Android draw FieldGroup rows natively (list-native-grouped).
export const isWebGrouped = (appearance?: ListAppearance): boolean =>
  Platform.OS === 'web' && appearance === 'grouped';

export const isNativeGrouped = (appearance?: ListAppearance): boolean =>
  Platform.OS !== 'web' && appearance === 'grouped';

// A list of ListItems is grouped cards on the phones (owner, 2026-10-24); the web and desktop keep the appearance they draw.
export const groupedOnPhones = (
  webAppearance: ListAppearance,
): ListAppearance => (Platform.OS === 'web' ? webAppearance : 'grouped');

export function useWebGrouped(): boolean {
  return isWebGrouped(useContext(ListContext).appearance);
}

// A card's rows sit 16 from its edge at every width, so its heading and footer start where they do; the heading sits 12 above it.
export const groupedHeading = 'wide:px-4 pb-1';

export const groupedFooter = 'wide:px-4';
