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
  const isOwner = user?.roles?.includes('owner') ?? false;

  return (
    <header className="bg-nexus-dark border-b border-purple-500/20 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-display text-2xl font-bold text-nexus-accent hover:text-nexus-accent-hover transition">
            NEXUS
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm hover:text-nexus-accent transition">
              Home
            </Link>
            {user && (
              <>
                <Link to="/profile" className="text-sm hover:text-nexus-accent transition">
                  Profile
                </Link>
                {isOwner && (
                  <Link to="/owner" className="text-sm hover:text-nexus-accent transition">
                    Owner Panel
                  </Link>
                )}
              </>
            )}
          </nav>
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
                  className="text-xs text-muted hover:text-primary transition"
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
