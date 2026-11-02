/*
 * Whether this App may pair a Device at all. A Device Key has to live in the platform's secure storage, so Pairing is native and desktop only (ADR-0045).
 * On a native App this is always true; the web build answers for a browser tab, where it is not.
 */
export const pairingOffered = (): boolean => true;
