import { discoveryProtocol, discoveryServiceType } from '@repo/contracts';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

const serviceType = `_${discoveryServiceType}._${discoveryProtocol}`;

// The Info.plist the app config builds, where a missing `NSBonjourServices` is an empty list.
const Config = z.object({
  ios: z.object({
    infoPlist: z.object({
      NSBonjourServices: z.array(z.string()).default([]),
    }),
  }),
});

const servicesOf = (): string[] | undefined =>
  Config.safeParse(Constants.expoConfig).data?.ios.infoPlist.NSBonjourServices;

/*
 * Whether this build says, in the Info.plist it was configured with, that it browses for Servers (`NSBonjourServices`), which iOS refuses to do otherwise. Read from the app config, which is what the plist was built from, so a build made before the key was added still reads as declared; and true wherever the config cannot say.
 */
export function bonjourDeclared(): boolean {
  const services = servicesOf();

  return Platform.OS !== 'ios' || !services || services.includes(serviceType);
}
