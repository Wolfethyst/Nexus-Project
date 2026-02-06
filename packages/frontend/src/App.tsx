import React, { useEffect } from 'react';
import { Layout } from '../components';
import { useAuth } from '../hooks';
import { useAuthStore } from '../store';

export const App: React.FC = () => {
  const { session } = useAuthStore();
  const { isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-nexus-dark">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-nexus-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted">Initializing Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={session?.user}
      onLogout={async () => {
        const { logout } = useAuthStore.getState();
        await logout();
      }}
    >
      <div className="space-y-6">
        <section>
          <h2 className="font-heading text-2xl font-bold mb-4">Welcome to Nexus v2</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="panel">
              <h3 className="font-semibold mb-2">Live Status</h3>
              <p className="text-sm text-text-muted">● Offline</p>
            </div>
            <div className="panel">
              <h3 className="font-semibold mb-2">Total VODs</h3>
              <p className="text-2xl font-bold text-nexus-accent">--</p>
            </div>
            <div className="panel">
              <h3 className="font-semibold mb-2">Total Clips</h3>
              <p className="text-2xl font-bold text-nexus-accent">--</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default App;
