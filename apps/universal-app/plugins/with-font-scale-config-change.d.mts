export function addFontScale(configChanges?: string): string;

export function passFontScaleOn(mainActivity: string): string;

declare function withFontScaleConfigChange<Config>(config: Config): Config;

export default withFontScaleConfigChange;
