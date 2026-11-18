import { discoveryProtocol, discoveryServiceType } from '@repo/contracts';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const serviceType = `_${discoveryServiceType}._${discoveryProtocol}`;

/*
 * Whether this build says, in the Info.plist it was configured with, that it browses for Servers (`NSBonjourServices`), which iOS refuses to do otherwise. Read from the app config, which is what the plist was built from, so a build made before the key was added still reads as declared; and true wherever the config cannot say.
 */
export function bonjourDeclared(): boolean {
  const plist = Constants.expoConfig?.ios?.infoPlist;

  if (Platform.OS !== 'ios' || !plist) return true;

  const declared: unknown = plist.NSBonjourServices;

  return Array.isArray(declared) && declared.includes(serviceType);
}
