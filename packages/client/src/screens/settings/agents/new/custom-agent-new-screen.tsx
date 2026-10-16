import type * as React from 'react';
import { View } from 'react-native';
import {
  CustomAgentForm,
  type CustomAgentFormProps,
  customAgentFormDescription,
  useCustomAgentMutations,
} from '#features/agents';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { SettingsPage } from '#lib/product/settings-page';

const title = 'Add custom Agent';

function useRegisterAgent(): CustomAgentFormProps['onSubmit'] {
  const navigate = useNavigate();
  const { register } = useCustomAgentMutations();

  return async (definition) => {
    const result = await register(definition);

    if (result.status === 'ready')
      navigate('/settings/agents', { replace: true });

    return result;
  };
}

// Adds an Agent from outside the ACP Registry; the Server saves it only once it answers ACP initialize.
export function CustomAgentNewScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <ScreenHeader title={title} />
      <SettingsPage title={title} caption={customAgentFormDescription}>
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
      onCancel={() => navigate('/settings/agents')}
    />
  );
}
