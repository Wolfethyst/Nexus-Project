import React from 'react';
import { Layout } from '../components';
import { useAuth, useVideoData } from '../hooks';
import { useVideoStore, useAuthStore } from '../store';

export const HomePage: React.FC = () => {
  const { session } = useAuthStore();
  const { vods } = useVideoStore();
  useVideoData();

  return (
    <Layout user={session?.user} onLogout={async () => {}}>
      <div className="space-y-4">
        <h1 className="font-heading text-3xl font-bold">Live Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vods.slice(0, 6).map((vod) => (
            <div
              key={vod.id}
              className="bg-nexus-dark/50 rounded-lg p-4 hover:bg-nexus-dark/80 cursor-pointer transition"
            >
              <h3 className="font-semibold">{vod.title}</h3>
              <p className="text-sm text-text-muted">
                {new Date(vod.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};
