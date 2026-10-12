import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';
import { Icon } from '../../../../lib/generic/symbols/icon';
import {
  CheckoutContents,
  type ComposerConfigurationProps,
} from '../composer-configuration/composer-configuration';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ProjectPicker } from './project-picker';
import { ServerLocation } from './server-location';

export interface StartSessionInProps {
  // The Server computer's name, shown only when this device is paired to a Server on another computer.
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
  const disclosure = (
    <Icon
      role="control"
      name="chevron-down"
      className="text-muted-foreground"
    />
  );
  const projectControl = (
    <ComposerPopover
      listContent
      label="Project"
      trigger={
        <Button
          appearance="content"
          variant="ghost"
          disabled={disabled}
          accessibilityLabel={`Project: ${project?.name ?? 'None'}`}
          label={project?.name ?? 'Choose a Project'}
          labelNumberOfLines={1}
          icon="folder"
          labelClassName="shrink"
          className={cn(
            'gap-1.5 justify-start',
            wide ? 'h-7 sm:h-7 px-1.5 py-0' : 'h-10 sm:h-10 px-4',
          )}
          trailing={disclosure}
        />
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
    <ServerLocation name={serverName} connected={serverConnected} />
  );
  if (wide)
    return (
      <View
        accessibilityLabel="Start the Session in"
        className="w-full max-w-composer flex-row items-center gap-4 pl-2.5"
      >
        {server}
        {projectControl}
      </View>
    );
  return (
    <View accessibilityLabel="Start the Session in" className="w-full">
      {server}
      {projectControl}
      <ComposerPopover
        listContent
        label="Checkout"
        trigger={
          <Button
            appearance="content"
            variant="ghost"
            disabled={disabled || !checkout.onNewWorktreeChange}
            accessibilityLabel="Checkout"
            label={checkout.newWorktree ? 'New worktree' : 'Local'}
            icon={checkout.newWorktree ? 'branch' : 'folder'}
            labelClassName="text-muted-foreground"
            className="h-10 sm:h-10 px-4 gap-1.5 justify-start"
            trailing={disclosure}
          />
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
