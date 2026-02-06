import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  user?: { displayName: string; avatar?: string };
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-nexus-dark relative overflow-hidden">
      {/* Glassmorphic background gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-nexus-accent/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10">
        <Header user={user} onLogout={onLogout} />
        <main className="max-w-[1920px] mx-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};
