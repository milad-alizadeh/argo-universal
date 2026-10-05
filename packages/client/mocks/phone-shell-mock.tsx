import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { PhoneShell, type PhoneShellProps } from '../src/components/PhoneShell';
import { Text } from '../src/primitives/text';

export function PhoneShellMock({
  selectedSection = 'sessions',
  drawerOpen = false,
  attentionCount = 1,
  onDrawerOpenChange,
  onSectionChange,
  onSearch,
  onFilter,
}: Partial<Omit<PhoneShellProps, 'children'>>) {
  const [section, setSection] = useState(selectedSection);
  const [open, setOpen] = useState(drawerOpen);
  const [action, setAction] = useState('');

  useEffect(() => setSection(selectedSection), [selectedSection]);
  useEffect(() => setOpen(drawerOpen), [drawerOpen]);

  return (
    <PhoneShell
      selectedSection={section}
      drawerOpen={open}
      attentionCount={attentionCount}
      onDrawerOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onDrawerOpenChange?.(nextOpen);
      }}
      onSectionChange={(nextSection) => {
        setSection(nextSection);
        setAction('');
        onSectionChange?.(nextSection);
      }}
      onSearch={() => {
        setAction('Search opened');
        onSearch?.();
      }}
      onFilter={() => {
        setAction('Filter opened');
        onFilter?.();
      }}
    >
      <View testID="phone-shell-content" className="flex-1 gap-3 p-6">
        <Text variant="muted">
          {section === 'sessions'
            ? 'Your Sessions appear here.'
            : `${section.charAt(0).toUpperCase()}${section.slice(1)} will appear here.`}
        </Text>
        {action ? <Text role="status">{action}</Text> : null}
      </View>
    </PhoneShell>
  );
}
