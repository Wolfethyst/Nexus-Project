
import React, { useEffect } from 'react';
import { Header } from './Header';
import { Flex, Box } from '@chakra-ui/react';
import { useThemeStore } from '../store/useThemeStore';


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
  showNav?: boolean;
  showHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, onTabChange, showNav = true, showHeader = true }) => {
  const { theme, colorStyle } = useThemeStore();

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-color', colorStyle);
  }, [theme, colorStyle]);

  return (
    <Flex 
      direction="column" 
      h="100vh" 
      bg="var(--bg-primary)"
      bgImage="radial-gradient(circle at 50% -10%, var(--bg-gradient-start) 0%, var(--bg-gradient-mid) 40%, var(--bg-gradient-end) 100%)"
      color="var(--text-primary)"
    >
      {showHeader && (
        <Header user={user} onLogout={onLogout} activeTab={activeTab} onTabChange={onTabChange} showNav={showNav} />
      )}
      <Box as="main" flex="1" position="relative">
        {children}
      </Box>
    </Flex>
  );
};
