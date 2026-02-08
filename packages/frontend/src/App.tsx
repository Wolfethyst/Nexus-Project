import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { HomePage, OwnerPage, ProfilePage } from './pages';
import { useAuth } from './hooks';
import { useAuthStore } from './store';

export const App: React.FC = () => {
  const { session } = useAuthStore();
  const { isInitialized, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'vods'>('live');

  const [authError, setAuthError] = useState<string | null>(null);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-nexus-dark">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-nexus-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Initializing Nexus...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen bg-nexus-dark">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Authentication Error</h1>
          <p className="text-muted">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout 
        user={session?.user}
        onLogout={async () => {
          const { logout } = useAuthStore.getState();
          await logout();
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <Routes>
          <Route path="/" element={<HomePage activeTab={activeTab} onTabChange={setActiveTab} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route 
            path="/admin" 
            element={isOwner ? <OwnerPage /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
