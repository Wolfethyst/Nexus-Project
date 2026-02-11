
import React from 'react';
import { Header } from './Header';
import { Flex, Box } from '@chakra-ui/react';


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
    <Flex 
      direction="column" 
      h="100vh" 
      overflow="hidden"
      bg="#05010a"
      bgImage="radial-gradient(circle at 50% -10%, #3b0d60 0%, #1a052e 40%, #05010a 100%)"
      color="white"
    >
      <Header user={user} onLogout={onLogout} activeTab={activeTab} onTabChange={onTabChange} />
      <Box as="main" flex="1" overflow="hidden" position="relative">
        {children}
      </Box>
    </Flex>
  );
};
