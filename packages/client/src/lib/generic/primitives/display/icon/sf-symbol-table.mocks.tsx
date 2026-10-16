import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/display/text';
import { drawnSymbol } from '../../../symbols/drawn-symbol';
import { iconNames, iconSymbols } from '../../../symbols/icon-names';
import { SymbolImagesProvider } from '../../../symbols/symbol-images';
import { Icon } from './icon';
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

function symbolNames(name: IconName): [string, string] {
  const symbol = drawnSymbol(iconSymbols[name]);

  return symbol.kind === 'tabler'
    ? [`Tabler ${symbol.tabler}`, `Tabler ${symbol.tabler}`]
    : [symbol.sf, symbol.material];
}

function SymbolNames({ name }: { name: IconName }): React.JSX.Element {
  const [sf, material] = symbolNames(name);

  return (
    <>
      <Text role="code" className="w-64 text-muted-foreground">
        {sf}
      </Text>
      <Text role="code" className="text-muted-foreground">
        {material}
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
