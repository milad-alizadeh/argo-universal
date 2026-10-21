import { View } from 'react-native';
import { menuGroupGapClassName } from '#lib/generic/menu-surface';
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
      <SectionGap divided={divided} />
      <SectionTitle title={title} />
    </>
  );
}

// A later section sits 8px below the one before, with no line (Paper's Menu "Section line").
function SectionGap({
  divided,
}: {
  divided: boolean;
}): React.JSX.Element | null {
  if (!divided) return null;

  return <View role="separator" className={menuGroupGapClassName} />;
}

function SectionTitle({ title }: { title?: string }): React.JSX.Element | null {
  if (!title) return null;

  return (
    <Text role="secondary" tone="muted" className="px-2 py-1">
      {title}
    </Text>
  );
}
