import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  user?: { displayName: string; avatar?: string };
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-nexus-dark">
      <Header user={user} onLogout={onLogout} />
      <main className="max-w-7xl mx-auto p-4">
        {children}
      </main>
    </div>
  );
};
