import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const streamUrl = import.meta.env.VITE_STREAM_HLS_URL as string | undefined;

export const StreamPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        backBufferLength: 30,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }
  }, []);

  return (
    <div className="panel lg:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Live Stream</h3>
        <span className="text-xs text-text-muted">Cloudflare Stream</span>
      </div>
      <div className="bg-black/40 rounded-lg overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
        {streamUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            Stream URL not configured
          </div>
        )}
      </div>
    </div>
  );
};
