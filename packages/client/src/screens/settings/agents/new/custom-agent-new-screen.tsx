import type * as React from 'react';
import { View } from 'react-native';
import {
  CustomAgentForm,
  type CustomAgentFormProps,
  customAgentFormDescription,
  useCustomAgentMutations,
} from '#features/agents';
import { useNavigate } from '#lib/product/navigation/context';
import { SettingsPage } from '#lib/product/settings-page';
import { settingsTitles } from '../../../../lib/product/navigation/settings-titles';

function useRegisterAgent(): CustomAgentFormProps['onSubmit'] {
  const navigate = useNavigate();
  const { register } = useCustomAgentMutations();

  return async (definition) => {
    const result = await register(definition);

    if (result.status === 'ready')
      navigate(
        { to: 'settings-agent', agent: result.agentId },
        { replace: true },
      );

    return result;
  };
}

// Adds an Agent from outside the ACP Registry; the Server saves it only once it answers ACP initialize.
export function CustomAgentNewScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <SettingsPage
        title={settingsTitles['agents/new']}
        caption={customAgentFormDescription}
      >
        <AddAgentForm />
      </SettingsPage>
    </View>
  );
}

function AddAgentForm(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <CustomAgentForm
      submitLabel="Add Agent"
      onSubmit={useRegisterAgent()}
      onCancel={() => navigate({ to: 'settings-agents' })}
    />
  );
}
