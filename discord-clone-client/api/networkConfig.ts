import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const API_PORT = 8085;
const API_PATH = "api";
const SOCKET_PATH = "ws-native";

const getHostFromRuntime = (): string | null => {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  const match = scriptURL.match(/^(?:https?|exp):\/\/([^/:]+)/i);
  return match?.[1] ?? null;
};

const getHostIP = (): string => {
  const runtimeHost = getHostFromRuntime();
  if (runtimeHost) {
    return runtimeHost;
  }

  const legacyDebuggerHost = (Constants as any).manifest?.debuggerHost;
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    legacyDebuggerHost;

  if (debuggerHost) {
    return debuggerHost.split(":")[0];
  }

  return "localhost";
};

const getDefaultHostForPlatform = (): string => {
  const hostIP = getHostIP();

  if (Platform.OS === "android") {
    if (!hostIP || hostIP === "localhost" || hostIP === "127.0.0.1" || hostIP === "0.0.0.0") {
      return "10.0.2.2";
    }
    return hostIP;
  }

  if (Platform.OS === "ios") {
    if (hostIP && hostIP !== "127.0.0.1") {
      return hostIP;
    }
    return "localhost";
  }

  return "localhost";
};

const buildHttpUrl = (host: string): string => `http://${host}:${API_PORT}/${API_PATH}`;
const buildWsUrl = (host: string): string => `ws://${host}:${API_PORT}/${SOCKET_PATH}`;

const normalizeSocketUrl = (url: string): string => {
  const trimmed = url.trim();
  if (trimmed.endsWith("/ws")) {
    return `${trimmed}-native`;
  }
  return trimmed;
};

const toSocketUrlFromApiUrl = (apiUrl: string): string => {
  const normalizedApiUrl = apiUrl.trim().replace(/\/$/, "");
  const socketUrl = normalizedApiUrl
    .replace(/^http:/i, "ws:")
    .replace(/^https:/i, "wss:")
    .replace(/\/api$/i, "/ws-native");

  return normalizeSocketUrl(socketUrl);
};

export const resolveApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web") {
    return buildHttpUrl("localhost");
  }

  return buildHttpUrl(getDefaultHostForPlatform());
};

export const resolveSocketUrl = (): string => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return normalizeSocketUrl(process.env.EXPO_PUBLIC_SOCKET_URL);
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return toSocketUrlFromApiUrl(process.env.EXPO_PUBLIC_API_URL);
  }

  if (Platform.OS === "web") {
    return buildWsUrl("localhost");
  }

  return buildWsUrl(getDefaultHostForPlatform());
};
