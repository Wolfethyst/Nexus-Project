import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StreamPlayer, VideoCard, VODPlayer, Chat, Leaderboard } from '../components';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'live' | 'vods'>('live');

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

  useEffect(() => {
    const vodId = searchParams.get('vod');
    if (vodId) {
      setActiveTab('vods');
      const matchingVOD = vods.find(v => v.videoUrl?.includes(vodId) || v.videoId === vodId || v.id === vodId);
      if (matchingVOD) {
        setSelectedVOD(matchingVOD);
      }
    }
  }, [searchParams, vods]);

  const handleCloseVOD = () => {
    setSelectedVOD(null);
    setSearchParams({});
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => { setActiveTab('live'); setSelectedVOD(null); setSearchParams({}); }}
          className={`px-8 py-3 rounded-xl font-heading font-bold transition-all duration-300 ${
            activeTab === 'live'
              ? 'glass-card bg-nexus-accent/30 text-white border-nexus-accent/50 shadow-lg shadow-nexus-accent/20'
              : 'glass-card text-gray-400 hover:bg-purple-500/10'
          }`}
        >
          🔴 LIVE
        </button>
        <button
          onClick={() => setActiveTab('vods')}
          className={`px-8 py-3 rounded-xl font-heading font-bold transition-all duration-300 ${
            activeTab === 'vods'
              ? 'glass-card bg-nexus-accent/30 text-white border-nexus-accent/50 shadow-lg shadow-nexus-accent/20'
              : 'glass-card text-gray-400 hover:bg-purple-500/10'
          }`}
        >
          📺 VODS
        </button>
      </div>

      {/* Three Column Layout */}
      {activeTab === 'live' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Chat */}
          <div className="lg:col-span-3">
            <Chat />
          </div>

          {/* Center - Stream Player */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-nexus-accent">Live Stream</h2>
                  <p className="text-sm text-muted flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Live • Low latency HLS
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">Total VODs</p>
                  <p className="text-2xl font-bold text-nexus-accent">{stats.vodCount}</p>
                </div>
              </div>
              <StreamPlayer />
            </div>

            {/* Stream Info Panel */}
            <div className="glass-panel">
              <h3 className="font-heading text-lg font-bold mb-3">Stream Stats</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-nexus-accent">{stats.vodCount}</p>
                  <p className="text-xs text-muted mt-1">Total VODs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-nexus-success">{stats.clipCount}</p>
                  <p className="text-xs text-muted mt-1">Total Clips</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{stats.userCount}</p>
                  <p className="text-xs text-muted mt-1">Viewers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Leaderboard */}
          <div className="lg:col-span-3">
            <Leaderboard />
          </div>
        </div>
      ) : selectedVOD && selectedVOD.videoUrl ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Chat */}
          <div className="lg:col-span-3">
            <Chat />
          </div>

          {/* Center - VOD Player */}
          <div className="lg:col-span-6">
            <div className="glass-panel">
              <VODPlayer
                videoUrl={selectedVOD.videoUrl}
                title={selectedVOD.title}
                date={selectedVOD.createdAt}
                provider={selectedVOD.platform === 'youtube' ? 'youtube' : selectedVOD.platform === 'twitch' ? 'twitch' : 'youtube'}
                onClose={handleCloseVOD}
              />
            </div>
          </div>

          {/* Right Sidebar - Leaderboard */}
          <div className="lg:col-span-3">
            <Leaderboard />
          </div>
        </div>
      ) : selectedVOD ? (
        <div className="glass-panel max-w-2xl mx-auto">
          <p className="text-center text-muted">Video URL not available</p>
          <button onClick={handleCloseVOD} className="btn-secondary mt-4 mx-auto block">Close</button>
        </div>
      ) : (
        vods.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Sidebar - Chat */}
            <div className="lg:col-span-3">
              <Chat />
            </div>

            {/* Center - VOD Grid */}
            <div className="lg:col-span-6">
              <div className="glass-panel">
                <h2 className="font-heading text-2xl font-bold mb-4 text-nexus-accent">All VODs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vods.map((video: Video) => (
                    <div key={video.id} onClick={() => setSelectedVOD(video)}>
                      <VideoCard video={video} onPlay={() => setSelectedVOD(video)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Leaderboard */}
            <div className="lg:col-span-3">
              <Leaderboard />
            </div>
          </div>
        ) : (
          <div className="glass-panel max-w-2xl mx-auto">
            <p className="text-center text-muted">No VODs available</p>
          </div>
        )
      )}
    </div>
  );
};
