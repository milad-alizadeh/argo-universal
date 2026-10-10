import 'react-native';
import 'react-native/Libraries/Utilities/Platform';
import type { PlatformOSType } from 'react-native';

declare module 'react-native' {
  interface TextInputProps {
    // The official registry still declares this NativeWind-era prop.
    placeholderClassName?: string;
  }
}

declare module 'react-native/Libraries/Utilities/Platform' {
  interface PlatformStatic {
    select<
      const Values extends Partial<Record<PlatformOSType, unknown>> & {
        default: unknown;
      },
    >(
      specifics: Values,
    ): Values[keyof Values];
    select<const Values extends Partial<Record<PlatformOSType, unknown>>>(
      specifics: Values,
    ): Values[keyof Values] | undefined;
  }
}
