const reachesOuterRealm = (probe) => {
  try {
    probe();
  } catch {
    return false;
  }

  return true;
};

export async function register(argo) {
  const rejection = await argo.storage
    .execute({ sql: 'not sql', params: [], method: 'run' })
    .catch((error) => error);

  const probes = [
    () => argo.storage.execute.constructor('return 1')(),
    () => argo.storage.batch([]).constructor.constructor('return 1')(),
    () => rejection.constructor.constructor('return 1')(),
    () => Object.getPrototypeOf(argo).constructor.constructor('return 1')(),
  ];

  if (probes.some(reachesOuterRealm)) throw new Error('Plugin escaped');
}
