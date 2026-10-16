export async function register(argo) {
  throw new Error(`got ${await argo.secrets.get('key')}`);
}
