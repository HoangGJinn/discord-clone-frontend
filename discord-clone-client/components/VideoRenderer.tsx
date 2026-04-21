import React, { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';

interface VideoRendererProps {
  track: any;
  style?: ViewStyle;
  muted?: boolean;
}

/**
 * VideoRenderer - Hiển thị video stream từ Agora
 * Sử dụng native DOM elements cho web, placeholder cho mobile
 */
const VideoRenderer = memo(function VideoRenderer({ 
  track, 
  style, 
  muted = false 
}: VideoRendererProps) {
  const containerRef = useRef<View>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!track) return;

    const renderVideo = async () => {
      if (Platform.OS === 'web') {
        try {
          // Get container element for web
          const container = document.getElementById(`video-container-${track.getId?.() || 'local'}`);
          if (container) {
            // For web, we need to use the track's play method or render to a container
            if (track.play) {
              await track.play(container as any);
            } else if (track.renderer) {
              // Some versions use renderer
              track.renderer.renderVideo(container as any, track.getId(), 640, 480, 0, 0, 2);
            }
          }
        } catch (error) {
          console.log('[VideoRenderer] Web video render error:', error);
        }
      }
    };

    renderVideo();

    return () => {
      if (track && track.isPlaying?.()) {
        track.stop();
      }
    };
  }, [track]);

  if (Platform.OS === 'web') {
    // For web, render a div that Agora will use
    return (
      <View 
        ref={containerRef} 
        style={[styles.container, style]}
      >
        <div 
          id={`video-container-${track?.getId?.() || 'unknown'}`}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  // For mobile, show placeholder (actual video rendering requires native setup)
  return (
    <View style={[styles.container, styles.placeholder, style]}>
      <View style={styles.videoPlaceholder}>
        {/* Placeholder for mobile - video would render with native views */}
      </View>
    </View>
  );
});

export const LocalVideoView = memo(function LocalVideoView({
  track,
  style,
  muted = true,
}: VideoRendererProps) {
  return <VideoRenderer track={track} style={style} muted={muted} />;
});

export const RemoteVideoView = memo(function RemoteVideoView({
  uid,
  track,
  style,
  muted = false,
}: VideoRendererProps & { uid: string | number }) {
  return <VideoRenderer track={track} style={style} muted={muted} />;
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#444',
    borderRadius: 20,
  },
});

export default VideoRenderer;
