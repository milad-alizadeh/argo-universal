/*
 * The size class for the navigator, apps/universal-app/src/navigation, which is kit under ADR-0026.
 * A module, not a package.json export target, so Metro still picks each platform's use-size-class file.
 */
export { useSizeClass } from './lib/generic/use-size-class/use-size-class';

export { useWide } from './lib/generic/use-wide/use-wide';
