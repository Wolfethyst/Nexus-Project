import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  user?: {
    displayName: string;
    avatar?: string;
    roles?: string[];
  };
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-nexus-dark border-b border-purple-500/20 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* LEFT - Sign In / User Profile */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-primary">{user.displayName}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-2 px-3 py-1 text-xs bg-white/10 border border-white/20 rounded hover:bg-white/20 transition"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <a href="/api/auth/twitch/login" className="px-4 py-2 bg-purple-500/20 border border-purple-500 text-purple-200 rounded font-bold text-sm hover:bg-purple-500/30 transition">
              Sign in
            </a>
          )}
        </div>

        {/* RIGHT - NEXUS Brand */}
        <Link to="/" className="font-['Cinzel'] text-2xl font-bold text-purple-400 hover:text-purple-300 transition">
          NEXUS
        </Link>
      </div>
    </header>
  );
};
