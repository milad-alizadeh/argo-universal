import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { Chevron } from '../../../../lib/generic/symbols/chevron';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { configurationChoices } from '../../state/configuration-choices';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ConfigurationChoice } from './configuration-choice';
import type { ComposerConfigurationProps } from './configuration-types';
import { configurationIcon, selection } from './configuration-values';
const destructiveTextClassName = 'text-destructive';

export function ComposerModeControl({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}): React.JSX.Element | null {
  const wide = useContentWide();
  const mode = selection(configuration, 'mode');
  const current = configurationChoices(mode).find(
    (choice) => choice.value === mode?.currentValue,
  );
  if (!mode) return null;
  return (
    <ComposerPopover
      listContent
      label="Mode"
      trigger={
        <Button
          appearance="content"
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Mode"
          label={
            wide
              ? current?.name.replace(/\s*\(recommended\)\s*$/i, '') || 'Mode'
              : ''
          }
          icon={configurationIcon(current?._meta?.argo?.icon)}
          className={cn('h-7 sm:h-7 py-0 gap-1.5', wide ? 'px-1.5' : 'w-7 p-0')}
          labelClassName={cn(
            'text-muted-foreground',
            !wide && 'hidden',
            current?._meta?.argo?.tone === 'dangerous' &&
              destructiveTextClassName,
          )}
          trailing={
            wide ? (
              <Chevron
                textRole="control"
                name="chevron-down"
                className="text-muted-foreground"
              />
            ) : undefined
          }
        />
      }
    >
      {(close) => (
        <View className="native:flex-1 wide:p-3 bg-sidebar">
          <FieldGroup fit>
            <FieldSection>
              {configurationChoices(mode).map((choice) => (
                <ConfigurationChoice
                  key={choice.value}
                  selected={choice.value === mode.currentValue}
                  label={choice.name}
                  description={choice.description}
                  dangerous={choice._meta?.argo?.tone === 'dangerous'}
                  leading={
                    <Icon
                      name={configurationIcon(choice._meta?.argo?.icon)}
                      className={cn(
                        'text-foreground',
                        choice._meta?.argo?.tone === 'dangerous' &&
                          destructiveTextClassName,
                      )}
                    />
                  }
                  onPress={() => {
                    configuration.onConfigChange(mode.configId, choice.value);
                    close();
                  }}
                />
              ))}
            </FieldSection>
          </FieldGroup>
        </View>
      )}
    </ComposerPopover>
  );
}
