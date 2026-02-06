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
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex items-center justify-center py-4">
        <div className="flex gap-1 bg-black/30 p-1 rounded-full border border-white/10">
          <button
            onClick={() => { setActiveTab('live'); setSelectedVOD(null); setSearchParams({}); }}
            className={`px-6 py-2 rounded-full font-['Cinzel'] text-xs font-bold uppercase transition-all ${
              activeTab === 'live'
                ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/50'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            LIVE
          </button>
          <button
            onClick={() => setActiveTab('vods')}
            className={`px-6 py-2 rounded-full font-['Cinzel'] text-xs font-bold uppercase transition-all ${
              activeTab === 'vods'
                ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/50'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            VODS
          </button>
        </div>
      </div>

      {/* V1 Three-Column Grid: 320px | 1fr | 380px */}
      <div className="flex-1 grid grid-cols-[320px_1fr_380px] gap-5 px-5 pb-5 overflow-hidden h-full min-h-0">
        {/* Left Column - Chat */}
        <div className="h-full overflow-hidden">
          <Chat />
        </div>

        {/* Center Column - Stream/VODs */}
        <div className="h-full overflow-hidden">
          {activeTab === 'live' ? (
            <div className="panel h-full flex flex-col">
              {/* Stream Info Bar */}
              <div className="flex-shrink-0 bg-black/30 border-b border-white/10 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-['Cinzel'] text-base font-bold text-white truncate shadow-sm">
                      Stream Title Loading...
                    </h2>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 text-purple-300">
                        Game Name
                      </span>
                      <span className="text-red-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        Live
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stream Player */}
              <div className="flex-shrink-0 w-full aspect-video bg-black">
                <StreamPlayer />
              </div>

              {/* Stream Interactions */}
              <div className="flex-1 bg-black/40 border-t border-white/10 p-4 overflow-y-auto">
                <div className="flex gap-5">
                  <div className="w-72 flex-shrink-0 border-r border-white/10 pr-5">
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                      Text-To-Speech
                    </div>
                    <form className="flex flex-col gap-2">
                      <textarea
                        placeholder="Type message..."
                        maxLength={150}
                        className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-white text-sm resize-none h-20 focus:outline-none focus:border-purple-500"
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          Cost: <span className="text-purple-400 font-bold">250</span>{' '}
                          <img
                            src="https://data.wolfethyst.tv/assets/wolfe_crystal"
                            alt="crystal"
                            className="inline w-3.5 h-3.5"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-purple-500/20 border border-purple-500 text-purple-200 rounded text-xs font-bold hover:bg-purple-500/30 transition"
                        >
                          ➜
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                      Quick Redeems
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Placeholder redeem cards */}
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center hover:border-purple-500/50 transition cursor-pointer">
                        <div className="text-2xl mb-1">🎉</div>
                        <div className="text-xs text-white font-bold">Celebration</div>
                        <div className="text-xs text-purple-400 mt-1">500 💎</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedVOD && selectedVOD.videoUrl ? (
            <div className="panel h-full">
              <VODPlayer
                videoUrl={selectedVOD.videoUrl}
                title={selectedVOD.title}
                date={selectedVOD.createdAt}
                provider={selectedVOD.platform === 'youtube' ? 'youtube' : selectedVOD.platform === 'twitch' ? 'twitch' : 'youtube'}
                onClose={handleCloseVOD}
              />
            </div>
          ) : selectedVOD ? (
            <div className="panel h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 mb-4">Video URL not available</p>
                <button onClick={handleCloseVOD} className="btn-secondary">Close</button>
              </div>
            </div>
          ) : (
            <div className="panel h-full flex flex-col">
              <div className="panel-header">
                <span>All VODs</span>
              </div>
              <div className="panel-body">
                {vods.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {vods.map((video: Video) => (
                      <div key={video.id} onClick={() => setSelectedVOD(video)}>
                        <VideoCard video={video} onPlay={() => setSelectedVOD(video)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 italic">No VODs available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Leaderboard */}
        <div className="h-full overflow-hidden">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};
