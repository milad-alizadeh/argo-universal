import { View } from 'react-native';
import { Text } from '#primitives/content/text';

export function MenuSection({
  divided,
  title,
}: {
  divided: boolean;
  title?: string;
}): React.JSX.Element {
  return (
    <>
      <SectionLine divided={divided} />
      <SectionTitle title={title} />
    </>
  );
}

function SectionLine({
  divided,
}: {
  divided: boolean;
}): React.JSX.Element | null {
  if (!divided) return null;

  return (
    <View role="separator" className="py-1 pl-10 pr-3">
      <View className="h-px bg-border" />
    </View>
  );
}

function SectionTitle({ title }: { title?: string }): React.JSX.Element | null {
  if (!title) return null;

  return (
    <Text role="secondary" tone="muted" className="px-3 py-1">
      {title}
    </Text>
  );
}
