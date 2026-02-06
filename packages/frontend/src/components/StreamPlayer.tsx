import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const streamUrl = import.meta.env.VITE_STREAM_HLS_URL as string | undefined;

export const StreamPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canGoLive, setCanGoLive] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return;
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
    <div className="panel lg:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Live Stream</h3>
        <span className="text-xs text-text-muted">Cloudflare Stream</span>
      </div>
      <div className="bg-black/40 rounded-lg overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        {streamUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls={false}
            playsInline
            muted
            autoPlay
            disablePictureInPicture
            controlsList="nodownload noplaybackrate noremoteplayback"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            Stream URL not configured
          </div>
        )}
        {streamUrl && (
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center gap-2 text-xs text-white">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                LIVE
              </span>
              <span className="text-white/70">Low latency</span>
            </div>
            <button
              type="button"
              onClick={handleGoLive}
              className="btn-secondary text-xs"
              disabled={!canGoLive}
            >
              Go Live
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
