// Only the desktop App can capture the screen (ADR-0064); a phone has no bridge, so it offers no switch.
export const screenSightOffered = (): boolean => false;
