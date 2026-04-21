/**
 * Services Configuration
 * Re-exports and extends networkConfig with service-specific constants
 */

import { resolveApiBaseUrl, resolveSocketUrl } from '@/api/networkConfig';

// Re-export network config
export const API_BASE_URL = resolveApiBaseUrl();
export const WS_URL = resolveSocketUrl();

// HTTP request timeout (ms)
export const REQUEST_TIMEOUT = 10000;

// Agora App ID (public, không phải secret)
export const AGORA_APP_ID = '3c77b79b9a3c48f68e1f50c395763093';
