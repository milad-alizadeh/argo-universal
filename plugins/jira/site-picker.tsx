import { FieldGroup, type PluginProps } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraSite } from './jira-store';
import type { Framing } from './view-frame';

type Sites = { sites: JiraSite[]; chosen: string };

const sitePickerProps = (
  { sites, chosen }: Sites,
  { projectId, to }: Framing,
): PluginProps['FieldGroup.Picker'] => ({
  title: 'Site',
  presentation: 'inline',
  value: chosen,
  options: sites.map(({ cloudId, host }) => ({ value: cloudId, label: host })),
  onValueChange: to.run('chooseSite', { cloudId: to.payload(), projectId }),
});

// The sites Argo has found, with a check on the one in use.
const sitesSection = (sites: Sites, framing: Framing): JSX.Element => (
  <FieldGroup.Section key="sites" title="Your sites">
    <FieldGroup.Picker key="site" {...sitePickerProps(sites, framing)} />
  </FieldGroup.Section>
);

const addressProps = ({
  to,
  state,
}: Framing): PluginProps['FieldGroup.TextField'] => ({
  title: 'Site',
  value: state.site,
  placeholder: 'your-team.atlassian.net',
  keyboardType: 'url',
  onChangeText: to.bind('site'),
});

const addFooter =
  'The address you open Jira at, such as your-team.atlassian.net.';

// A field that finds another site by its address, and uses it for the Project.
const addSection = (framing: Framing): JSX.Element => (
  <FieldGroup.Section key="add" title="Add a site" footer={addFooter}>
    <FieldGroup.TextField key="address" {...addressProps(framing)} />
    <FieldGroup.Link
      key="add-site"
      title="Add site"
      action
      onPress={framing.to.run('addSite', {
        site: framing.state.site,
        projectId: framing.projectId,
      })}
    />
  </FieldGroup.Section>
);

export const sitePicker = (sites: Sites, framing: Framing): JSX.Element => (
  <FieldGroup>
    {sites.sites.length > 0 && sitesSection(sites, framing)}
    {addSection(framing)}
  </FieldGroup>
);
