import { FormSheetChoices } from '@repo/client';
import { useNavigation } from 'expo-router';
import { useEffect, type ReactElement } from 'react';
import { useSheetContentInset } from '@/navigation/use-sheet-content-inset';

export default function FormSheetChoice(): ReactElement {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.getParent()?.setOptions({ sheetAllowedDetents: [1] });
  }, [navigation]);
  return <FormSheetChoices headerInset={useSheetContentInset()} />;
}
