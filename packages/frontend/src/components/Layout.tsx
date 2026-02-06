import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  user?: { displayName: string; avatar?: string };
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header user={user} onLogout={onLogout} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
