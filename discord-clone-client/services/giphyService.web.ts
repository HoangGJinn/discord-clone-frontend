import { Attachment } from '@/types/dm';

/**
 * Giphy Service - Web Fallback
 * The Giphy SDK is not supported on web.
 */

export function initializeGiphySdk(): boolean {
  // Giphy SDK is not supported on web
  return false;
}

export async function pickGifAttachment(): Promise<Attachment | null> {
  // Giphy picker is not supported on web
  console.warn('Giphy picker is not supported on web platform.');
  return null;
}
