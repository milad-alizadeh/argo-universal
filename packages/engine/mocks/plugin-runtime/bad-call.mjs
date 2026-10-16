export async function register(argo) {
  await argo.storage.execute({
    sql: 'select ?',
    params: [true],
    method: 'get',
  });
}
