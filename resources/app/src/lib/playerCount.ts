const PLAYER_COUNT_FEATURES = ['valheim_query'];

const hasPlayerCount = (eggFeatures: string[]): boolean =>
    eggFeatures.some((feature) => PLAYER_COUNT_FEATURES.includes(feature));

export { hasPlayerCount };
