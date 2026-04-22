/**
 * Agora Service - Web Fallback
 * The React Native Agora SDK is not supported on web.
 */

export const agoraService = {
  initialize: async () => true,
  createClient: async () => {
    console.warn('Agora is not supported on web.');
    return null;
  },
  joinChannel: async () => 0,
  leave: async () => {},
  startLocalTracks: async () => {},
  setAudioMuted: async () => {},
  setRemoteAudioPlaybackMuted: async () => {},
  setVideoEnabled: async () => {},
  enableAudio: async () => {},
  enableVideo: async () => {},
  switchCamera: async () => {},
  isInCall: () => false,
  onLocalVideo: () => {},
  onRemoteVideo: () => {},
  onRemoteVideoRemoved: () => {},
  onRemoteAudio: () => {},
  onRemoteAudioRemoved: () => {},
  onUserJoined: () => {},
  onUserLeft: () => {},
  setErrorHandler: () => {},
  onConnectionStateChanged: () => {},
  onRemoteSpeaking: () => {},
  onLocalSpeaking: () => {},
  clearCallbacks: () => {},
};

export default agoraService;
