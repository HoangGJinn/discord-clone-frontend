import { useAuthStore } from '@/store/useAuthStore';
import { useVoiceStore } from '@/store/useVoiceStore';
import { AGORA_APP_ID } from '@/services/config';
import {
  getVoiceToken,
  sendVoiceAction,
  subscribeVoice,
  unsubscribeVoice,
  VoiceMessage,
  VoiceState,
} from '@/services/voiceService';
import { ChannelResponse, getChannelById } from '@/services/serverService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Agora — chỉ import khi không phải web (native module)
let createAgoraRtcEngine: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let RtcSurfaceView: any = null;
let VideoSourceType: any = null;
let VideoStreamType: any = null;
let RenderModeType: any = null;
let ScreenCaptureConfiguration: any = null;
let ScreenCaptureParameters2: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const agora = require('react-native-agora');
    createAgoraRtcEngine = agora.createAgoraRtcEngine;
    ChannelProfileType = agora.ChannelProfileType;
    ClientRoleType = agora.ClientRoleType;
    RtcSurfaceView = agora.RtcSurfaceView;
    VideoSourceType = agora.VideoSourceType;
    VideoStreamType = agora.VideoStreamType;
    RenderModeType = agora.RenderModeType;
    ScreenCaptureConfiguration = agora.ScreenCaptureConfiguration;
    ScreenCaptureParameters2 = agora.ScreenCaptureParameters2;
  } catch (e) {
    console.warn('react-native-agora not available:', e);
  }
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#5865F2', '#3BA55C', '#FAA61A', '#ED4245', '#9B84EE', '#EB459E'];

const avatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initials = (name: string) => {
  const w = name.trim().split(' ');
  return w.length >= 2 ? (w[0][0] + w[w.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

// ─── Participant Card ─────────────────────────────────────────────────────────

function ParticipantCard({
  state,
  isSpeaking,
  hasVideo,
  videoSourceType,
  remoteUid,
  isLocal,
  variant = 'grid',
  isPinned = false,
  onPress,
}: {
  state: VoiceState;
  isSpeaking: boolean;
  hasVideo: boolean;
  videoSourceType?: number;
  remoteUid?: number;
  isLocal: boolean;
  variant?: 'grid' | 'featured' | 'pip' | 'strip';
  isPinned?: boolean;
  onPress?: () => void;
}) {
  const color = avatarColor(state.userId);
  const label = state.userId;
  const shortName = label.length > 12 ? label.slice(0, 12) + '…' : label;
  const speaking = isSpeaking && !state.isMuted;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        styles.cardTouchable,
        variant === 'featured' && styles.cardTouchableFeatured,
        variant === 'pip' && styles.cardTouchablePip,
        variant === 'strip' && styles.cardTouchableStrip,
      ]}
      disabled={!onPress}
    >
      <View
        style={[
          styles.card,
          variant === 'featured' && styles.cardFeatured,
          variant === 'pip' && styles.cardPip,
          variant === 'strip' && styles.cardStrip,
          speaking && styles.cardSpeaking,
        ]}
      >
      {/* PHẦN HIỂN THỊ CHÍNH (VIDEO HOẶC AVATAR) */}
      {hasVideo && RtcSurfaceView && (isLocal || remoteUid !== undefined) ? (
        <View style={styles.videoCardContainer}>
          {(() => {
            // For remote streams, let SDK pick the bound source to avoid black frames on some devices.
            const shouldForceSourceType = Boolean(isLocal);
            const baseCanvas: any = {
              uid: isLocal ? 0 : remoteUid,
              renderMode: RenderModeType.RenderModeHidden,
            };

            if (shouldForceSourceType) {
              baseCanvas.sourceType = videoSourceType ?? VideoSourceType.VideoSourceCameraPrimary;
            }

            return (
          <RtcSurfaceView
            style={styles.videoViewFull}
            canvas={baseCanvas}
          />
            );
          })()}
        </View>
      ) : (
        <View style={styles.avatarModeContainer}>
          <View style={[styles.avatarCircle, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>{initials(label)}</Text>
          </View>
        </View>
      )}

      {/* OVERLAY: TÊN (GÓC DƯỚI TRÁI) */}
      <View style={styles.nameTagOverlay}>
        <Text style={styles.nameTagText}>{shortName}</Text>
      </View>

      {isPinned && (
        <View style={styles.pinBadgeOverlay}>
          <View style={styles.statusBadgeCircle}>
            <Ionicons name="pin" size={12} color="#fff" />
          </View>
        </View>
      )}

      <View
        style={[
          styles.statusBadgesOverlay,
          variant === 'featured' && styles.statusBadgesOverlayFeatured,
        ]}
      >
        {state.isDeafened && (
          <View style={styles.statusBadgeCircle}>
            <Ionicons name="volume-mute" size={12} color="#fff" />
          </View>
        )}
        {state.isMuted && (
          <View style={styles.statusBadgeCircle}>
            <Ionicons name="mic-off" size={12} color="#fff" />
          </View>
        )}
        {state.hasScreenShare && (
          <View style={styles.statusBadgeCircle}>
            <Ionicons name="desktop-outline" size={12} color="#fff" />
          </View>
        )}
      </View>
      </View>
    </TouchableOpacity>
  );
}

type RemoteVideoUidEntry = {
  cameraUid?: number;
  screenUid?: number;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VoiceRoomScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    participants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipants,
    clearParticipants,
    speakingUsers,
    setSpeakingUsers,
    clearCameraUsers,
  } = useVoiceStore();

  const { channelId, channelName, serverId } = useLocalSearchParams<{
    channelId: string;
    channelName: string;
    serverId: string;
  }>();

  const [remoteUidMap, setRemoteUidMap] = useState<Record<string, RemoteVideoUidEntry>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [channelInfo, setChannelInfo] = useState<ChannelResponse | null>(null);
  const [pinnedVideoUserId, setPinnedVideoUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'spotlight' | 'grid'>('spotlight');

  const engineRef = useRef<any>(null);
  const uidToUserIdMap = useRef<Map<number, string>>(new Map());
  const remoteUidMapRef = useRef<Record<string, RemoteVideoUidEntry>>({});
  const participantsRef = useRef<VoiceState[]>([]);
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const screenSharePendingRef = useRef(false);
  const screenSharePublishedRef = useRef(false);
  const screenShareActivationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pipPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pipOffset = useRef({ x: 0, y: 0 });
  const channelIdNum = Number(channelId);
  const resolvedServerId = serverId ? Number(serverId) : channelInfo?.serverId ?? NaN;
  const serverIdNum = Number.isFinite(resolvedServerId) ? resolvedServerId : NaN;
  const resolvedChannelName = channelName || channelInfo?.name || '';
  const userId = user?.id ?? '';

  const toWireVoiceState = (state: VoiceState) => ({
    ...state,
    muted: state.isMuted,
    deafened: state.isDeafened,
    screenShare: state.hasScreenShare,
  }) as any;

  const clearScreenShareActivationTimeout = useCallback(() => {
    if (screenShareActivationTimeoutRef.current) {
      clearTimeout(screenShareActivationTimeoutRef.current);
      screenShareActivationTimeoutRef.current = null;
    }
  }, []);

  const syncRemoteUidMap = useCallback((next: Record<string, RemoteVideoUidEntry>) => {
    remoteUidMapRef.current = next;
    setRemoteUidMap(next);
  }, []);

  const getParticipantVideoUid = useCallback(
    (participant: VoiceState) => {
      if (participant.userId === userId) {
        return 0;
      }

      const rawEntry = (remoteUidMap as Record<string, RemoteVideoUidEntry | number>)[participant.userId];

      // Backward compatibility: tolerate stale numeric shape from previous app state.
      if (typeof rawEntry === 'number') {
        return rawEntry;
      }

      const entry = rawEntry;
      if (entry) {
        if (participant.hasScreenShare && entry.screenUid !== undefined) {
          return entry.screenUid;
        }

        if (participant.hasCamera && entry.cameraUid !== undefined) {
          return entry.cameraUid;
        }

        const merged = entry.screenUid ?? entry.cameraUid;
        if (merged !== undefined) {
          return merged;
        }
      }

      // Last-resort lookup from uid->userId index to avoid blank remote tiles.
      for (const [mappedUid, mappedUserId] of uidToUserIdMap.current.entries()) {
        if (mappedUserId === participant.userId) {
          return mappedUid;
        }
      }

      return undefined;
    },
    [remoteUidMap, userId]
  );

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    if (!pinnedVideoUserId) {
      return;
    }
    const stillVisible = participants.some(
      (participant) =>
        participant.userId === pinnedVideoUserId &&
        Boolean(participant.hasCamera || participant.hasScreenShare)
    );
    if (!stillVisible) {
      setPinnedVideoUserId(null);
    }
  }, [participants, pinnedVideoUserId]);

  useEffect(() => {
    if (serverId && channelName) {
      return;
    }

    if (!channelIdNum || Number.isNaN(channelIdNum)) {
      return;
    }

    let mounted = true;

    const loadChannelInfo = async () => {
      try {
        const info = await getChannelById(channelIdNum);
        if (mounted) {
          setChannelInfo(info);
        }
      } catch (error) {
        console.warn('[Voice] Failed to load channel info:', error);
      }
    };

    void loadChannelInfo();

    return () => {
      mounted = false;
    };
  }, [channelIdNum, channelName, serverId]);

  // ── Initialize Agora & join room ──────────────────────────────────────────

  const requestMicPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Quyền dùng micro',
          message: 'Voice chat cần quyền micro để bạn có thể nói chuyện.',
          buttonPositive: 'Cấp quyền',
          buttonNegative: 'Từ chối',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('Permission request error:', e);
      return false;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Quyền dùng camera',
          message: 'Voice chat cần quyền camera để bạn có thể bật video.',
          buttonPositive: 'Cấp quyền',
          buttonNegative: 'Từ chối',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('Camera permission request error:', e);
      return false;
    }
  };

  const handleVoiceSocketMessage = useCallback(
    (msg: VoiceMessage) => {
      const inCurrentChannel = (rawChannelId: unknown) => {
        const normalized = Number(rawChannelId);
        return Number.isFinite(normalized) && normalized === channelIdNum;
      };

      const isKnownParticipant = (candidateUserId: string) =>
        participantsRef.current.some((participant) => participant.userId === candidateUserId);

      const normalizeIncomingState = (state: any): VoiceState => {
        const mutedValue = state?.isMuted ?? state?.muted ?? false;
        const deafenedValue = state?.isDeafened ?? state?.deafened ?? false;
        const hasCameraValue = state?.hasCamera ?? state?.isHasCamera ?? false;
        const hasScreenShareValue = state?.hasScreenShare ?? state?.screenShare ?? false;

        return {
          userId: String(state?.userId ?? ''),
          channelId: Number.isFinite(Number(state?.channelId)) ? Number(state.channelId) : channelIdNum,
          serverId: Number.isFinite(Number(state?.serverId)) ? Number(state.serverId) : serverIdNum,
          sessionId: state?.sessionId,
          isMuted: Boolean(mutedValue),
          isDeafened: Boolean(deafenedValue),
          hasCamera: Boolean(hasCameraValue),
          hasScreenShare: Boolean(hasScreenShareValue),
        };
      };

      if (msg.type === 'INITIAL_SYNC' && msg.states) {
        const roomStates = msg.states
          .map((state) => normalizeIncomingState(state))
          .filter((state) => inCurrentChannel(state.channelId));
        const hasLocal = roomStates.some((state) => state.userId === userId);
        setParticipants(
          hasLocal
            ? roomStates
            : [
                ...roomStates,
                {
                  userId,
                  channelId: channelIdNum,
                  serverId: serverIdNum,
                  isMuted: isMutedRef.current,
                  isDeafened: isDeafenedRef.current,
                  hasCamera: false,
                  hasScreenShare: false,
                },
              ]
        );
      } else if (msg.type === 'JOIN' && msg.state) {
        if (!inCurrentChannel(msg.state.channelId)) return;
        addParticipant(normalizeIncomingState(msg.state));
      } else if (msg.type === 'LEAVE' && msg.state) {
        if (!inCurrentChannel(msg.state.channelId)) return;
        removeParticipant(String(msg.state.userId));
      } else if (msg.type === 'UPDATE_STATE' && msg.state) {
        const normalizedState = normalizeIncomingState(msg.state);
        if (__DEV__) {
          console.log('[Voice][WS] UPDATE_STATE raw:', msg.state);
          console.log('[Voice][WS] UPDATE_STATE normalized:', normalizedState);
        }
        const shouldApply =
          inCurrentChannel(normalizedState.channelId) ||
          (!Number.isFinite(Number(msg.state.channelId)) && isKnownParticipant(normalizedState.userId));
        if (!shouldApply) return;
        updateParticipant(normalizedState);
      }
    },
    [channelIdNum, userId, serverIdNum, addParticipant, removeParticipant, updateParticipant, setParticipants]
  );

  const initVoice = useCallback(async () => {
    // Guard: tránh khởi tạo 2 lần nếu component re-render
    if (engineRef.current) return;

    if (!Number.isFinite(channelIdNum) || !Number.isFinite(serverIdNum) || !userId) {
      setStatus('error');
      Alert.alert('Thiếu dữ liệu phòng', 'Không xác định được kênh voice hoặc server hiện tại.');
      return;
    }

    try {
      // Reset local camera state whenever entering room to avoid stale UI/RTC mismatch.
      setIsCameraOn(false);

      // 0. Xin quyền micro trước khi khởi tạo Agora
      const hasMic = await requestMicPermission();
      if (!hasMic) {
        Alert.alert(
          'Cần quyền micro',
          'Vui lòng cấp quyền micro trong Cài đặt > Ứng dụng để sử dụng voice chat.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // 1. Lấy Agora token từ backend (hoặc dùng rỗng nếu testing mode)
      let tokenToUse = '';
      try {
        const tokenRes = await getVoiceToken(channelIdNum, userId);
        tokenToUse = tokenRes.token || '';
      } catch (err) {
        console.warn('[Voice] Token fetch failed, using empty token:', err);
        tokenToUse = '';
      }

      // 2. Kết nối WebSocket và subscribe
      await subscribeVoice(serverIdNum, handleVoiceSocketMessage);

      // 3. Gửi JOIN event qua WebSocket
      addParticipant({
        userId,
        channelId: channelIdNum,
        serverId: serverIdNum,
        isMuted: false,
        isDeafened: false,
        hasCamera: false,
        hasScreenShare: false,
      });

      await sendVoiceAction({
        type: 'JOIN',
        state: toWireVoiceState({
          userId,
          channelId: channelIdNum,
          serverId: serverIdNum,
          isMuted: false,
          isDeafened: false,
          hasCamera: false,
          hasScreenShare: false,
        }),
      });

      // 4. Khởi tạo Agora RTC engine
      if (createAgoraRtcEngine) {
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        const isScreenSourceType = (sourceType?: number) => {
          if (sourceType === undefined || sourceType === null) {
            return false;
          }

          const screenTypes = [
            VideoSourceType?.VideoSourceScreenPrimary,
            VideoSourceType?.VideoSourceScreen,
            VideoSourceType?.VideoSourceScreenSecondary,
            VideoSourceType?.VideoSourceScreenThird,
            VideoSourceType?.VideoSourceScreenFourth,
          ].filter((value) => typeof value === 'number');

          return screenTypes.includes(sourceType);
        };

        const setMappedUidForUser = (
          mappedUserId: string,
          remoteUid: number,
          sourceHint?: 'camera' | 'screen'
        ) => {
          const currentEntry = remoteUidMapRef.current[mappedUserId] ?? {};
          const nextEntry: RemoteVideoUidEntry = { ...currentEntry };

          if (sourceHint === 'screen') {
            nextEntry.screenUid = remoteUid;
          } else if (sourceHint === 'camera') {
            nextEntry.cameraUid = remoteUid;
          } else if (nextEntry.cameraUid === undefined) {
            nextEntry.cameraUid = remoteUid;
          } else if (nextEntry.screenUid === undefined && nextEntry.cameraUid !== remoteUid) {
            nextEntry.screenUid = remoteUid;
          }

          uidToUserIdMap.current.set(remoteUid, mappedUserId);
          syncRemoteUidMap({
            ...remoteUidMapRef.current,
            [mappedUserId]: nextEntry,
          });
        };

        const ensureRemoteVideoSubscription = (remoteUid: number) => {
          if (!remoteUid || remoteUid === 0) {
            return;
          }

          const unmuteRes = engine.muteRemoteVideoStream?.(remoteUid, false);
          if (typeof unmuteRes === 'number' && unmuteRes < 0) {
            console.warn('[Voice] muteRemoteVideoStream(false) failed:', remoteUid, unmuteRes);
          }

          const highStream = VideoStreamType?.VideoStreamHigh;
          if (highStream !== undefined) {
            const streamRes = engine.setRemoteVideoStreamType?.(remoteUid, highStream);
            if (typeof streamRes === 'number' && streamRes < 0) {
              console.warn('[Voice] setRemoteVideoStreamType(high) failed:', remoteUid, streamRes);
            }
          }
        };

        const announceScreenShareStarted = () => {
          if (!screenSharePendingRef.current && !isScreenSharingRef.current) {
            return;
          }
          if (screenSharePublishedRef.current) {
            return;
          }

          screenSharePendingRef.current = false;
          screenSharePublishedRef.current = true;
          clearScreenShareActivationTimeout();

          updateParticipant({
            userId,
            channelId: channelIdNum,
            serverId: serverIdNum,
            isMuted: isMutedRef.current,
            isDeafened: isDeafenedRef.current,
            hasCamera: false,
            hasScreenShare: true,
          });

          void sendVoiceAction({
            type: 'UPDATE_STATE',
            state: toWireVoiceState({
              userId,
              channelId: channelIdNum,
              serverId: serverIdNum,
              isMuted: isMutedRef.current,
              isDeafened: isDeafenedRef.current,
              hasCamera: false,
              hasScreenShare: true,
            }),
          });

          if (__DEV__) {
            console.log('[Voice] Screen share confirmed; broadcasted hasScreenShare=true');
          }
        };

        const mapRemoteUidToParticipant = (
          remoteUid: number,
          sourceHint?: 'camera' | 'screen'
        ): string | undefined => {
          const existing = uidToUserIdMap.current.get(remoteUid);
          if (existing) {
            setMappedUidForUser(existing, remoteUid, sourceHint);
            return existing;
          }

          const fallback = participantsRef.current.find((participant) => {
            if (participant.userId === userId || participant.channelId !== channelIdNum) {
              return false;
            }

            const entry = remoteUidMapRef.current[participant.userId] ?? {};

            if (participant.hasScreenShare && !participant.hasCamera) {
              return entry.screenUid === undefined;
            }

            if (participant.hasCamera && !participant.hasScreenShare) {
              return entry.cameraUid === undefined;
            }

            if (participant.hasCamera && participant.hasScreenShare) {
              return entry.cameraUid === undefined || entry.screenUid === undefined;
            }

            return entry.cameraUid === undefined;
          });

          if (!fallback) return undefined;

          setMappedUidForUser(fallback.userId, remoteUid, sourceHint);
          return fallback.userId;
        };

        engine.initialize({ appId: AGORA_APP_ID });

        engine.registerEventHandler({
          onJoinChannelSuccess: () => {
            console.log('[Voice] ✅ Joined channel');
            setIsJoined(true);
            setStatus('connected');
            // Keep join callback minimal to avoid transient native errors on some devices.
            engine.muteLocalAudioStream(false);
            // Enable volume indication: 300ms interval
            engine.enableAudioVolumeIndication(300, 3, true);
          },
          onFirstLocalVideoFrame: (source: number, width: number, height: number, elapsed: number) => {
            if (isScreenSourceType(source)) {
              if (__DEV__) {
                console.log('[Voice] onFirstLocalVideoFrame(screen):', JSON.stringify({ source, width, height, elapsed }));
              }
              announceScreenShareStarted();
            }
          },
          onVideoPublishStateChanged: (
            source: number,
            channel: string,
            oldState: number,
            newState: number,
            elapseSinceLastState: number
          ) => {
            if (__DEV__) {
              console.log(
                '[Voice] onVideoPublishStateChanged',
                JSON.stringify({ source, channel, oldState, newState, elapseSinceLastState })
              );
            }

            if (isScreenSourceType(source) && newState !== 0) {
              announceScreenShareStarted();
            }
          },
          onUserInfoUpdated: (uid: number, userInfo: any) => {
            if (userInfo?.userAccount) {
              const userAccount = String(userInfo.userAccount);
              const participant = participantsRef.current.find((p) => p.userId === userAccount);
              const sourceHint: 'camera' | 'screen' | undefined = participant?.hasScreenShare
                ? 'screen'
                : participant?.hasCamera
                  ? 'camera'
                  : undefined;

              setMappedUidForUser(userAccount, uid, sourceHint);

              console.log('[Voice] uid map:', uid, '→', userAccount);
            }
          },
          onAudioVolumeIndication: (...args: any[]) => {
            const speakers: any[] = Array.isArray(args[0])
              ? args[0]
              : Array.isArray(args[1])
                ? args[1]
                : [];
            const speaking = new Set<string>();
            for (const s of speakers) {
              if ((s.volume ?? 0) > 15) {
                if (s.uid === 0) {
                  speaking.add(userId);
                } else {
                  const mapped = uidToUserIdMap.current.get(s.uid);
                  if (mapped) {
                    speaking.add(mapped);
                  } else if (s.userAccount) {
                    speaking.add(s.userAccount);
                  }
                }
              }
            }
            setSpeakingUsers(speaking);
          },
          onUserJoined: (_connection: any, remoteUid: number) => {
            console.log('[Voice] 👥 Remote user joined uid:', remoteUid);
            mapRemoteUidToParticipant(remoteUid, 'camera');
            ensureRemoteVideoSubscription(remoteUid);
          },
          onUserOffline: (_connection: any, remoteUid: number) => {
            console.log('[Voice] 👤 Remote user left uid:', remoteUid);
            const userAccount = uidToUserIdMap.current.get(remoteUid);
            if (userAccount) {
              const next = { ...remoteUidMapRef.current };
              const entry = next[userAccount];
              if (entry) {
                const updatedEntry: RemoteVideoUidEntry = { ...entry };
                if (updatedEntry.cameraUid === remoteUid) {
                  delete updatedEntry.cameraUid;
                }
                if (updatedEntry.screenUid === remoteUid) {
                  delete updatedEntry.screenUid;
                }

                if (updatedEntry.cameraUid === undefined && updatedEntry.screenUid === undefined) {
                  delete next[userAccount];
                } else {
                  next[userAccount] = updatedEntry;
                }

                syncRemoteUidMap(next);
              }
            }
            uidToUserIdMap.current.delete(remoteUid);
          },
          onUserEnableVideo: (_connection: any, remoteUid: number, enabled: boolean) => {
            const userAccount = mapRemoteUidToParticipant(remoteUid, 'camera');
            if (!userAccount) return;
            if (enabled) {
              ensureRemoteVideoSubscription(remoteUid);
            }
            updateParticipant({
              userId: userAccount,
              channelId: channelIdNum,
              serverId: serverIdNum,
              isMuted: participantsRef.current.find((p) => p.userId === userAccount)?.isMuted ?? false,
              isDeafened: participantsRef.current.find((p) => p.userId === userAccount)?.isDeafened ?? false,
              hasCamera: enabled,
              hasScreenShare: participantsRef.current.find((p) => p.userId === userAccount)?.hasScreenShare ?? false,
            });
          },
          onUserMuteVideo: (_connection: any, remoteUid: number, muted: boolean) => {
            const userAccount = mapRemoteUidToParticipant(remoteUid, 'camera');
            if (!userAccount) return;
            updateParticipant({
              userId: userAccount,
              channelId: channelIdNum,
              serverId: serverIdNum,
              isMuted: participantsRef.current.find((p) => p.userId === userAccount)?.isMuted ?? false,
              isDeafened: participantsRef.current.find((p) => p.userId === userAccount)?.isDeafened ?? false,
              hasCamera: !muted,
              hasScreenShare: participantsRef.current.find((p) => p.userId === userAccount)?.hasScreenShare ?? false,
            });
          },
          onVideoSizeChanged: (
            _connection: any,
            sourceType: number,
            remoteUid: number,
            width: number,
            height: number
          ) => {
            if (!remoteUid || remoteUid === 0) {
              return;
            }

            const sourceHint: 'camera' | 'screen' = isScreenSourceType(sourceType)
              ? 'screen'
              : 'camera';
            const userAccount = mapRemoteUidToParticipant(remoteUid, sourceHint);
            ensureRemoteVideoSubscription(remoteUid);

            if (__DEV__) {
              console.log(
                '[Voice] onVideoSizeChanged',
                JSON.stringify({ sourceType, remoteUid, width, height, sourceHint, userAccount })
              );
            }
          },
          onVideoSubscribeStateChanged: (
            channel: string,
            uid: number,
            oldState: number,
            newState: number,
            elapseSinceLastState: number
          ) => {
            if (__DEV__) {
              console.log(
                '[Voice] onVideoSubscribeStateChanged',
                JSON.stringify({ channel, uid, oldState, newState, elapseSinceLastState })
              );
            }
          },
          onError: (err: number, msg: string) => {
            // 1052 is often transient on mobile and does not always break media flow.
            if (err === 1052) {
              console.warn('[Voice] Agora warning 1052 (transient):', msg);
              return;
            }
            console.error('[Voice] ❌ Agora error:', err, msg);
            setStatus('error');
          },
          onPermissionError: (permissionType: number) => {
            console.warn('[Voice] Permission error:', permissionType);
            // 2 is screen capture permission in Agora docs.
            if (permissionType === 2) {
              screenSharePendingRef.current = false;
              screenSharePublishedRef.current = false;
              clearScreenShareActivationTimeout();
              setIsScreenSharing(false);
              updateParticipant({
                userId,
                channelId: channelIdNum,
                serverId: serverIdNum,
                isMuted: isMutedRef.current,
                isDeafened: isDeafenedRef.current,
                hasCamera: false,
                hasScreenShare: false,
              });
              void sendVoiceAction({
                type: 'UPDATE_STATE',
                state: toWireVoiceState({
                  userId,
                  channelId: channelIdNum,
                  serverId: serverIdNum,
                  isMuted: isMutedRef.current,
                  isDeafened: isDeafenedRef.current,
                  hasCamera: false,
                  hasScreenShare: false,
                }),
              });
              Alert.alert(
                'Chưa cấp quyền chia sẻ màn hình',
                'Bạn đã từ chối quyền ghi màn hình. Hãy bấm Chia sẻ màn hình và chọn Cho phép để tiếp tục.'
              );
            }
          },
        });

        engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        engine.enableAudio();
        engine.enableVideo();
        engine.setDefaultAudioRouteToSpeakerphone(true);

        const highStream = VideoStreamType?.VideoStreamHigh;
        if (highStream !== undefined) {
          const defaultStreamRes = engine.setRemoteDefaultVideoStreamType?.(highStream);
          if (typeof defaultStreamRes === 'number' && defaultStreamRes < 0) {
            console.warn('[Voice] setRemoteDefaultVideoStreamType(high) failed:', defaultStreamRes);
          }
        }

        console.log(`[Voice] Joining channel: ${channelIdNum}`);
        engine.joinChannelWithUserAccount(tokenToUse, String(channelIdNum), userId, {
          clientRoleType: ClientRoleType?.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: false,
          publishScreenCaptureVideo: false,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      } else {
        // No Agora (web/Expo Go)
        setStatus('connected');
      }
    } catch (err: any) {
      console.error('[Voice] Init error:', err);
      setStatus('error');
      Alert.alert('Lỗi', 'Không thể kết nối phòng thoại: ' + (err.message ?? err));
    }
  }, [
    channelIdNum,
    serverIdNum,
    userId,
    addParticipant,
    handleVoiceSocketMessage,
    setSpeakingUsers,
    updateParticipant,
    router,
    syncRemoteUidMap,
    clearScreenShareActivationTimeout,
  ]);

  useEffect(() => {
    initVoice();

    return () => {
      clearScreenShareActivationTimeout();
      screenSharePendingRef.current = false;
      screenSharePublishedRef.current = false;
      // Cleanup
      if (engineRef.current) {
        try {
          const screenSourceType =
            VideoSourceType?.VideoSourceScreenPrimary ?? VideoSourceType?.VideoSourceScreen;
          engineRef.current.stopPreview?.(screenSourceType);
          engineRef.current.stopScreenCaptureBySourceType?.(screenSourceType);
          engineRef.current.stopScreenCapture?.();
          // Explicitly disable local video before leaving to prevent camera from staying active.
          engineRef.current.stopPreview?.();
          engineRef.current.muteLocalVideoStream?.(true);
          engineRef.current.enableLocalVideo?.(false);
        } catch (cameraCleanupError) {
          console.warn('[Voice] camera cleanup error:', cameraCleanupError);
        }
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
      setIsCameraOn(false);
      setIsScreenSharing(false);
      if (Number.isFinite(serverIdNum) && userId) {
        sendVoiceAction({
          type: 'LEAVE',
          state: toWireVoiceState({
            userId,
            channelId: channelIdNum,
            serverId: serverIdNum,
            isMuted: isMutedRef.current,
            isDeafened: isDeafenedRef.current,
            hasCamera: false,
            hasScreenShare: false,
          }),
        });
        unsubscribeVoice(serverIdNum, handleVoiceSocketMessage);
      }
      clearParticipants();
      clearCameraUsers();
    };
  }, [
    initVoice,
    channelIdNum,
    serverIdNum,
    userId,
    clearCameraUsers,
    clearParticipants,
    handleVoiceSocketMessage,
    clearScreenShareActivationTimeout,
  ]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
    engineRef.current?.muteLocalAudioStream(next);
    updateParticipant({
      userId,
      channelId: channelIdNum,
      serverId: serverIdNum,
      isMuted: next,
      isDeafened,
      hasCamera: isCameraOn,
      hasScreenShare: screenSharePublishedRef.current,
    });
    sendVoiceAction({
      type: 'UPDATE_STATE',
      state: toWireVoiceState({
        userId,
        channelId: channelIdNum,
        serverId: serverIdNum,
        isMuted: next,
        isDeafened,
        hasCamera: isCameraOn,
        hasScreenShare: screenSharePublishedRef.current,
      }),
    });
  }, [isMuted, isDeafened, isCameraOn, userId, channelIdNum, serverIdNum, updateParticipant]);

  const toggleDeafen = useCallback(() => {
    const next = !isDeafened;
    setIsDeafened(next);
    isDeafenedRef.current = next;
    engineRef.current?.muteAllRemoteAudioStreams(next);
    // Auto-mute mic when deafened
    if (next && !isMuted) {
      setIsMuted(true);
      isMutedRef.current = true;
      engineRef.current?.muteLocalAudioStream(true);
    }
    updateParticipant({
      userId,
      channelId: channelIdNum,
      serverId: serverIdNum,
      isMuted: next ? true : isMuted,
      isDeafened: next,
      hasCamera: isCameraOn,
      hasScreenShare: screenSharePublishedRef.current,
    });
    sendVoiceAction({
      type: 'UPDATE_STATE',
      state: toWireVoiceState({
        userId,
        channelId: channelIdNum,
        serverId: serverIdNum,
        isMuted: next ? true : isMuted,
        isDeafened: next,
        hasCamera: isCameraOn,
        hasScreenShare: screenSharePublishedRef.current,
      }),
    });
  }, [isDeafened, isMuted, isCameraOn, userId, channelIdNum, serverIdNum, updateParticipant]);

  const toggleCamera = useCallback(async () => {
    const engine = engineRef.current;
    const screenSourceType =
      VideoSourceType?.VideoSourceScreenPrimary ?? VideoSourceType?.VideoSourceScreen;
    if (!engine) {
      Alert.alert('Chưa sẵn sàng', 'Đang kết nối voice, vui lòng thử lại sau vài giây.');
      return;
    }

    if (!isJoined) {
      Alert.alert('Đang vào phòng', 'Hãy chờ kết nối hoàn tất rồi bật camera.');
      return;
    }

    if (!isCameraOn) {
      const hasCamera = await requestCameraPermission();
      if (!hasCamera) {
        Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera để bật video.');
        return;
      }
      try {
        // Camera and screen share are mutually exclusive in this room UI.
        if (isScreenSharing) {
          const stopByTypeRes = engine.stopScreenCaptureBySourceType?.(screenSourceType);
          if (typeof stopByTypeRes === 'number' && stopByTypeRes < 0) {
            engine.stopScreenCapture?.();
          }
          engine.stopPreview?.(screenSourceType);
          clearScreenShareActivationTimeout();
          screenSharePendingRef.current = false;
          screenSharePublishedRef.current = false;
          setIsScreenSharing(false);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Đã tắt chia sẻ màn hình để bật camera', ToastAndroid.SHORT);
          }
        }
        engine.enableVideo();
        engine.enableLocalVideo(true);
        engine.muteLocalVideoStream(false);
        engine.startPreview();
        engine.updateChannelMediaOptions?.({
          publishMicrophoneTrack: !isMutedRef.current,
          publishCameraTrack: true,
          publishScreenCaptureVideo: false,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
          clientRoleType: ClientRoleType?.ClientRoleBroadcaster,
        });
        setIsCameraOn(true);
        updateParticipant({
          userId,
          channelId: channelIdNum,
          serverId: serverIdNum,
          isMuted: isMutedRef.current,
          isDeafened: isDeafenedRef.current,
          hasCamera: true,
          hasScreenShare: false,
        });
        sendVoiceAction({
          type: 'UPDATE_STATE',
          state: toWireVoiceState({
            userId,
            channelId: channelIdNum,
            serverId: serverIdNum,
            isMuted: isMutedRef.current,
            isDeafened: isDeafenedRef.current,
            hasCamera: true,
            hasScreenShare: false,
          }),
        });
      } catch (error) {
        console.error('[Voice] Failed to enable camera:', error);
        Alert.alert('Lỗi camera', 'Không thể bật camera. Vui lòng thử lại.');
      }
    } else {
      try {
        engine.stopPreview();
        engine.muteLocalVideoStream(true);
        engine.enableLocalVideo(false);
        engine.updateChannelMediaOptions?.({
          publishMicrophoneTrack: !isMutedRef.current,
          publishCameraTrack: false,
          publishScreenCaptureVideo: false,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
          clientRoleType: ClientRoleType?.ClientRoleBroadcaster,
        });
        setIsCameraOn(false);
        updateParticipant({
          userId,
          channelId: channelIdNum,
          serverId: serverIdNum,
          isMuted: isMutedRef.current,
          isDeafened: isDeafenedRef.current,
          hasCamera: false,
          hasScreenShare: false,
        });
        sendVoiceAction({
          type: 'UPDATE_STATE',
          state: toWireVoiceState({
            userId,
            channelId: channelIdNum,
            serverId: serverIdNum,
            isMuted: isMutedRef.current,
            isDeafened: isDeafenedRef.current,
            hasCamera: false,
            hasScreenShare: false,
          }),
        });
      } catch (error) {
        console.error('[Voice] Failed to disable camera:', error);
      }
    }
  }, [
    isCameraOn,
    isJoined,
    isScreenSharing,
    userId,
    channelIdNum,
    serverIdNum,
    updateParticipant,
    clearScreenShareActivationTimeout,
  ]);

  const flipCamera = useCallback(async () => {
    if (engineRef.current && isCameraOn) {
      try {
        await engineRef.current.switchCamera();
      } catch (error) {
        console.error('[Voice] Failed to flip camera:', error);
        Alert.alert('Lỗi camera', 'Không thể đổi camera lúc này.');
      }
    } else if (!isCameraOn) {
      Alert.alert('Thông báo', 'Bạn cần bật camera trước khi chuyển đổi.');
    }
  }, [isCameraOn]);

  const handleLeave = useCallback(() => {
    router.back();
  }, [router]);

  const getParticipantVideoSourceType = useCallback((participant: VoiceState) => {
    const screenSourceType =
      VideoSourceType?.VideoSourceScreenPrimary ?? VideoSourceType?.VideoSourceScreen;
    return participant.hasScreenShare
      ? screenSourceType
      : VideoSourceType?.VideoSourceCameraPrimary;
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) {
      Alert.alert('Chưa sẵn sàng', 'Đang kết nối voice, vui lòng thử lại sau vài giây.');
      return;
    }

    if (!isJoined) {
      Alert.alert('Đang vào phòng', 'Hãy chờ kết nối hoàn tất rồi chia sẻ màn hình.');
      return;
    }

    const next = !isScreenSharing;
    const screenSourceType =
      VideoSourceType?.VideoSourceScreenPrimary ?? VideoSourceType?.VideoSourceScreen;

    try {
      if (next) {
        const captureParams = ScreenCaptureParameters2
          ? new ScreenCaptureParameters2()
          : { captureVideo: true };
        captureParams.captureVideo = true;
        captureParams.captureAudio = false;
        captureParams.videoParams = {
          dimensions: { width: 1280, height: 720 },
          frameRate: 15,
          bitrate: 0,
        };

        // Camera and screen share are mutually exclusive in this room UI.
        if (isCameraOn) {
          engine.stopPreview?.();
          engine.muteLocalVideoStream?.(true);
          engine.enableLocalVideo?.(false);
          setIsCameraOn(false);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Đã tắt camera để bật chia sẻ màn hình', ToastAndroid.SHORT);
          }
        }
        engine.enableVideo?.();

        // Prefer sourceType APIs so render source and published source stay aligned.
        let startSucceeded = false;
        if (engine.startScreenCaptureBySourceType) {
          try {
            const sourceConfig = ScreenCaptureConfiguration ? new ScreenCaptureConfiguration() : {};
            sourceConfig.captureVideo = true;
            sourceConfig.captureAudio = false;
            sourceConfig.videoParams = captureParams.videoParams;

            const byTypeRes = engine.startScreenCaptureBySourceType(
              screenSourceType,
              sourceConfig
            );
            if (byTypeRes === undefined || (typeof byTypeRes === 'number' && byTypeRes >= 0)) {
              startSucceeded = true;
            } else {
              console.warn('[Voice] startScreenCaptureBySourceType failed, fallback to startScreenCapture:', byTypeRes);
            }
          } catch (byTypeStartError) {
            console.warn('[Voice] startScreenCaptureBySourceType threw, fallback to startScreenCapture:', byTypeStartError);
          }
        }

        if (!startSucceeded) {
          // Legacy fallback when sourceType API is unavailable or returns error on some devices.
          const startRes = engine.startScreenCapture?.(captureParams);
          if (startRes === undefined || (typeof startRes === 'number' && startRes >= 0)) {
            startSucceeded = true;
          } else {
            throw new Error(`startScreenCapture failed: ${startRes}`);
          }
        }

        const previewRes = engine.startPreview?.(screenSourceType);
        if (typeof previewRes === 'number' && previewRes < 0) {
          console.warn('[Voice] startPreview(screen) failed:', previewRes);
        }
      } else {
        let stopSucceeded = false;
        const stopPreviewRes = engine.stopPreview?.(screenSourceType);
        if (typeof stopPreviewRes === 'number' && stopPreviewRes < 0) {
          console.warn('[Voice] stopPreview(screen) failed:', stopPreviewRes);
        }
        if (engine.stopScreenCaptureBySourceType) {
          try {
            const byTypeStopRes = engine.stopScreenCaptureBySourceType(
              screenSourceType
            );
            if (byTypeStopRes === undefined || (typeof byTypeStopRes === 'number' && byTypeStopRes >= 0)) {
              stopSucceeded = true;
            } else {
              console.warn('[Voice] stopScreenCaptureBySourceType failed, fallback to stopScreenCapture:', byTypeStopRes);
            }
          } catch (byTypeStopError) {
            console.warn('[Voice] stopScreenCaptureBySourceType threw, fallback to stopScreenCapture:', byTypeStopError);
          }
        }

        if (!stopSucceeded) {
          const stopRes = engine.stopScreenCapture?.();
          if (stopRes === undefined || (typeof stopRes === 'number' && stopRes >= 0)) {
            stopSucceeded = true;
          } else {
            throw new Error(`stopScreenCapture failed: ${stopRes}`);
          }
        }
      }

      engine.updateChannelMediaOptions?.({
        publishMicrophoneTrack: !isMutedRef.current,
        publishCameraTrack: false,
        publishScreenCaptureVideo: next,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
        clientRoleType: ClientRoleType?.ClientRoleBroadcaster,
      });

      setIsScreenSharing(next);
      updateParticipant({
        userId,
        channelId: channelIdNum,
        serverId: serverIdNum,
        isMuted: isMutedRef.current,
        isDeafened: isDeafenedRef.current,
        hasCamera: false,
        hasScreenShare: next,
      });

      if (next) {
        // Wait for local screen frames before notifying other participants.
        screenSharePendingRef.current = true;
        screenSharePublishedRef.current = false;
        clearScreenShareActivationTimeout();

        screenShareActivationTimeoutRef.current = setTimeout(() => {
          if (!screenSharePendingRef.current || screenSharePublishedRef.current) {
            return;
          }

          console.warn('[Voice] Screen share timed out waiting for first frame; reverting pending state.');
          screenSharePendingRef.current = false;
          screenSharePublishedRef.current = false;
          setIsScreenSharing(false);
          updateParticipant({
            userId,
            channelId: channelIdNum,
            serverId: serverIdNum,
            isMuted: isMutedRef.current,
            isDeafened: isDeafenedRef.current,
            hasCamera: false,
            hasScreenShare: false,
          });
        }, 12000);
      } else {
        screenSharePendingRef.current = false;
        screenSharePublishedRef.current = false;
        clearScreenShareActivationTimeout();

        sendVoiceAction({
          type: 'UPDATE_STATE',
          state: toWireVoiceState({
            userId,
            channelId: channelIdNum,
            serverId: serverIdNum,
            isMuted: isMutedRef.current,
            isDeafened: isDeafenedRef.current,
            hasCamera: false,
            hasScreenShare: false,
          }),
        });
      }
    } catch (error) {
      clearScreenShareActivationTimeout();
      screenSharePendingRef.current = false;
      screenSharePublishedRef.current = false;
      setIsScreenSharing(false);
      updateParticipant({
        userId,
        channelId: channelIdNum,
        serverId: serverIdNum,
        isMuted: isMutedRef.current,
        isDeafened: isDeafenedRef.current,
        hasCamera: false,
        hasScreenShare: false,
      });
      console.error('[Voice] Failed to toggle screen share:', error);
      Alert.alert('Lỗi chia sẻ màn hình', 'Không thể bật/tắt chia sẻ màn hình lúc này.');
    }
  }, [
    channelIdNum,
    isCameraOn,
    isJoined,
    isScreenSharing,
    serverIdNum,
    updateParticipant,
    userId,
    clearScreenShareActivationTimeout,
  ]);

  const videoParticipants = participants.filter(
    (participant) => Boolean(participant.hasCamera || participant.hasScreenShare)
  );
  const featuredParticipant =
    videoParticipants.find((participant) => participant.userId === pinnedVideoUserId) ||
    videoParticipants[0];
  const hasAnyVideo = videoParticipants.length > 0;
  const isSpotlightMode = viewMode === 'spotlight' && hasAnyVideo;
  const listParticipants = featuredParticipant
    ? participants.filter((participant) => participant.userId !== featuredParticipant.userId)
    : participants;
  const localParticipant = participants.find((participant) => participant.userId === userId);
  const remoteVideoParticipants = listParticipants.filter(
    (participant) => participant.userId !== userId && (participant.hasCamera || participant.hasScreenShare)
  );

  const pipPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Boolean(featuredParticipant),
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Boolean(featuredParticipant) && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
      onPanResponderGrant: () => {
        pipPosition.setOffset(pipOffset.current);
        pipPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pipPosition.x, dy: pipPosition.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pipPosition.flattenOffset();
        pipOffset.current = (pipPosition as any).__getValue();
      },
      onPanResponderTerminate: () => {
        pipPosition.flattenOffset();
        pipOffset.current = (pipPosition as any).__getValue();
      },
    })
  ).current;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerChannel} numberOfLines={1}>
            {resolvedChannelName || 'Voice channel'}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === 'connected' ? '#3BA55C' : status === 'error' ? '#ED4245' : '#FAA61A',
                },
              ]}
            />
            <Text style={styles.statusText}>
              {status === 'connected'
                ? 'Đã kết nối'
                : status === 'error'
                  ? 'Lỗi kết nối'
                  : 'Đang kết nối...'}
            </Text>
          </View>
          <Text style={styles.memberCountText}>{participants.length} người trong phòng</Text>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={toggleDeafen}>
          <Ionicons
            name={isDeafened ? 'volume-mute' : 'volume-high'}
            size={22}
            color={isDeafened ? '#ED4245' : '#fff'}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="person-add-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Participant Grid */}
      <ScrollView
        style={styles.participantArea}
        contentContainerStyle={isSpotlightMode ? styles.participantContentVideo : styles.participantContent}
        showsVerticalScrollIndicator={false}
      >
        {hasAnyVideo && (
          <View style={styles.viewModeBar}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'spotlight' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('spotlight')}
            >
              <Ionicons
                name="scan-outline"
                size={14}
                color={viewMode === 'spotlight' ? '#fff' : '#b9bbbe'}
              />
              <Text style={[styles.viewModeBtnText, viewMode === 'spotlight' && styles.viewModeBtnTextActive]}>
                Spotlight
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons
                name="grid-outline"
                size={14}
                color={viewMode === 'grid' ? '#fff' : '#b9bbbe'}
              />
              <Text style={[styles.viewModeBtnText, viewMode === 'grid' && styles.viewModeBtnTextActive]}>
                Grid
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {participants.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#4f545c" />
            <Text style={styles.emptyText}>Chưa có ai trong phòng</Text>
          </View>
        ) : (
          <>
            {isSpotlightMode && featuredParticipant ? (
              <View style={styles.fullVideoLayout}>
                <ParticipantCard
                  key={featuredParticipant.userId}
                  state={featuredParticipant}
                  isSpeaking={speakingUsers.has(featuredParticipant.userId)}
                  hasVideo={Boolean(featuredParticipant.hasCamera || featuredParticipant.hasScreenShare)}
                  videoSourceType={getParticipantVideoSourceType(featuredParticipant)}
                  remoteUid={getParticipantVideoUid(featuredParticipant)}
                  isLocal={featuredParticipant.userId === userId}
                  variant="featured"
                  isPinned={Boolean(pinnedVideoUserId)}
                  onPress={() => setPinnedVideoUserId(null)}
                />

                {localParticipant && featuredParticipant.userId !== userId && (
                  <Animated.View
                    style={[
                      styles.localPipOverlay,
                      {
                        transform: [{ translateX: pipPosition.x }, { translateY: pipPosition.y }],
                      },
                    ]}
                    {...pipPanResponder.panHandlers}
                  >
                    <ParticipantCard
                      key={`pip-${userId}`}
                      state={localParticipant}
                      isSpeaking={speakingUsers.has(userId)}
                      hasVideo={Boolean((localParticipant.hasCamera ?? isCameraOn) || (localParticipant.hasScreenShare ?? isScreenSharing))}
                      videoSourceType={getParticipantVideoSourceType(localParticipant)}
                      remoteUid={getParticipantVideoUid(localParticipant)}
                      isLocal
                      variant="pip"
                    />
                  </Animated.View>
                )}

                {remoteVideoParticipants.length > 0 && (
                  <View style={styles.remoteStrip}>
                    {remoteVideoParticipants.map((participant) => (
                        <ParticipantCard
                          key={`strip-${participant.userId}`}
                          state={participant}
                          isSpeaking={speakingUsers.has(participant.userId)}
                          hasVideo={Boolean(participant.hasCamera || participant.hasScreenShare)}
                          videoSourceType={getParticipantVideoSourceType(participant)}
                          remoteUid={getParticipantVideoUid(participant)}
                          isLocal={participant.userId === userId}
                          variant="strip"
                          onPress={() =>
                            setPinnedVideoUserId((prev) =>
                              prev === participant.userId ? null : participant.userId
                            )
                          }
                        />
                      ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.grid}>
                {participants.map((p) => (
                  <ParticipantCard
                    key={p.userId}
                    state={p}
                    isSpeaking={speakingUsers.has(p.userId)}
                    hasVideo={Boolean(p.hasCamera || p.hasScreenShare)}
                    videoSourceType={getParticipantVideoSourceType(p)}
                    remoteUid={getParticipantVideoUid(p)}
                    isLocal={p.userId === userId}
                    onPress={
                      p.hasCamera || p.hasScreenShare
                        ? () =>
                            setPinnedVideoUserId((prev) =>
                              prev === p.userId ? null : p.userId
                            )
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Invite Banner */}
      {!isSpotlightMode && (
        <TouchableOpacity style={styles.inviteBanner} activeOpacity={0.7}>
          <View style={styles.inviteIcon}>
            <Ionicons name="person-add-outline" size={20} color="#b9bbbe" />
          </View>
          <View style={styles.inviteText}>
            <Text style={styles.inviteTitle}>Thêm người vào Trò Chuyện Thoại</Text>
            <Text style={styles.inviteSub}>Cho nhóm biết bạn đang ở đây!</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#72767d" />
        </TouchableOpacity>
      )}

      {/* Control Bar */}
      <View style={styles.controls}>
        {/* Camera */}
        <TouchableOpacity
          style={[styles.controlBtn, isCameraOn && styles.controlBtnActive]}
          onPress={toggleCamera}
        >
          <Ionicons
            name={isCameraOn ? 'videocam' : 'videocam-off-outline'}
            size={24}
            color={isCameraOn ? '#fff' : '#b9bbbe'}
          />
        </TouchableOpacity>

        {/* Screen share */}
        <TouchableOpacity
          style={[styles.controlBtn, isScreenSharing && styles.controlBtnActive]}
          onPress={toggleScreenShare}
        >
          <Ionicons
            name={isScreenSharing ? 'desktop' : 'desktop-outline'}
            size={22}
            color={isScreenSharing ? '#fff' : '#b9bbbe'}
          />
        </TouchableOpacity>

        {/* Flip camera */}
        <TouchableOpacity
          style={[styles.controlBtn, !isCameraOn && { opacity: 0.5 }]}
          onPress={flipCamera}
        >
          <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Mic */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic-outline'}
            size={24}
            color={isMuted ? '#fff' : '#b9bbbe'}
          />
        </TouchableOpacity>

        {/* Chat */}
        <TouchableOpacity style={styles.controlBtn} onPress={() => router.back()}>
          <Ionicons name="chatbubble-outline" size={24} color="#b9bbbe" />
        </TouchableOpacity>

        {/* Sound / Deafen */}
        <TouchableOpacity
          style={[styles.controlBtn, isDeafened && styles.controlBtnActive]}
          onPress={toggleDeafen}
        >
          <Ionicons
            name={isDeafened ? 'volume-mute' : 'volume-medium-outline'}
            size={24}
            color={isDeafened ? '#fff' : '#b9bbbe'}
          />
        </TouchableOpacity>

        {/* Leave */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <Ionicons
            name="call"
            size={24}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#23272a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2c2f33',
    borderBottomWidth: 1,
    borderBottomColor: '#202225',
    gap: 8,
  },
  headerBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  headerChannel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: '#72767d',
  },
  memberCountText: {
    fontSize: 11,
    color: '#b9bbbe',
    marginTop: 4,
  },
  participantArea: {
    flex: 1,
    backgroundColor: '#23272a',
  },
  participantContent: {
    padding: 12,
    flexGrow: 1,
  },
  participantContentVideo: {
    padding: 8,
    flexGrow: 1,
  },
  viewModeBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(32, 34, 37, 0.86)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewModeBtnActive: {
    backgroundColor: '#5865f2',
  },
  viewModeBtnText: {
    fontSize: 12,
    color: '#b9bbbe',
    fontWeight: '600',
  },
  viewModeBtnTextActive: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#72767d',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fullVideoLayout: {
    flex: 1,
    minHeight: 420,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  localPipOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 140,
    zIndex: 12,
  },
  remoteStrip: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 100,
    gap: 8,
    zIndex: 11,
  },
  cardTouchable: {
    width: '48%',
  },
  cardTouchableFeatured: {
    width: '100%',
    flex: 1,
  },
  cardTouchablePip: {
    width: '100%',
  },
  cardTouchableStrip: {
    width: '100%',
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSpeaking: {
    borderColor: '#3BA55C',
  },
  cardFeatured: {
    height: '100%',
    aspectRatio: undefined,
    borderRadius: 14,
  },
  cardPip: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cardStrip: {
    aspectRatio: 3 / 4,
  },
  videoCardContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoViewFull: {
    flex: 1,
  },
  avatarModeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  nameTagOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  nameTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  pinBadgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  statusBadgesOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    gap: 6,
    zIndex: 30,
    elevation: 8,
  },
  statusBadgesOverlayFeatured: {
    top: undefined,
    right: undefined,
    left: 8,
    bottom: 40,
    flexDirection: 'row',
  },
  statusBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(237, 66, 69, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#2c2f33',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    gap: 12,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#23272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteText: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  inviteSub: {
    fontSize: 12,
    color: '#72767d',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#2c2f33',
    borderTopWidth: 1,
    borderTopColor: '#202225',
    gap: 12,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#40444b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#ED4245',
  },
  leaveBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ED4245',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
