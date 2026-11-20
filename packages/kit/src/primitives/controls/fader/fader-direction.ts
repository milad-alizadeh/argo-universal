import { I18nManager, Platform } from 'react-native';

// Whether lines start at the right: the document's direction on the web, the device's language elsewhere.
export function isRightToLeft(): boolean {
  return Platform.OS === 'web'
    ? typeof document !== 'undefined' &&
        getComputedStyle(document.documentElement).direction === 'rtl'
    : I18nManager.isRTL;
}
