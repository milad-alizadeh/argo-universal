import extraLight from 'expo-symbols/androidWeights/extraLight';

// Material Symbols are drawn for 24px and read heavy at our 12–20px icon sizes; ExtraLight matches SF's regular stroke.
export const symbolWeight = { ios: 'regular', android: extraLight } as const;
