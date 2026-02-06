import React, { useEffect, useState } from 'react';
import { StreamPlayer, VideoCard, VODPlayer } from '../components';
import { useVideoStore } from '../store';
import { ApiClient } from '../lib/api';
import type { Video } from '@nexus/shared';

interface Stats {
  vodCount: number;
  clipCount: number;
  userCount: number;
}

export const HomePage: React.FC = () => {
  const { vods } = useVideoStore();
  const [stats, setStats] = useState<Stats>({ vodCount: 0, clipCount: 0, userCount: 0 });
  const [selectedVOD, setSelectedVOD] = useState<Video | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await ApiClient.get<Stats>('/owner/stats');
        if (response.ok && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {selectedVOD && selectedVOD.videoUrl ? (
        <VODPlayer
          videoUrl={selectedVOD.videoUrl}
          title={selectedVOD.title}
          provider={selectedVOD.platform === 'youtube' ? 'youtube' : selectedVOD.platform === 'twitch' ? 'twitch' : 'youtube'}
          onClose={() => setSelectedVOD(null)}
        />
      ) : selectedVOD ? (
        <div className="panel">
          <p className="text-center text-muted">Video URL not available</p>
          <button onClick={() => setSelectedVOD(null)} className="btn-secondary mt-4">Close</button>
        </div>
      ) : (
        <>
          <section>
            <h2 className="font-heading text-2xl font-bold mb-4">Live Stream</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="panel lg:col-span-1">
                <h3 className="font-semibold mb-2">Live Status</h3>
                <p className="text-sm text-muted">● Live</p>
                <p className="text-xs text-muted mt-1">Low latency HLS</p>
              </div>
              <StreamPlayer />
              <div className="panel lg:col-span-1">
                <h3 className="font-semibold mb-2">Total VODs</h3>
                <p className="text-2xl font-bold text-nexus-accent">{stats.vodCount}</p>
                <h3 className="font-semibold mb-2 mt-4">Total Clips</h3>
                <p className="text-2xl font-bold text-nexus-accent">{stats.clipCount}</p>
              </div>
            </div>
          </section>

          {vods.length > 0 && (
            <section>
              <h2 className="font-heading text-2xl font-bold mb-4">Recent VODs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {vods.slice(0, 8).map((video: Video) => (
                  <div key={video.id} onClick={() => setSelectedVOD(video)}>
                    <VideoCard video={video} onPlay={() => setSelectedVOD(video)} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
