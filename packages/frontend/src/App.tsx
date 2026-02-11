import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { HomePage, OwnerPage, ProfilePage, NotFoundPage } from './pages';
import { useAuth } from './hooks';
import { useAuthStore } from './store';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';

export const App: React.FC = () => {
  const { session } = useAuthStore();
  const { isInitialized, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'vods'>('live');

  // Removed unused setAuthError

  if (!isInitialized) {
    return (
      <Center h="100vh" bg="#05010a" bgImage="radial-gradient(circle at 50% 50%, #1a052e 0%, #05010a 100%)">
        <VStack gap={4}>
          <Spinner size="xl" color="purple.500" borderWidth="4px" animationDuration="0.65s" />
          <Text color="purple.200" fontFamily="Cinzel, serif" animation="pulse 2s infinite">Initializing Nexus...</Text>
        </VStack>
      </Center>
    );
  }

  // Removed all references to authError

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
            path="/owner" 
            element={isOwner ? <OwnerPage /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
