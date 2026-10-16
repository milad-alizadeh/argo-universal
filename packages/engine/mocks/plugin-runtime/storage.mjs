const sql = (argo, text, params = []) =>
  argo.storage.execute({ sql: text, params, method: 'run' });

export async function register(argo) {
  await sql(argo, 'create table if not exists notes (body text not null)');
  await sql(argo, 'insert into notes (body) values (?)', ['hello']);

  await argo.secrets.set('token', 'plugin-secret');
  await argo.secrets.set('temp', 'short-lived');
  await argo.secrets.delete('temp');

  if ((await argo.secrets.get('token')) !== 'plugin-secret')
    throw new Error('Secret round-trip failed');

  if ((await argo.secrets.get('temp')) !== null)
    throw new Error('Deleted or unset secrets must read as null');

  // A failing statement rejects inside the Plugin instead of crashing it.
  await sql(argo, 'insert into missing_table values (1)').catch(() =>
    sql(argo, 'insert into notes (body) values (?)', ['rejected']),
  );
}
