import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Input } from '#primitives/input';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import {
  CheckoutContents,
  type ComposerConfigurationProps,
} from './composer-configuration';
import { ComposerPopover } from './composer-popover';
import { useContentWide } from './content-layout';

export interface StartSessionInProps {
  serverName: string;
  // False while the Connection to the Server is down and the App retries.
  serverConnected: boolean;
  projects: ProjectInfo[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
  // A compact main column draws the checkout here; a wide column keeps it in the Composer's envelope.
  checkout: ComposerConfigurationProps['checkout'];
  disabled?: boolean;
}

// Where a New Session will run: the Server, the Project and, in compact content, the checkout.
export function StartSessionIn({
  serverName,
  serverConnected,
  projects,
  projectId,
  onProjectChange,
  checkout,
  disabled = false,
}: StartSessionInProps): React.JSX.Element {
  const wide = useContentWide();
  const project = projects.find((entry) => entry.id === projectId);
  const projectControl = (
    <ComposerPopover
      label="Project"
      width={300}
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel={`Project: ${project?.name ?? 'None'}`}
          className={cn(
            'gap-1.5 justify-start shadow-none',
            wide
              ? 'h-7 sm:h-7 px-1.5 has-[>[data-icon]]:px-1.5 rounded-md'
              : 'h-10 sm:h-10 px-4 has-[>[data-icon]]:px-4 rounded-md',
          )}
        >
          <Icon name="folder" className="text-muted-foreground" />
          <Text
            selectable={false}
            numberOfLines={1}
            className="select-none shrink type-body"
          >
            {project?.name ?? 'Choose a Project'}
          </Text>
          <Icon
            size="sm"
            name="chevron-down"
            className="-ml-0.5 text-muted-foreground"
          />
        </Button>
      }
    >
      {(close) => (
        <ProjectPicker
          projects={projects}
          projectId={projectId}
          onSelect={(id) => {
            close();
            if (id !== projectId) onProjectChange(id);
          }}
        />
      )}
    </ComposerPopover>
  );
  const server = (
    <View
      className={cn(
        'flex-row items-center gap-1.5 shrink-0',
        wide ? 'h-7 px-1.5' : 'h-10 px-4',
      )}
    >
      <Icon name="computer" className="text-muted-foreground" />
      <Text numberOfLines={1} className="type-body">
        {serverName}
      </Text>
      <View
        role="img"
        accessibilityLabel={serverConnected ? 'Connected' : 'Reconnecting'}
        className={cn(
          'size-[7px] shrink-0 rounded-full',
          serverConnected ? 'bg-success' : 'bg-warning',
        )}
      />
      {!serverConnected && (
        <Text className="pl-1 type-secondary text-warning">Reconnecting…</Text>
      )}
    </View>
  );
  if (wide)
    return (
      <View
        accessibilityLabel="Start the Session in"
        className="w-full max-w-composer flex-row items-center gap-4 pl-2.5"
      >
        <Text className="pl-1.5 shrink-0 type-secondary">
          Start the Session in
        </Text>
        {server}
        {projectControl}
      </View>
    );
  return (
    <View accessibilityLabel="Start the Session in" className="w-full">
      <Text className="pl-4 pb-1 type-secondary">Start the Session in</Text>
      {server}
      {projectControl}
      <ComposerPopover
        label="Checkout"
        trigger={
          <Button
            variant="ghost"
            disabled={disabled || !checkout.onNewWorktreeChange}
            accessibilityLabel="Checkout"
            className="h-10 sm:h-10 px-4 has-[>[data-icon]]:px-4 gap-1.5 justify-start rounded-md shadow-none"
          >
            <Icon
              name={checkout.newWorktree ? 'branch' : 'folder'}
              className="text-muted-foreground"
            />
            <Text
              selectable={false}
              className="select-none type-body text-muted-foreground"
            >
              {checkout.newWorktree ? 'New worktree from' : 'Local'}
            </Text>
            {checkout.newWorktree && (
              <Text
                selectable={false}
                className="select-none -ml-0.5 type-code text-foreground"
              >
                {checkout.branch.toLowerCase()}
              </Text>
            )}
            <Icon
              size="sm"
              name="chevron-down"
              className="-ml-0.5 text-muted-foreground"
            />
          </Button>
        }
      >
        {(close) => (
          <CheckoutContents
            checkout={checkout}
            disabled={disabled}
            close={close}
          />
        )}
      </ComposerPopover>
    </View>
  );
}

export interface ProjectPickerProps {
  projects: ProjectInfo[];
  projectId: string;
  onSelect: (projectId: string) => void;
}

// The Projects on the Server, found by name or folder; one tap picks one.
export function ProjectPicker({
  projects,
  projectId,
  onSelect,
}: ProjectPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const found = projects.filter(
    (project) =>
      !search ||
      project.name.toLowerCase().includes(search) ||
      project.path.toLowerCase().includes(search),
  );
  return (
    <View className="p-1">
      <View className="py-1">
        <View className="h-8 flex-row items-center gap-1.5 rounded-md px-2">
          <Icon name="search" className="text-muted-foreground" />
          <Input
            accessibilityLabel="Find a Project"
            placeholder="Find a Project…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            className="h-5 sm:h-5 flex-1 border-0 bg-transparent dark:bg-transparent p-0 px-0 type-control shadow-none web:focus-visible:ring-0"
          />
        </View>
      </View>
      <View className="pt-1 gap-0.5">
        {found.map((project) => {
          const selected = project.id === projectId;
          return (
            <Button
              key={project.id}
              variant="ghost"
              accessibilityLabel={project.name}
              accessibilityState={{ selected }}
              aria-pressed={selected}
              onPress={() => onSelect(project.id)}
              className={cn(
                'h-auto sm:h-auto items-start justify-start gap-1.5 p-2 has-[>[data-icon]]:p-2 rounded-md web:focus-visible:ring-0 web:focus-visible:bg-accent',
                selected && 'bg-accent',
              )}
            >
              <View className="h-5 shrink-0 justify-center">
                <Icon name="folder" className="text-muted-foreground" />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text
                  selectable={false}
                  numberOfLines={1}
                  className="select-none type-body"
                >
                  {project.name}
                </Text>
                <Text
                  selectable={false}
                  numberOfLines={1}
                  className="select-none type-code text-muted-foreground"
                >
                  {project.path}
                </Text>
              </View>
              <View className="h-5 w-4 shrink-0 items-center justify-center">
                {selected && <Icon name="check" className="text-foreground" />}
              </View>
            </Button>
          );
        })}
        {found.length === 0 && (
          <Text className="px-2 py-2 type-secondary">No Project matches.</Text>
        )}
      </View>
    </View>
  );
}
