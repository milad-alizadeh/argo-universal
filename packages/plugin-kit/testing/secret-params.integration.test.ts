import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const token = 'fixture-pasted-token-8f3a';

const saveToken = {
  name: 'saveToken',
  label: 'Save the token',
  description: 'Keeps a pasted API token.',
  tier: 'act' as const,
  params: {
    token: {
      type: 'string' as const,
      description: 'The API token',
      required: true,
      secret: true,
    },
    label: { type: 'string' as const, description: 'What the token is for' },
  },
};

// A careless Plugin: it names the token in a call Argo logs, and answers it back.
const careless = `export function register(argo) {
  argo.operations.register('saveToken', async (params) => {
    await argo.settings.get(params.token);
    return { saved: params.token, label: params.label ?? null };
  });
}`;

it('keeps a secret param out of the log and out of what the run answers', async () => {
  const fixture = await dataFixture(careless, { operations: [saveToken] });
  const kit = await fixture.start();

  const result = await kit.operations.run({
    name: 'saveToken',
    params: { token, label: 'Jira' },
  });

  expect(result).toEqual({ saved: '[secret]', label: 'Jira' });
  expect(await kit.log()).toContain('argo.settings.get [secret]');
  expect(await kit.log()).not.toContain(token);
}, 30_000);

it('keeps a secret param a page’s run carries out of the log and what the App is answered', async () => {
  const fixture = await dataFixture(careless, { operations: [saveToken] });
  const kit = await fixture.start();

  await expect(
    kit.pages.run({ operation: 'saveToken', args: { token } }),
  ).resolves.toEqual({ result: { saved: '[secret]', label: null } });
  expect(await kit.log()).not.toContain(token);
}, 30_000);

it('keeps a secret param out of the error a failed run answers', async () => {
  const fixture = await dataFixture(
    `export function register(argo) {
      argo.operations.register('saveToken', async (params) => {
        throw new Error('Atlassian refused ' + params.token);
      });
    }`,
    { operations: [saveToken] },
  );

  const kit = await fixture.start();

  await expect(
    kit.operations.run({ name: 'saveToken', params: { token } }),
  ).rejects.toThrow('Atlassian refused [secret]');
}, 30_000);

it('lists a secret param as write-only, so an Agent knows its value is never shown', async () => {
  const fixture = await dataFixture(careless, { operations: [saveToken] });
  const kit = await fixture.start();

  const [row] = await kit.operations.list();

  expect(row?.params).toMatchObject({
    properties: {
      token: { type: 'string', writeOnly: true },
      label: { type: 'string' },
    },
  });
  expect(row?.params).not.toHaveProperty('properties.label.writeOnly');
}, 30_000);

// A sign-in page whose one SecretField's typed text goes where `binding` says.
const signIn = (binding: string): string =>
  `const Group = 'FieldGroup', Section = 'FieldGroup.Section', SecretField = 'FieldGroup.SecretField';
  export function register(argo) {
    argo.pages.define('/', {
      load: () => null,
      render: (_data, to) => (
        <Group key="form">
          <Section key="section">
            <SecretField key="token" title="API token" value="" onChangeText={${binding}} />
          </Section>
        </Group>
      ),
    });
  }`;

type Tree = { type: string; children: Tree[] };

// The SecretFields a drawn tree holds.
const secretFields = ({ type, children }: Tree): number =>
  (type === 'FieldGroup.SecretField' ? 1 : 0) +
  children.reduce((count, child) => count + secretFields(child), 0);

const drawnSecretFields = async (binding: string): Promise<number> => {
  const fixture = await dataFixture(signIn(binding), {
    operations: [saveToken],
  });

  const kit = await fixture.start();
  const page = await kit.pages.open({ path: '/' });

  return secretFields(page.tree);
};

it('draws a SecretField whose text goes to a secret param', async () => {
  await expect(
    drawnSecretFields("to.run('saveToken', { token: to.payload() })"),
  ).resolves.toBe(1);
}, 30_000);

it.each([
  {
    bound: 'Page state',
    binding: "to.bind('token')",
    fix: 'FieldGroup.SecretField onChangeText puts a secret in Page state: pass it to an Operation param marked "secret": true in plugin.json',
  },
  {
    bound: 'a Page state change',
    binding: 'to.set({ token: to.payload() })',
    fix: 'FieldGroup.SecretField onChangeText puts a secret in Page state: pass it to an Operation param marked "secret": true in plugin.json',
  },
  {
    bound: 'a param not marked secret',
    binding: "to.run('saveToken', { token: 'x', label: to.payload() })",
    fix: 'FieldGroup.SecretField onChangeText passes a secret to param label of saveToken: mark it "secret": true in plugin.json',
  },
])(
  'refuses a SecretField bound to $bound, naming the fix',
  async ({ binding, fix }) => {
    const fixture = await dataFixture(signIn(binding), {
      operations: [saveToken],
    });

    const kit = await fixture.start();
    const page = await kit.pages.open({ path: '/' });

    expect(secretFields(page.tree)).toBe(0);
    expect(await kit.log()).toContain(fix);
  },
  30_000,
);
