const run = (argo, sql, params = []) =>
  argo.storage.execute({ sql, params, method: 'run' });

export async function register(argo) {
  await run(argo, 'create table if not exists notes (body text not null)');
  await run(argo, 'insert into notes (body) values (?)', ['hello']);

  if ((await argo.secrets.get('missing')) !== null)
    throw new Error('Unset secret must read as null');
  await argo.secrets.set('token', 'plugin-secret');

  if ((await argo.secrets.get('token')) !== 'plugin-secret')
    throw new Error('Secret round-trip failed');
}
