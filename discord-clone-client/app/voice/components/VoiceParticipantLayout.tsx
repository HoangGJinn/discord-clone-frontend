import { ParticipantCard } from '@/app/voice/components/ParticipantCard';
import { styles } from '@/app/voice/styles';
import { VoiceState } from '@/services/voiceService';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Text, View } from 'react-native';

type VoiceParticipantLayoutProps = {
  participants: VoiceState[];
  isSpotlightMode: boolean;
  featuredParticipant?: VoiceState;
  localParticipant?: VoiceState;
  remoteVideoParticipants: VoiceState[];
  speakingUsers: Set<string>;
  userId: string;
  pinnedVideoUserId: string | null;
  setPinnedVideoUserId: React.Dispatch<React.SetStateAction<string | null>>;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  pipPosition: Animated.ValueXY;
  pipPanHandlers: any;
  getParticipantVideoSourceType: (participant: VoiceState) => number | undefined;
  getParticipantVideoUid: (participant: VoiceState) => number | undefined;
  getParticipantHasScreenStream: (participant: VoiceState) => boolean;
  getParticipantMediaAspectRatio: (participant: VoiceState) => number | undefined;
  matchSharerView: boolean;
  onFlipCamera: () => void;
  rtcSurfaceView?: any;
  renderModeType?: any;
  videoSourceTypeEnum?: any;
};

export function VoiceParticipantLayout({
  participants,
  isSpotlightMode,
  featuredParticipant,
  localParticipant,
  remoteVideoParticipants,
  speakingUsers,
  userId,
  pinnedVideoUserId,
  setPinnedVideoUserId,
  isCameraOn,
  isScreenSharing,
  pipPosition,
  pipPanHandlers,
  getParticipantVideoSourceType,
  getParticipantVideoUid,
  getParticipantHasScreenStream,
  getParticipantMediaAspectRatio,
  matchSharerView,
  onFlipCamera,
  rtcSurfaceView,
  renderModeType,
  videoSourceTypeEnum,
}: VoiceParticipantLayoutProps) {
  if (participants.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color="#4f545c" />
        <Text style={styles.emptyText}>Chưa có ai trong phòng</Text>
      </View>
    );
  }

  if (isSpotlightMode && featuredParticipant) {
    const featuredIsScreenShareStream = getParticipantHasScreenStream(featuredParticipant);
    const isFeaturedSpeaking =
      speakingUsers.has(featuredParticipant.userId) && !featuredParticipant.isMuted;
    return (
      <View style={styles.fullVideoLayout}>
        <View style={styles.spotlightCardShell}>
          <ParticipantCard
            key={featuredParticipant.userId}
            state={featuredParticipant}
            isSpeaking={false}
            hasVideo={Boolean(featuredParticipant.hasCamera || featuredParticipant.hasScreenShare)}
            videoSourceType={getParticipantVideoSourceType(featuredParticipant)}
            remoteUid={getParticipantVideoUid(featuredParticipant)}
            isScreenShareStream={featuredIsScreenShareStream}
            mediaAspectRatio={getParticipantMediaAspectRatio(featuredParticipant)}
            matchSharerView={matchSharerView}
            isLocal={featuredParticipant.userId === userId}
            variant={featuredIsScreenShareStream ? 'spotlight-share' : 'featured'}
            isPinned={Boolean(pinnedVideoUserId)}
            onPress={() => setPinnedVideoUserId(null)}
            onFlipCamera={onFlipCamera}
            rtcSurfaceView={rtcSurfaceView}
            renderModeType={renderModeType}
            videoSourceTypeEnum={videoSourceTypeEnum}
          />
          {isFeaturedSpeaking && <View pointerEvents="none" style={styles.spotlightSpeakingRing} />}
        </View>

        {localParticipant && featuredParticipant.userId !== userId && (
          <Animated.View
            style={[
              styles.localPipOverlay,
              {
                transform: [{ translateX: pipPosition.x }, { translateY: pipPosition.y }],
              },
            ]}
            {...pipPanHandlers}
          >
            <ParticipantCard
              key={`pip-${userId}`}
              state={localParticipant}
              isSpeaking={speakingUsers.has(userId)}
              hasVideo={Boolean(
                (localParticipant.hasCamera ?? isCameraOn) ||
                  (localParticipant.hasScreenShare ?? isScreenSharing)
              )}
              videoSourceType={getParticipantVideoSourceType(localParticipant)}
              remoteUid={getParticipantVideoUid(localParticipant)}
              isScreenShareStream={getParticipantHasScreenStream(localParticipant)}
              mediaAspectRatio={getParticipantMediaAspectRatio(localParticipant)}
              matchSharerView={matchSharerView}
              isLocal
              variant="pip"
              onFlipCamera={onFlipCamera}
              rtcSurfaceView={rtcSurfaceView}
              renderModeType={renderModeType}
              videoSourceTypeEnum={videoSourceTypeEnum}
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
                isScreenShareStream={getParticipantHasScreenStream(participant)}
                mediaAspectRatio={getParticipantMediaAspectRatio(participant)}
                matchSharerView={matchSharerView}
                isLocal={participant.userId === userId}
                variant="strip"
                onPress={() =>
                  setPinnedVideoUserId((prev) => (prev === participant.userId ? null : participant.userId))
                }
                rtcSurfaceView={rtcSurfaceView}
                renderModeType={renderModeType}
                videoSourceTypeEnum={videoSourceTypeEnum}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.userId}
          state={participant}
          isSpeaking={speakingUsers.has(participant.userId)}
          hasVideo={Boolean(participant.hasCamera || participant.hasScreenShare)}
          videoSourceType={getParticipantVideoSourceType(participant)}
          remoteUid={getParticipantVideoUid(participant)}
          isScreenShareStream={getParticipantHasScreenStream(participant)}
          mediaAspectRatio={getParticipantMediaAspectRatio(participant)}
          matchSharerView={matchSharerView}
          isLocal={participant.userId === userId}
          onPress={
            participant.hasCamera || participant.hasScreenShare
              ? () =>
                  setPinnedVideoUserId((prev) => (prev === participant.userId ? null : participant.userId))
              : undefined
          }
          onFlipCamera={onFlipCamera}
          rtcSurfaceView={rtcSurfaceView}
          renderModeType={renderModeType}
          videoSourceTypeEnum={videoSourceTypeEnum}
        />
      ))}
    </View>
  );
}

export default VoiceParticipantLayout;
