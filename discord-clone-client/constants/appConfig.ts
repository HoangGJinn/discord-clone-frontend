const DEFAULT_GIPHY_API_KEY = 'zZQZOUwAstZ2YFtDn4LvzV4rrFQnMvLs';

const envGiphyKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY?.trim();

export const APP_CONFIG = {
  giphyApiKey: envGiphyKey || DEFAULT_GIPHY_API_KEY,
} as const;

export const HAS_GIPHY_API_KEY = APP_CONFIG.giphyApiKey.length > 0;
