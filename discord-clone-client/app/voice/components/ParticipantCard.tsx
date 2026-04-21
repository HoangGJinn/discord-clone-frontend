import { VoiceState } from '@/services/voiceService';
import { styles } from '@/app/voice/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const AVATAR_COLORS = ['#5865F2', '#3BA55C', '#FAA61A', '#ED4245', '#9B84EE', '#EB459E'];

const avatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initials = (name: string) => {
  const words = name.trim().split(' ');
  return words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

type ParticipantCardProps = {
  state: VoiceState;
  isSpeaking: boolean;
  hasVideo: boolean;
  videoSourceType?: number;
  remoteUid?: number;
  mediaAspectRatio?: number;
  isScreenShareStream?: boolean;
  matchSharerView?: boolean;
  isLocal: boolean;
  variant?: 'grid' | 'featured' | 'pip' | 'strip' | 'spotlight-share';
  isPinned?: boolean;
  onPress?: () => void;
  onFlipCamera?: () => void;
  rtcSurfaceView?: any;
  renderModeType?: any;
  videoSourceTypeEnum?: any;
};

export function ParticipantCard({
  state,
  isSpeaking,
  hasVideo,
  videoSourceType,
  remoteUid,
  mediaAspectRatio,
  isScreenShareStream = false,
  matchSharerView = true,
  isLocal,
  variant = 'grid',
  isPinned = false,
  onPress,
  onFlipCamera,
  rtcSurfaceView: RtcSurfaceView,
  renderModeType: RenderModeType,
  videoSourceTypeEnum: VideoSourceType,
}: ParticipantCardProps) {
  const color = avatarColor(state.userId);
  const label = state.userId;
  const shortName = label.length > 12 ? `${label.slice(0, 12)}…` : label;
  const speaking = isSpeaking && !state.isMuted;
  const isScreenShareOnly = Boolean(isScreenShareStream && !state.hasCamera);
  const isScreenSourceType = (() => {
    if (videoSourceType === undefined || videoSourceType === null) return false;
    const screenTypes = [
      VideoSourceType?.VideoSourceScreenPrimary,
      VideoSourceType?.VideoSourceScreen,
      VideoSourceType?.VideoSourceScreenSecondary,
      VideoSourceType?.VideoSourceScreenThird,
      VideoSourceType?.VideoSourceScreenFourth,
    ].filter((value) => typeof value === 'number');
    return screenTypes.includes(videoSourceType);
  })();
  const shouldUseFitMode = Boolean(isScreenShareStream || state.hasScreenShare || isScreenSourceType);
  const showFlipCameraButton = Boolean(
    onFlipCamera && isLocal && state.hasCamera && !isScreenShareStream
  );

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        styles.cardTouchable,
        variant === 'featured' && styles.cardTouchableFeatured,
        variant === 'spotlight-share' && styles.cardTouchableFeatured,
        variant === 'pip' && styles.cardTouchablePip,
        variant === 'strip' && styles.cardTouchableStrip,
        variant === 'grid' && isScreenShareOnly && styles.cardTouchableScreenShare,
      ]}
      disabled={!onPress}
    >
      <View
        style={[
          styles.card,
          variant === 'featured' && styles.cardFeatured,
          variant === 'spotlight-share' && (styles as any).cardSpotlightShare,
          variant === 'pip' && styles.cardPip,
          variant === 'strip' && styles.cardStrip,
          variant === 'grid' && isScreenShareOnly && styles.cardScreenShare,
          speaking && styles.cardSpeaking,
        ]}
      >
        <View
          style={[
            styles.cardInner,
            variant === 'featured' && styles.cardInnerFeatured,
            variant === 'spotlight-share' && (styles as any).cardInnerSpotlightShare,
            variant === 'pip' && styles.cardInnerPip,
          ]}
        >
          {hasVideo && RtcSurfaceView && (isLocal || remoteUid !== undefined) ? (
            <View
              style={[
                styles.videoCardContainer,
                variant === 'spotlight-share' && (styles as any).videoCardContainerSpotlightShare,
              ]}
            >
              {(() => {
                // Local canvas should keep explicit source binding (camera/screen),
                // while remote canvas is left to SDK auto-binding.
                const shouldForceSourceType = Boolean(isLocal || variant === 'spotlight-share');
                const baseCanvas: any = {
                  uid: isLocal ? 0 : remoteUid,
                  renderMode: shouldUseFitMode
                    ? RenderModeType?.RenderModeFit
                    : RenderModeType?.RenderModeHidden,
                };

                if (shouldForceSourceType) {
                  baseCanvas.sourceType =
                    videoSourceType ?? VideoSourceType?.VideoSourceCameraPrimary;
                }

                const resolvedAspectRatio =
                  mediaAspectRatio && Number.isFinite(mediaAspectRatio) && mediaAspectRatio > 0
                    ? mediaAspectRatio
                    : undefined;
                const spotlightFrameStyle =
                  variant === 'spotlight-share'
                    ? {
                        // Mirror sender spotlight behavior: fixed portrait stage with fit mode.
                        // Receivers see the same composition as sharer, with side bars if needed.
                        height: '100%',
                        aspectRatio: matchSharerView
                          ? 9 / 16
                          : resolvedAspectRatio && resolvedAspectRatio > 0
                            ? resolvedAspectRatio
                            : 9 / 16,
                      }
                    : resolvedAspectRatio
                      ? { aspectRatio: resolvedAspectRatio }
                      : null;

                return (
                  <View
                    style={[
                      (styles as any).videoContentFrame,
                      variant === 'spotlight-share' && (styles as any).videoContentFrameSpotlightShare,
                      spotlightFrameStyle as any,
                    ]}
                  >
                    <RtcSurfaceView style={styles.videoViewFull} canvas={baseCanvas} />
                  </View>
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
        </View>

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

        {showFlipCameraButton && (
          <TouchableOpacity
            style={styles.flipCameraOverlay}
            onPress={onFlipCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.statusBadgesOverlay,
            (variant === 'featured' || variant === 'spotlight-share') &&
              styles.statusBadgesOverlayFeatured,
            showFlipCameraButton && styles.statusBadgesOverlayWithFlip,
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

export default ParticipantCard;
