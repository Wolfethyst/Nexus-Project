import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StreamPlayer, VideoCard, VODPlayer, Chat, Leaderboard } from '../components';
import { useVideoStore, useAuthStore } from '../store';
import { useVideoData } from '../hooks/useVideo';
import { ApiClient } from '../lib/api';
import type { Video } from '@nexus/shared';

interface StreamInfo {
  title: string;
  game: string;
  live: boolean;
}

interface HomePageProps {
  activeTab: 'live' | 'vods';
  onTabChange: (tab: 'live' | 'vods') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ activeTab, onTabChange }) => {
  useVideoData(); // Load VODs from backend
  const { vods } = useVideoStore();
  const { session } = useAuthStore();
  const [streamInfo, setStreamInfo] = useState<StreamInfo>({ title: 'Stream Title Loading...', game: '', live: false });
  const [selectedVOD, setSelectedVOD] = useState<Video | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [ttsMessage, setTtsMessage] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  
  // Admin editable stream info
  const [editTitle, setEditTitle] = useState('');
  const [editGame, setEditGame] = useState('');
  const [savingStream, setSavingStream] = useState(false);
  
  const isOwner = session?.roles?.includes('owner') ?? false;
  const isMod = session?.roles?.includes('mod') ?? false;
  const canEdit = isOwner || isMod;

  useEffect(() => {
    loadStreamInfo();
  }, []);

  const loadStreamInfo = async () => {
    try {
      const response = await ApiClient.get<StreamInfo>('/streams/now');
      if (response.ok && response.data) {
        setStreamInfo(response.data);
        setEditTitle(response.data.title);
        setEditGame(response.data.game);
      }
    } catch (error) {
      console.error('Failed to load stream info:', error);
    }
  };

  const handleSaveStreamInfo = async () => {
    if (!canEdit) return;
    
    setSavingStream(true);
    try {
      const ownerToken = import.meta.env.VITE_OWNER_TOKEN;
      const response = await ApiClient.post(
        '/streams/title',
        { title: editTitle, game: editGame },
        ownerToken ? { headers: { 'X-Owner-Token': ownerToken } } : undefined
      );

      if (response.ok) {
        setStreamInfo({ ...streamInfo, title: editTitle, game: editGame });
      }
    } catch (error) {
      console.error('Failed to update stream info:', error);
    } finally {
      setSavingStream(false);
    }
  };

  const handleTTSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsMessage.trim() || ttsLoading) return;

    setTtsLoading(true);
    try {
      const response = await ApiClient.post('/redeems/tts', { message: ttsMessage });
      if (response.ok) {
        setTtsMessage('');
        alert('TTS sent successfully!');
      } else {
        alert(response.error || 'Failed to send TTS');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setTtsLoading(false);
    }
  };

  useEffect(() => {
    const vodId = searchParams.get('vod');
    if (vodId) {
      onTabChange('vods');
      const matchingVOD = vods.find(v => v.videoUrl?.includes(vodId) || v.videoId === vodId || v.id === vodId);
      if (matchingVOD) {
        setSelectedVOD(matchingVOD);
      }
    }
  }, [searchParams, vods, onTabChange]);

  const handleCloseVOD = () => {
    setSelectedVOD(null);
    setSearchParams({});
  };

  return (
    <div className="h-full flex flex-col">
      {/* V1 Three-Column Grid: 320px (LEFT) | 1fr (CENTER) | 380px (RIGHT for CHAT) */}
      <div className="flex-1 grid grid-cols-[320px_1fr_380px] gap-5 px-5 py-5 overflow-hidden h-full min-h-0">
        {/* LEFT COLUMN - Now Playing Card + Leaderboard */}
        <div className="h-full flex flex-col gap-5 overflow-hidden">
          {/* Now Playing Card */}
          <div className="relative rounded-xl overflow-hidden aspect-[2/3] border border-purple-500/20 shadow-xl flex-shrink-0">
            <img
              src="https://images.igdb.com/igdb/image/upload/t_cover_big/co85cg.jpg"
              className="w-full h-full object-cover"
              alt="Game Cover"
              onError={(e) => {
                e.currentTarget.src = 'https://data.wolfethyst.tv/assets/nexus_icon.png';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0014] via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-[10px] text-purple-400 uppercase mb-1">Current Session</div>
              <div className="font-['Cinzel'] text-[22px] leading-tight text-white mb-1 drop-shadow-lg">
                {streamInfo.game || 'Loading...'}
              </div>
              <div className="font-['Marcellus'] text-[13px] text-gray-300">
                {streamInfo.title}
              </div>
              <div className="mt-1.5 text-xs font-bold flex items-center gap-2">
                <span className={streamInfo.live ? 'text-purple-400' : 'text-gray-500'}>
                  {streamInfo.live ? '● Live' : '● Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="flex-1 overflow-hidden">
            <Leaderboard />
          </div>
        </div>

        {/* CENTER COLUMN - Stream/VODs */}
        <div className="h-full overflow-hidden">
          {activeTab === 'live' ? (
            <div className="panel h-full flex flex-col">
              {/* Stream Info Bar */}
              <div className="flex-shrink-0 bg-black/30 border-b border-white/10 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-['Cinzel'] text-base font-bold text-white truncate shadow-sm">
                      {streamInfo.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 text-purple-300">
                        {streamInfo.game || 'No game set'}
                      </span>
                      <span className={`font-bold flex items-center gap-1 ${streamInfo.live ? 'text-red-500' : 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${streamInfo.live ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                        {streamInfo.live ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Admin Controls */}
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title..."
                        className="w-[200px] bg-black/50 border border-white/20 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        value={editGame}
                        onChange={(e) => setEditGame(e.target.value)}
                        placeholder="Game..."
                        className="w-[120px] bg-black/50 border border-white/20 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={handleSaveStreamInfo}
                        disabled={savingStream}
                        className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded text-xs hover:bg-white/20 transition disabled:opacity-50"
                      >
                        {savingStream ? '...' : 'Save'}
                      </button>
                      <button className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded text-xs hover:bg-white/20 transition">
                        🎬 Clip
                      </button>
                    </div>
                  )}
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
                    <form onSubmit={handleTTSSubmit} className="flex flex-col gap-2">
                      <textarea
                        value={ttsMessage}
                        onChange={(e) => setTtsMessage(e.target.value)}
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
                          disabled={ttsLoading || !ttsMessage.trim()}
                          className="px-4 py-1.5 bg-purple-500/20 border border-purple-500 text-purple-200 rounded text-xs font-bold hover:bg-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {ttsLoading ? '...' : '➜'}
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

        {/* RIGHT COLUMN - Chat */}
        <div className="h-full overflow-hidden">
          <Chat />
        </div>
      </div>
    </div>
  );
};
