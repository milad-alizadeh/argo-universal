import { View } from 'react-native';
import {
  Text,
  TextClassContext,
} from '#lib/generic/primitives/display/text/text';
import { Icon } from '../../../symbols/icon';
import { iconNames, iconSymbols } from '../../../symbols/icon-names';
import { SymbolImagesProvider } from '../../../symbols/symbol-images';
import { renderStorybookSymbol } from './sf-symbol-images.mocks';

type IconName = (typeof iconNames)[number];

function SfAndMaterialHeader(): React.JSX.Element {
  return (
    <TextClassContext.Provider value="type-secondary">
      <View className="flex-row gap-4 pb-2">
        <Text className="w-36">Name</Text>
        <Text className="w-10">SF</Text>
        <Text className="w-10">Material</Text>
        <Text className="w-64">SF Symbol</Text>
        <Text>Material Symbol</Text>
      </View>
    </TextClassContext.Provider>
  );
}

function SymbolNames({ name }: { name: IconName }): React.JSX.Element {
  return (
    <>
      <Text role="code" className="w-64 text-muted-foreground">
        {iconSymbols[name].sf}
      </Text>
      <Text role="code" className="text-muted-foreground">
        {iconSymbols[name].material}
      </Text>
    </>
  );
}

function SymbolCells({ name }: { name: IconName }): React.JSX.Element {
  return (
    <>
      <View className="w-10">
        <SymbolImagesProvider render={renderStorybookSymbol}>
          <Icon name={name} role="action" testID={`sf-${name}`} />
        </SymbolImagesProvider>
      </View>
      <View className="w-10">
        <Icon name={name} role="action" testID={`material-${name}`} />
      </View>
    </>
  );
}

function SfAndMaterialRow({ name }: { name: IconName }): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-4">
      <Text className="w-36">{name}</Text>
      <SymbolCells name={name} />
      <SymbolNames name={name} />
    </View>
  );
}

export function SfAndMaterialTable(): React.JSX.Element {
  return (
    <View className="gap-1 p-4">
      <SfAndMaterialHeader />
      {iconNames.map((name) => (
        <SfAndMaterialRow key={name} name={name} />
      ))}
    </View>
  );
}
