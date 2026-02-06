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
  ];

  useEffect(() => {
    // Future: Fetch real leaderboard data from API
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-300';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-nexus-accent';
    }
  };

  return (
    <div className="glass-sidebar flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4 pb-4 border-b border-purple-500/20">
        <h3 className="font-heading text-xl font-bold text-nexus-accent">Leaderboard</h3>
        <p className="text-xs text-muted mt-1">Top viewers this month</p>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="glass-card hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold w-8 ${getRankColor(entry.rank)}`}>
                {entry.rank}
              </div>
              <div className="text-2xl">{entry.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary truncate">
                  {entry.username}
                </p>
                <p className="text-xs text-muted">
                  {entry.points.toLocaleString()} points
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-purple-500/20">
        <div className="glass-card text-center">
          <p className="text-sm text-muted">Your Rank</p>
          <p className="text-2xl font-bold text-nexus-accent mt-1">#42</p>
          <p className="text-xs text-muted mt-1">3,245 points</p>
        </div>
      </div>
    </div>
  );
};
