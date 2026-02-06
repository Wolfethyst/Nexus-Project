import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { HomePage, OwnerPage, ProfilePage } from './pages';
import { useAuth } from './hooks';
import { useAuthStore } from './store';

export const App: React.FC = () => {
  const { session } = useAuthStore();
  const { isInitialized, isOwner } = useAuth();

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

  return (
    <BrowserRouter>
      <Layout 
        user={session?.user}
        onLogout={async () => {
          const { logout } = useAuthStore.getState();
          await logout();
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route 
            path="/owner" 
            element={isOwner ? <OwnerPage /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
