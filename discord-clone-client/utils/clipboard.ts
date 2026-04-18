/**
 * Clipboard utility – abstracts clipboard access behind a single async function.
 *
 * Tries expo-clipboard first (recommended), then falls back to the legacy
 * React Native Clipboard API that still ships with most RN builds.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoClipboard = require('expo-clipboard');
    await ExpoClipboard.setStringAsync(text);
    return true;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Clipboard: RNClipboard } = require('react-native');
      RNClipboard?.setString?.(text);
      return true;
    } catch {
      return false;
    }
  }
};
