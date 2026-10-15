import { FormSheetChoices } from '@repo/client';
import { useNavigation } from 'expo-router';
import { useEffect, type ReactElement } from 'react';

export default function FormSheetChoice(): ReactElement {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.getParent()?.setOptions({ sheetAllowedDetents: [1] });
  }, [navigation]);

  return <FormSheetChoices />;
}
