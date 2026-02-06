import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  user?: { 
    display?: string;
    displayName?: string;
    avatar?: string;
    roles?: string[];
  };
  onLogout?: () => void;
  activeTab?: 'live' | 'vods';
  onTabChange?: (tab: 'live' | 'vods') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header user={user} onLogout={onLogout} activeTab={activeTab} onTabChange={onTabChange} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
