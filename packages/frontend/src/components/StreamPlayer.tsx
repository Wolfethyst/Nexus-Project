import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Box, Flex, Button } from '@chakra-ui/react';

const streamUrl = import.meta.env.VITE_STREAM_HLS_URL as string | undefined;

export const StreamPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canGoLive, setCanGoLive] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return () => {};

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return () => {};
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 0,
        maxBufferLength: 3,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 2,
        maxLiveSyncPlaybackRate: 1,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      const onTimeUpdate = () => {
        if (!hls || !video.duration || Number.isNaN(video.duration)) {
          setCanGoLive(false);
          return;
        }

        const liveEdge = hls.liveSyncPosition || video.duration;
        const diff = Math.max(0, liveEdge - video.currentTime);
        setCanGoLive(diff > 2.5);
      };

      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('loadedmetadata', onTimeUpdate);

      return () => {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onTimeUpdate);
        hls.destroy();
        hlsRef.current = null;
      };
    }
    
    return () => {};
  }, []);

  const handleGoLive = () => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    if (hls?.liveSyncPosition) {
      video.currentTime = hls.liveSyncPosition;
    } else if (Number.isFinite(video.duration)) {
      video.currentTime = video.duration;
    }
  };

  return (
    <Box 
      w="full"
      h="full"
      bg="black" 
      overflow="hidden" 
      position="relative" 
    >
        {streamUrl ? (
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <Flex align="center" justify="center" h="full" color="gray.400">
            No stream URL
          </Flex>
        )}

        {/* GO LIVE BUTTON */}
        {canGoLive && (
          <Button
            onClick={handleGoLive}
            position="absolute"
            bottom={2}
            right={2}
            colorPalette="purple" 
            variant="solid"
            boxShadow="md"
            size="sm"
          >
            Go Live
          </Button>
        )}
    </Box>
  );
};