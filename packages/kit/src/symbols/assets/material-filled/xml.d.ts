// Metro and Vite import an Android vector drawable as an asset.
declare module '*.xml' {
  const asset: number;

  export default asset;
}
