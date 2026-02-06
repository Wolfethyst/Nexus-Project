import React from 'react';

interface HeaderProps {
  user?: {
    displayName: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-nexus-dark border-b border-purple-500/20 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="font-display text-2xl font-bold text-nexus-accent">
          NEXUS
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <span className="text-sm">{user.displayName}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <a href="/api/auth/twitch/login" className="btn-primary text-sm">
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
