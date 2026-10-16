import { FadeIn, FadeOut } from 'react-native-reanimated';

const fadeInMilliseconds = 200;

const fadeOutMilliseconds = 150;

const fades = {
  entering: FadeIn.duration(fadeInMilliseconds),
  exiting: FadeOut.duration(fadeOutMilliseconds),
};

const noFades = {};

// Rows that mount or leave while the list reorders fade; otherwise they appear and go at once.
export function rowFade(animate?: boolean): Partial<typeof fades> {
  return animate ? fades : noFades;
}
