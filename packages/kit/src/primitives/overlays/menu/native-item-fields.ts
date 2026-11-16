export const nothing = (): void => undefined;

// A disabled row does nothing even if the system reports it chosen.
export const pressOf = (item: {
  disabled?: boolean;
  onPress: () => void;
}): (() => void) => (item.disabled ? nothing : item.onPress);

// A row carries a subtitle only when it has one.
export const subtitleOf = (item: {
  subtitle?: string;
}): { subtitle?: string } => (item.subtitle ? { subtitle: item.subtitle } : {});
