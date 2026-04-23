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
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  PixelRatio,
  PermissionsAndroid,
  Platform,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ControlBar } from '@/app/voice/components/ControlBar';
import { InviteBanner } from '@/app/voice/components/InviteBanner';
import { VoiceParticipantLayout } from '@/app/voice/components/VoiceParticipantLayout';
import { ViewModeSwitch } from '@/app/voice/components/ViewModeSwitch';
import { VoiceHeader } from '@/app/voice/components/VoiceHeader';
import { styles } from '@/app/voice/styles';

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

type RemoteVideoUidEntry = {
  cameraUid?: number;
  screenUid?: number;
};

type ParticipantVideoAspectEntry = {
  camera?: number;
  screen?: number;
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
  const [matchSharerView, setMatchSharerView] = useState(true);
  const [participantVideoAspectMap, setParticipantVideoAspectMap] = useState<
    Record<string, ParticipantVideoAspectEntry>
  >({});

  const engineRef = useRef<any>(null);
  const uidToUserIdMap = useRef<Map<number, string>>(new Map());
  const remoteUidMapRef = useRef<Record<string, RemoteVideoUidEntry>>({});
  const participantVideoAspectRef = useRef<Record<string, ParticipantVideoAspectEntry>>({});
  const participantsRef = useRef<VoiceState[]>([]);
  const isMutedRef = useRef(false);
  const isDeafenedRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const screenCaptureUsesSourceTypeRef = useRef(false);
  const activeScreenSourceTypeRef = useRef<number | undefined>(undefined);
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

  const setParticipantVideoAspect = useCallback(
    (participantUserId: string, sourceHint: 'camera' | 'screen', width: number, height: number) => {
      if (!participantUserId || width <= 0 || height <= 0) {
        return;
      }
      const aspect = width / height;
      if (!Number.isFinite(aspect) || aspect <= 0) {
        return;
      }

      const currentEntry = participantVideoAspectRef.current[participantUserId] ?? {};
      const previousAspect = currentEntry[sourceHint];
      if (previousAspect && Math.abs(previousAspect - aspect) < 0.01) {
        return;
      }

      const nextEntry: ParticipantVideoAspectEntry = {
        ...currentEntry,
        [sourceHint]: aspect,
      };
      const nextMap = {
        ...participantVideoAspectRef.current,
        [participantUserId]: nextEntry,
      };
      participantVideoAspectRef.current = nextMap;
      setParticipantVideoAspectMap(nextMap);
    },
    []
  );

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

  const getParticipantHasScreenStream = useCallback(
    (participant: VoiceState) => {
      if (participant.userId === userId) {
        return Boolean(
          participant.hasScreenShare ||
            isScreenSharingRef.current ||
            screenSharePendingRef.current ||
            screenSharePublishedRef.current
        );
      }
      const rawEntry = (remoteUidMap as Record<string, RemoteVideoUidEntry | number>)[participant.userId];
      if (typeof rawEntry === 'number') {
        return false;
      }
      return Boolean(rawEntry?.screenUid !== undefined || participant.hasScreenShare);
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
        const incomingUserId = String(state?.userId ?? '');
        const previousState = participantsRef.current.find(
          (participant) => participant.userId === incomingUserId
        );
        const mutedValue = state?.isMuted ?? state?.muted ?? false;
        const deafenedValue = state?.isDeafened ?? state?.deafened ?? false;
        const hasCameraInPayload =
          Object.prototype.hasOwnProperty.call(state ?? {}, 'hasCamera') ||
          Object.prototype.hasOwnProperty.call(state ?? {}, 'isHasCamera');
        const hasScreenShareInPayload =
          Object.prototype.hasOwnProperty.call(state ?? {}, 'hasScreenShare') ||
          Object.prototype.hasOwnProperty.call(state ?? {}, 'screenShare');

        const hasCameraValue = hasCameraInPayload
          ? Boolean(state?.hasCamera ?? state?.isHasCamera)
          : previousState?.hasCamera ?? false;
        const hasScreenShareValue = hasScreenShareInPayload
          ? Boolean(state?.hasScreenShare ?? state?.screenShare)
          : previousState?.hasScreenShare ?? false;

        return {
          userId: incomingUserId,
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
        const mergedRoomStates = roomStates.map((state) => {
          const previousState = participantsRef.current.find(
            (participant) => participant.userId === state.userId
          );
          return {
            ...state,
            hasCamera: previousState?.hasCamera ?? state.hasCamera,
            hasScreenShare: previousState?.hasScreenShare ?? state.hasScreenShare,
          };
        });
        const hasLocal = mergedRoomStates.some((state) => state.userId === userId);
        setParticipants(
          hasLocal
            ? mergedRoomStates
            : [
                ...mergedRoomStates,
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
            const sourceHint: 'camera' | 'screen' = isScreenSourceType(source)
              ? 'screen'
              : 'camera';
            setParticipantVideoAspect(userId, sourceHint, width, height);
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

            if (newState !== 0 && (isScreenSourceType(source) || screenSharePendingRef.current)) {
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
            const currentParticipant = participantsRef.current.find((p) => p.userId === userAccount);
            const entry = remoteUidMapRef.current[userAccount] ?? {};
            const isScreenTrack = entry.screenUid === remoteUid && entry.cameraUid !== remoteUid;
            const nextHasCamera = isScreenTrack
              ? currentParticipant?.hasCamera ?? false
              : enabled;
            const nextHasScreenShare = isScreenTrack
              ? enabled
              : currentParticipant?.hasScreenShare ?? false;
            updateParticipant({
              userId: userAccount,
              channelId: channelIdNum,
              serverId: serverIdNum,
              isMuted: currentParticipant?.isMuted ?? false,
              isDeafened: currentParticipant?.isDeafened ?? false,
              hasCamera: nextHasCamera,
              hasScreenShare: nextHasScreenShare,
            });
          },
          onUserMuteVideo: (_connection: any, remoteUid: number, muted: boolean) => {
            const userAccount = mapRemoteUidToParticipant(remoteUid, 'camera');
            if (!userAccount) return;
            const currentParticipant = participantsRef.current.find((p) => p.userId === userAccount);
            const entry = remoteUidMapRef.current[userAccount] ?? {};
            const isScreenTrack = entry.screenUid === remoteUid && entry.cameraUid !== remoteUid;
            const nextHasCamera = isScreenTrack
              ? currentParticipant?.hasCamera ?? false
              : !muted;
            const nextHasScreenShare = isScreenTrack
              ? !muted
              : currentParticipant?.hasScreenShare ?? false;
            updateParticipant({
              userId: userAccount,
              channelId: channelIdNum,
              serverId: serverIdNum,
              isMuted: currentParticipant?.isMuted ?? false,
              isDeafened: currentParticipant?.isDeafened ?? false,
              hasCamera: nextHasCamera,
              hasScreenShare: nextHasScreenShare,
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
            if (userAccount) {
              const currentParticipant = participantsRef.current.find((p) => p.userId === userAccount);
              updateParticipant({
                userId: userAccount,
                channelId: channelIdNum,
                serverId: serverIdNum,
                isMuted: currentParticipant?.isMuted ?? false,
                isDeafened: currentParticipant?.isDeafened ?? false,
                hasCamera: sourceHint === 'camera' ? true : currentParticipant?.hasCamera ?? false,
                hasScreenShare:
                  sourceHint === 'screen' ? true : currentParticipant?.hasScreenShare ?? false,
              });
              setParticipantVideoAspect(userAccount, sourceHint, width, height);
            }

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
      screenCaptureUsesSourceTypeRef.current = false;
      activeScreenSourceTypeRef.current = undefined;
      participantVideoAspectRef.current = {};
      setParticipantVideoAspectMap({});
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
    setParticipantVideoAspect,
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
          screenCaptureUsesSourceTypeRef.current = false;
          activeScreenSourceTypeRef.current = undefined;
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
    const fallbackScreenSourceType = VideoSourceType?.VideoSourceScreen ?? screenSourceType;
    if (participant.hasScreenShare) {
      if (participant.userId === userId) {
        return screenCaptureUsesSourceTypeRef.current
          ? activeScreenSourceTypeRef.current ?? screenSourceType
          : fallbackScreenSourceType;
      }
      return fallbackScreenSourceType;
    }
    return VideoSourceType?.VideoSourceCameraPrimary;
  }, [userId]);

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
    const fallbackScreenSourceType = VideoSourceType?.VideoSourceScreen ?? screenSourceType;

    try {
      let startedWithSourceTypeApi = false;
      if (next) {
        const windowSize = Dimensions.get('window');
        const screenWidthPx = PixelRatio.getPixelSizeForLayoutSize(windowSize.width);
        const screenHeightPx = PixelRatio.getPixelSizeForLayoutSize(windowSize.height);
        const shortestEdge = Math.max(720, Math.floor(Math.min(screenWidthPx, screenHeightPx)));
        const longestEdge = Math.max(1280, Math.floor(Math.max(screenWidthPx, screenHeightPx)));
        const isPortraitCapture = windowSize.height >= windowSize.width;
        const captureWidth = isPortraitCapture ? shortestEdge : longestEdge;
        const captureHeight = isPortraitCapture ? longestEdge : shortestEdge;

        const captureParams = ScreenCaptureParameters2
          ? new ScreenCaptureParameters2()
          : { captureVideo: true };
        captureParams.captureVideo = true;
        captureParams.captureAudio = false;
        captureParams.videoParams = {
          dimensions: { width: captureWidth, height: captureHeight },
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
              startedWithSourceTypeApi = true;
              screenCaptureUsesSourceTypeRef.current = true;
              activeScreenSourceTypeRef.current = screenSourceType;
            } else {
              if (__DEV__) {
                console.log('[Voice] startScreenCaptureBySourceType failed, fallback to startScreenCapture:', byTypeRes);
              }
            }
          } catch (byTypeStartError) {
            if (__DEV__) {
              console.log('[Voice] startScreenCaptureBySourceType threw, fallback to startScreenCapture:', byTypeStartError);
            }
          }
        }

        if (!startSucceeded) {
          // Legacy fallback when sourceType API is unavailable or returns error on some devices.
          const startRes = engine.startScreenCapture?.(captureParams);
          if (startRes === undefined || (typeof startRes === 'number' && startRes >= 0)) {
            startSucceeded = true;
            screenCaptureUsesSourceTypeRef.current = false;
            activeScreenSourceTypeRef.current = fallbackScreenSourceType;
          } else {
            throw new Error(`startScreenCapture failed: ${startRes}`);
          }
        }

        const previewSourceType = screenCaptureUsesSourceTypeRef.current
          ? screenSourceType
          : fallbackScreenSourceType;
        const previewRes = engine.startPreview?.(previewSourceType);
        if (typeof previewRes === 'number' && previewRes < 0) {
          console.warn('[Voice] startPreview(screen) failed:', previewRes);
        }
      } else {
        let stopSucceeded = false;
        const previewSourceType = screenCaptureUsesSourceTypeRef.current
          ? screenSourceType
          : fallbackScreenSourceType;
        const stopPreviewRes = engine.stopPreview?.(previewSourceType);
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
        if (!startedWithSourceTypeApi) {
          // Legacy capture API may not emit screen-specific first-frame callbacks reliably.
          screenSharePendingRef.current = false;
          screenSharePublishedRef.current = true;
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
              hasScreenShare: true,
            }),
          });
          return;
        }

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
        screenCaptureUsesSourceTypeRef.current = false;
        activeScreenSourceTypeRef.current = undefined;
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
      screenCaptureUsesSourceTypeRef.current = false;
      activeScreenSourceTypeRef.current = undefined;
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
  const shouldForceGridForSmallVideoGroup =
    viewMode === 'spotlight' && videoParticipants.length > 1 && videoParticipants.length <= 3;
  const isSpotlightMode = viewMode === 'spotlight' && hasAnyVideo && !shouldForceGridForSmallVideoGroup;
  const listParticipants = featuredParticipant
    ? participants.filter((participant) => participant.userId !== featuredParticipant.userId)
    : participants;
  const localParticipant = participants.find((participant) => participant.userId === userId);
  const remoteVideoParticipants = listParticipants.filter(
    (participant) => participant.userId !== userId && (participant.hasCamera || participant.hasScreenShare)
  );
  const getParticipantMediaAspectRatio = useCallback(
    (participant: VoiceState) => {
      const aspectEntry = participantVideoAspectMap[participant.userId];
      if (participant.hasScreenShare) {
        return aspectEntry?.screen ?? 9 / 16;
      }
      if (participant.hasCamera) {
        return aspectEntry?.camera;
      }
      return undefined;
    },
    [participantVideoAspectMap]
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
      <VoiceHeader
        channelName={resolvedChannelName}
        status={status}
        participantCount={participants.length}
        isDeafened={isDeafened}
        onLeave={handleLeave}
        onToggleDeafen={toggleDeafen}
      />

      {/* Participant Grid */}
      <ScrollView
        style={styles.participantArea}
        contentContainerStyle={isSpotlightMode ? styles.participantContentVideo : styles.participantContent}
        showsVerticalScrollIndicator={false}
      >
        {hasAnyVideo && (
          <ViewModeSwitch
            viewMode={viewMode}
            onChangeMode={setViewMode}
            matchSharerView={matchSharerView}
            onToggleMatchSharerView={() => setMatchSharerView((prev) => !prev)}
          />
        )}

        <VoiceParticipantLayout
          participants={participants}
          isSpotlightMode={isSpotlightMode}
          featuredParticipant={featuredParticipant}
          localParticipant={localParticipant}
          remoteVideoParticipants={remoteVideoParticipants}
          speakingUsers={speakingUsers}
          userId={userId}
          pinnedVideoUserId={pinnedVideoUserId}
          setPinnedVideoUserId={setPinnedVideoUserId}
          isCameraOn={isCameraOn}
          isScreenSharing={isScreenSharing}
          pipPosition={pipPosition}
          pipPanHandlers={pipPanResponder.panHandlers}
          getParticipantVideoSourceType={getParticipantVideoSourceType}
          getParticipantVideoUid={getParticipantVideoUid}
          getParticipantHasScreenStream={getParticipantHasScreenStream}
          getParticipantMediaAspectRatio={getParticipantMediaAspectRatio}
          matchSharerView={matchSharerView}
          onFlipCamera={flipCamera}
          rtcSurfaceView={RtcSurfaceView}
          renderModeType={RenderModeType}
          videoSourceTypeEnum={VideoSourceType}
        />
      </ScrollView>

      {/* Invite Banner */}
      {!isSpotlightMode && <InviteBanner />}

      <ControlBar
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        isMuted={isMuted}
        isDeafened={isDeafened}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleMute={toggleMute}
        onBackToChat={() => router.back()}
        onToggleDeafen={toggleDeafen}
        onLeave={handleLeave}
      />
    </SafeAreaView>
  );
}

