
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Flex, Avatar, Button, Text, HStack, Center } from '@chakra-ui/react';

interface HeaderProps {
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

export const Header: React.FC<HeaderProps> = ({ user, onLogout, activeTab = 'live', onTabChange }) => {
  return (
    <Box 
      as="header" 
      bg="rgba(15, 5, 25, 0.7)" 
      backdropFilter="blur(12px)"
      borderBottom="1px solid" 
      borderColor="whiteAlpha.100" 
      px={8} 
      py={5} 
      position="relative"
      zIndex={50}
    >
      <Flex align="center" justify="space-between" position="relative">
        {/* LEFT - Sign In / User Profile */}
        <HStack spacing={4} align="center">
          {user ? (
            <HStack spacing={3} align="center">
              {user.avatar && (
                <Avatar.Root size="md">
                  <Avatar.Image src={user.avatar} />
                  <Avatar.Fallback name={user.display || user.displayName || 'User'} />
                </Avatar.Root>
              )}
              <Text fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold" color="purple.200">{user.display || user.displayName || 'User'}</Text>
              {onLogout && (
                <Button fontFamily="Cinzel, serif" onClick={onLogout} size="xs" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.300" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
                  Logout
                </Button>
              )}
            </HStack>
          ) : (
            <Button
              as="a"
              href="https://api.wolfethyst.tv/auth/twitch/login"
              size="lg"
              bgGradient="to-r"
              gradientFrom="purple.600"
              gradientTo="pink.600"
              color="white"
              border="1px solid"
              borderColor="whiteAlpha.300"
              fontWeight="bold"
              fontFamily="Cinzel, serif"
              fontSize="lg"
              _hover={{ bgGradient: "to-r", gradientFrom: "purple.500", gradientTo: "pink.500", boxShadow: "0 0 15px rgba(236, 72, 153, 0.4)" }}
              transition="all 0.2s"
              px={8}
            >
              Sign in
            </Button>
          )}
        </HStack>

        {/* CENTER - Tab Navigation */}
        <Center position="absolute" left="50%" transform="translateX(-50%)">
          <HStack spacing={1} bg="blackAlpha.700" p={1} rounded="full" border="1px solid" borderColor="whiteAlpha.200">
            <Button
              onClick={() => onTabChange?.('live')}
              px={6}
              py={6}
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
              py={6}
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
          <Text fontFamily="Cinzel, serif" fontSize="3xl" fontWeight="bold" color="purple.400" _hover={{ color: 'purple.300' }} transition="color 0.2s" letterSpacing="widest">
            NEXUS
          </Text>
        </Link>
      </Flex>
    </Box>
  );
};
