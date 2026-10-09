import light from 'expo-symbols/androidWeights/light';

// Material's Regular weight is drawn for 24px and reads heavy at icon sizes; Light matches SF's regular stroke.
export const symbolWeight = { ios: 'regular', android: light } as const;
