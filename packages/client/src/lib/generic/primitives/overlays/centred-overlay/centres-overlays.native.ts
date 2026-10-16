// Phones and tablets raise the system sheet at every width; iPadOS and Android present it as a modal on a large screen themselves.
export function useCentresOverlays(): boolean {
  return false;
}
