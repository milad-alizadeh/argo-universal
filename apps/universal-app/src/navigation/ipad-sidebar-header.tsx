import {
  Button,
  HStack,
  Host,
  Image,
  Menu,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  labelStyle,
  menuStyle,
  padding,
  shapes,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import type {
  SidebarAction,
  SidebarHeaderProps,
} from '@repo/kit/native-sidebar';
import { sidebarSystemImage } from '@repo/kit/native-sidebar';
import { useNativeTheme } from '@repo/kit/native-theme';
import type { JSX } from 'react';

type SystemImage = NonNullable<
  React.ComponentProps<typeof Image>['systemName']
>;

interface SectionChoice {
  id: string;
  title: string;
  icon: SystemImage;
}

interface HeaderProps extends SidebarHeaderProps {
  section: string;
  choices: readonly SectionChoice[];
  coreCount: number;
  onPick: (section: string) => void;
}

function TitleMenu({
  section,
  choices,
  coreCount,
  onPick,
}: HeaderProps): JSX.Element {
  const title = choices.find(({ id }) => id === section)?.title ?? 'Sessions';

  const option = ({ id, title, icon }: SectionChoice): JSX.Element => (
    <Button
      key={id}
      label={title}
      systemImage={id === section ? 'checkmark' : icon}
      onPress={() => onPick(id)}
    />
  );

  return (
    <Menu
      modifiers={[
        menuStyle('button'),
        buttonStyle('plain'),
        foregroundStyle('primary'),
      ]}
      label={
        <HStack spacing={8}>
          <Text modifiers={[font({ size: 30, weight: 'bold' })]}>{title}</Text>
          <Image
            systemName="chevron.down"
            size={14}
            modifiers={[foregroundStyle('secondary')]}
          />
        </HStack>
      }
    >
      <Section>{choices.slice(0, coreCount).map(option)}</Section>
      {choices.length > coreCount && (
        <Section>{choices.slice(coreCount).map(option)}</Section>
      )}
    </Menu>
  );
}

const toolbarButton = [
  frame({ width: 44, height: 44 }),
  labelStyle('iconOnly'),
];

function ToolbarAction({ action }: { action: SidebarAction }): JSX.Element {
  const icon = sidebarSystemImage(action.icon);

  if (!action.children) {
    return (
      <Button
        label={action.title}
        systemImage={icon}
        modifiers={toolbarButton}
        onPress={action.onPress}
      />
    );
  }

  return (
    <Menu label={action.title} systemImage={icon} modifiers={toolbarButton}>
      {action.children.map((group) => (
        <Section key={group.title} header={<Text>{group.title}</Text>}>
          {group.children?.map((item) => (
            <Button
              key={item.title}
              label={item.title}
              systemImage={
                item.selected ? 'checkmark' : sidebarSystemImage(item.icon)
              }
              onPress={item.onPress}
            />
          ))}
        </Section>
      ))}
    </Menu>
  );
}

function SidebarSearch({
  search,
}: {
  search: NonNullable<SidebarHeaderProps['search']>;
}): JSX.Element {
  const value = useNativeState(search.query);
  const { colors } = useNativeTheme();

  return (
    <HStack
      spacing={8}
      modifiers={[
        padding({ horizontal: 12 }),
        frame({ height: 40 }),
        ...(colors.muted ? [background(colors.muted, shapes.capsule())] : []),
      ]}
    >
      <Image
        systemName="magnifyingglass"
        size={15}
        modifiers={[foregroundStyle('secondary')]}
      />
      <TextField
        text={value}
        placeholder={search.label}
        onTextChange={search.onChange}
        modifiers={[textFieldStyle('plain')]}
      />
    </HStack>
  );
}

export function IPadSidebarHeader(props: HeaderProps): JSX.Element {
  return (
    <Host matchContents={{ vertical: true }}>
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[padding({ horizontal: 16, bottom: 8 })]}
      >
        <HStack modifiers={[frame({ height: 44 })]}>
          <Spacer />
          {Boolean(props.actions?.length) && (
            <HStack
              spacing={0}
              modifiers={[padding({ horizontal: 2 }), glassEffect()]}
            >
              {props.actions?.map((action) => (
                <ToolbarAction key={action.title} action={action} />
              ))}
            </HStack>
          )}
        </HStack>
        <TitleMenu {...props} />
        {props.search && <SidebarSearch search={props.search} />}
      </VStack>
    </Host>
  );
}
