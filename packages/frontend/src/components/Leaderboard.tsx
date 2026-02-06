import React, { useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar?: string;
}

export const Leaderboard: React.FC = () => {
  const entries: LeaderboardEntry[] = [
    { rank: 1, username: 'TopViewer', points: 15420, avatar: '🥇' },
    { rank: 2, username: 'StreamFan', points: 12350, avatar: '🥈' },
    { rank: 3, username: 'NexusKing', points: 10890, avatar: '🥉' },
    { rank: 4, username: 'ChatMaster', points: 8760, avatar: '👑' },
    { rank: 5, username: 'VodWatcher', points: 7340, avatar: '⭐' },
    { rank: 6, username: 'LoyalFan', points: 6820, avatar: '💎' },
    { rank: 7, username: 'StreamSniper', points: 5940, avatar: '🎯' },
    { rank: 8, username: 'ClipChamp', points: 5120, avatar: '🎬' },
  ];

  useEffect(() => {
    // Future: Fetch real leaderboard data from API
  }, []);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Crystals Leaderboard</span>
      </div>

      <div className="panel-body flex flex-col gap-1.5">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/10 font-['Marcellus'] ${
              entry.rank === 1
                ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border-l-4 border-l-yellow-500'
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
                {entry.rank}
              </div>
              {entry.avatar && <div className="text-lg">{entry.avatar}</div>}
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
        ))}
      </div>
    </div>
  );
};
