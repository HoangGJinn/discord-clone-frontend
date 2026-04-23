import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { APP_CONFIG, HAS_GIPHY_API_KEY } from '@/constants/appConfig';
import { Attachment } from '@/types/dm';

let giphyInitialized = false;

const isNativeRuntime = Platform.OS === 'ios' || Platform.OS === 'android';

type GiphyMediaLike = {
  id?: string;
  url?: string;
  data?: {
    id?: string;
    images?: {
      original?: { url?: string; size?: string };
      fixed_height?: { url?: string };
      fixed_width?: { url?: string };
    };
  };
};

type GiphySdkModule = {
  GiphyContentType: { Gif: string };
  GiphyDialog: {
    configure: (config: Record<string, unknown>) => void;
    addListener: (eventType: string, listener: (...args: any[]) => void) => { remove: () => void };
    show: () => void;
  };
  GiphyDialogEvent: {
    MediaSelected: string;
    Dismissed: string;
  };
  GiphyFileExtension: { GIF: string };
  GiphySDK: {
    configure: (options: { apiKey: string }) => void;
  };
};

let cachedModule: GiphySdkModule | null = null;

function loadGiphyModule(): GiphySdkModule | null {
  if (cachedModule) return cachedModule;

  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' ||
    (Constants as any).appOwnership === 'expo';

  // Expo Go cannot load custom native modules like RTNGiphySDKModule.
  if (isExpoGo) {
    return null;
  }

  // Guard before require() so we never evaluate the package when native side is missing.
  if (!(NativeModules as Record<string, unknown>)?.RTNGiphySDKModule) {
    return null;
  }

  try {
    // Lazy-load native module so environments like Expo Go do not crash at import time.
    cachedModule = require('@giphy/react-native-sdk') as GiphySdkModule;
    return cachedModule;
  } catch {
    return null;
  }
}

function resolveGifUrl(media: GiphyMediaLike): string {
  const images = media?.data?.images;
  return (
    images?.original?.url ||
    images?.fixed_height?.url ||
    images?.fixed_width?.url ||
    media?.url ||
    ''
  );
}

function toGifAttachment(media: GiphyMediaLike): Attachment {
  const url = resolveGifUrl(media);
  const mediaId = media?.data?.id || media?.id || `${Date.now()}`;
  const size = Number(media?.data?.images?.original?.size);

  return {
    id: `giphy-${mediaId}`,
    url,
    filename: `giphy-${mediaId}.gif`,
    contentType: 'image/gif',
    size: Number.isFinite(size) ? size : undefined,
  };
}

export function initializeGiphySdk(): boolean {
  if (!isNativeRuntime || giphyInitialized || !HAS_GIPHY_API_KEY) {
    return giphyInitialized;
  }

  const giphy = loadGiphyModule();
  if (!giphy) {
    return false;
  }

  try {
    giphy.GiphySDK.configure({ apiKey: APP_CONFIG.giphyApiKey });
    giphy.GiphyDialog.configure({
      mediaTypeConfig: [giphy.GiphyContentType.Gif],
      selectedContentType: giphy.GiphyContentType.Gif,
      fileType: giphy.GiphyFileExtension.GIF,
      showConfirmationScreen: false,
      showSuggestionsBar: true,
    });
    giphyInitialized = true;
    return true;
  } catch (error) {
    console.warn('Failed to initialize GIPHY SDK', error);
    return false;
  }
}

export async function pickGifAttachment(): Promise<Attachment | null> {
  const giphy = loadGiphyModule();
  if (!giphy || !initializeGiphySdk()) {
    return null;
  }

  return new Promise<Attachment | null>((resolve) => {
    let settled = false;

    const onSelect = giphy.GiphyDialog.addListener(giphy.GiphyDialogEvent.MediaSelected, (event) => {
      if (settled) return;
      settled = true;
      cleanup();
      const attachment = toGifAttachment(event.media);
      resolve(attachment.url ? attachment : null);
    });

    const onDismiss = giphy.GiphyDialog.addListener(giphy.GiphyDialogEvent.Dismissed, () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(null);
    });

    const cleanup = () => {
      onSelect.remove();
      onDismiss.remove();
    };

    giphy.GiphyDialog.show();
  });
}
