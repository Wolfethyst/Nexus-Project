import React, { useState, useEffect } from 'react';
import { Layout } from '../components';
import { useAuth } from '../hooks';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';

export const OwnerPage: React.FC = () => {
  const { session } = useAuthStore();
  const { isOwner } = useAuth();
  const [stats, setStats] = useState({ vods: 0, clips: 0, users: 0 });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamGame, setStreamGame] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadStats();
    loadStreamInfo();
  }, []);

  const loadStats = async () => {
    const res = await ApiClient.get<typeof stats>('/owner/stats');
    if (res.ok && res.data) {
      setStats(res.data);
    }
  };

  const loadStreamInfo = async () => {
    const res = await ApiClient.get<{ title: string; game: string }>('/streams/now');
    if (res.ok && res.data) {
      setStreamTitle(res.data.title);
      setStreamGame(res.data.game);
    }
  };

  const handleUpdateStream = async () => {
    setUpdating(true);
    try {
      const ownerToken = import.meta.env.VITE_OWNER_TOKEN;
      const res = await ApiClient.post(
        '/streams/title',
        { title: streamTitle, game: streamGame },
        ownerToken ? { headers: { 'X-Owner-Token': ownerToken } } : undefined
      );

      if (res.ok) {
        alert('Stream info updated!');
      } else {
        alert(res.error || 'Update failed');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleYouTubeSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const ownerToken = import.meta.env.VITE_OWNER_TOKEN;
      const res = await ApiClient.post<{ ok: boolean; synced: number; skipped: number; total: number }>(
        '/owner/youtube/sync',
        {},
        ownerToken ? { headers: { 'X-Owner-Token': ownerToken } } : undefined
      );
      
      if (res.ok && res.data) {
        setSyncResult(res.data);
        await loadStats(); // Refresh stats
      } else {
        setSyncResult({ error: res.error || 'Sync failed' });
      }
    } catch (error) {
      setSyncResult({ error: 'Network error' });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOwner) {
    return (
      <Layout user={session?.user}>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-muted mt-2">Owner access required</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={session?.user}>
      <div className="space-y-6">
        <h1 className="font-heading text-3xl font-bold">Owner Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="panel">
            <h3 className="text-sm text-muted mb-1">Total VODs</h3>
            <p className="text-3xl font-bold text-nexus-accent">{stats.vods}</p>
          </div>
          <div className="panel">
            <h3 className="text-sm text-muted mb-1">Total Clips</h3>
            <p className="text-3xl font-bold text-nexus-accent">{stats.clips}</p>
          </div>
          <div className="panel">
            <h3 className="text-sm text-muted mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-nexus-accent">{stats.users}</p>
          </div>
        </div>

        {/* YouTube Sync */}
        <div className="panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">YouTube Video Sync</h2>
              <p className="text-sm text-muted">Import your YouTube videos as VODs</p>
            </div>
            <button
              onClick={handleYouTubeSync}
              disabled={syncing || !session?.youtube}
              className="btn-primary"
            >
              {syncing ? 'Syncing...' : 'Sync YouTube Videos'}
            </button>
          </div>

          {!session?.youtube && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-sm">
              ⚠️ YouTube account not connected. Connect YouTube to enable sync.
            </div>
          )}

          {syncResult && (
            <div className={`mt-4 p-4 rounded ${syncResult.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
              {syncResult.error ? (
                <p className="text-red-400">{syncResult.error}</p>
              ) : (
                <div className="text-green-400">
                  <p className="font-semibold">✓ Sync complete!</p>
                  <p className="text-sm mt-1">
                    Synced: {syncResult.synced} | Skipped: {syncResult.skipped} | Total: {syncResult.total}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stream Management */}
        <div className="panel">
          <h2 className="font-semibold text-lg mb-3">Stream Management</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-muted mb-1">Stream Title</label>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter stream title..."
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Game Name</label>
              <input
                type="text"
                value={streamGame}
                onChange={(e) => setStreamGame(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter game name..."
              />
            </div>
            <button
              onClick={handleUpdateStream}
              disabled={updating}
              className="btn-primary w-full"
            >
              {updating ? 'Updating...' : 'Update Stream Info'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
