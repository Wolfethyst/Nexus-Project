import React, { useEffect, useState } from 'react';
import { ApiClient } from '../lib/api';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  profile_image?: string;
  points: number;
  rank: number;
}

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get<{ leaderboard: LeaderboardEntry[] }>('/points/leaderboard?limit=50');
      if (response.ok && response.data?.leaderboard) {
        setEntries(response.data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span>Crystals Leaderboard</span>
        </div>
        <div className="panel-body flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Crystals Leaderboard</span>
      </div>

      <div className="panel-body flex flex-col gap-1.5 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 italic">No leaderboard data</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.user_id}
              className={`flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/10 font-['Marcellus'] transition-all ${
                entry.rank === 1
                  ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border-l-4 border-l-yellow-500'
                  : entry.rank === 2
                  ? 'bg-gradient-to-r from-gray-300/10 to-transparent border-l-4 border-l-gray-300'
                  : entry.rank === 3
                  ? 'bg-gradient-to-r from-amber-600/10 to-transparent border-l-4 border-l-amber-600'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`text-sm font-bold w-6 text-center ${
                    entry.rank === 1
                      ? 'text-yellow-400'
                      : entry.rank === 2
                      ? 'text-gray-300'
                      : entry.rank === 3
                      ? 'text-amber-600'
                      : 'text-purple-400'
                  }`}
                >
                  #{entry.rank}
                </div>
                {entry.profile_image && (
                  <img
                    src={entry.profile_image}
                    alt={entry.username}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate text-sm">
                    {entry.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-purple-300">
                  {entry.points.toLocaleString()}
                </span>
                <img
                  src="https://data.wolfethyst.tv/assets/wolfe_crystal"
                  alt="crystals"
                  className="w-5 h-5"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
