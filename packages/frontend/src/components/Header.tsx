
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Flex, Text, HStack, Center, Image, Link as ChakraLink, Avatar, Button } from '@chakra-ui/react';
import { ProfileMenu } from './ProfileMenu';
import { ApiClient } from '../lib/api';

interface HeaderProps {
  user?: {
    display?: string;
    points?:number;
    displayName?: string;
    avatar?: string;
    roles?: string[];
  };
  onLogout?: () => void;
  activeTab?: 'live' | 'vods';
  onTabChange?: (tab: 'live' | 'vods') => void;

}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, activeTab = 'live', onTabChange }) => {
  return (
    <Box 
      as="header" 
      bg="var(--header-bg)" 
      backdropFilter="blur(12px)"
      borderBottom="1px solid" 
      borderColor="var(--panel-border)" 
      px={8} 
      py={5} 
      position="relative"
      zIndex={50}
    >
      <Flex align="center" justify="space-between" position="relative">
        {/* LEFT - Sign In / User Profile */}
        <HStack gap={4} align="center">
          {user ? ( // if user show icon and points
            <ProfileMenu onLogout={onLogout}  />
           ) : (
             <ChakraLink href="https://api.wolfethyst.tv/auth/twitch/login" _hover={{ bgGradient: "to-r", gradientFrom: "purple.500", gradientTo: "pink.500", boxShadow: "0 0 15px rgba(236, 72, 153, 0.4)", textDecoration: 'none' }} transition="all 0.2s" px={4} py={1.5} borderRadius="md" bgGradient="to-r"
              gradientFrom="purple.600"
              gradientTo="pink.600"
              color="white"
              border="1px solid"
              borderColor="whiteAlpha.300"
              fontWeight="bold"
              fontFamily="Marcellus, serif"
              fontSize="sm"
            >
              Sign in
            </ChakraLink>
           )}
        </HStack>

        {/* CENTER - Tab Navigation */}
        <Center position="absolute" left="50%" transform="translateX(-50%)">
          <HStack gap={1} bg="blackAlpha.700" p={1} rounded="full" border="1px solid" borderColor="whiteAlpha.200">
            <Button
              onClick={() => onTabChange?.('live')}
              px={6}
              py={2}
              rounded="full"
              fontFamily="Cinzel, serif"
              fontSize="sm"
              fontWeight="bold"
              textTransform="uppercase"
              boxShadow={activeTab === 'live' ? '0 0 10px 2px #a78bfa80' : undefined}
              bg={activeTab === 'live' ? 'purple.500' : 'transparent'}
              color={activeTab === 'live' ? 'white' : 'gray.400'}
              _hover={{ color: 'white' }}
              transition="all 0.2s"
            >
              LIVE
            </Button>
            <Button
              onClick={() => onTabChange?.('vods')}
              px={6}
              py={2}
              rounded="full"
              fontFamily="Cinzel, serif"
              fontSize="sm"
              fontWeight="bold"
              textTransform="uppercase"
              boxShadow={activeTab === 'vods' ? '0 0 10px 2px #a78bfa80' : undefined}
              bg={activeTab === 'vods' ? 'purple.500' : 'transparent'}
              color={activeTab === 'vods' ? 'white' : 'gray.400'}
              _hover={{ color: 'white' }}
              transition="all 0.2s"
            >
              VODS
            </Button>
          </HStack>
        </Center>

        {/* RIGHT - NEXUS Brand */}
        <Link to="/">
          <Image src={`${ApiClient.baseURL}/assets/nexus_icon`} alt="Nexus Logo" h="40px" _hover={{ filter: 'brightness(1.2)' }} transition="filter 0.2s" />
        </Link>
      </Flex>
    </Box>
  );
};
