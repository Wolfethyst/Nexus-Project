import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StreamPlayer, VideoCard, VODPlayer, Chat, Leaderboard, Marketplace } from '../components';
import { useVideoStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { useVideoData } from '../hooks/useVideo';
import { ApiClient } from '../lib/api';
import type { Video } from '@nexus/shared';
import { Grid, Box, Flex, Button, Text } from '@chakra-ui/react';

interface StreamInfo {
  title?: string;
  game?: string;
  live?: boolean;
}

interface HomePageProps {
  activeTab: 'live' | 'vods';
  onTabChange: (tab: 'live' | 'vods') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ activeTab, onTabChange }) => {
  useAuth(); // Ensure session and roles are loaded
  useVideoData(); // Load VODs from backend
  const { vods } = useVideoStore();
  const [streamInfo, setStreamInfo] = useState<StreamInfo>({ title: 'Stream Title Loading...', game: 'Loading...', live: false });
  const [selectedVOD, setSelectedVOD] = useState<Video | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // Only owner can edit stream info and see owner controls

  useEffect(() => {
    const vodId = searchParams.get('vod');
    if (vodId) {
      onTabChange('vods');
      const matchingVOD = vods.find(v => v.videoUrl?.includes(vodId) || v.videoId === vodId || v.id === vodId);
      if (matchingVOD) {
        setSelectedVOD(matchingVOD);
      }
    }
  }, [searchParams, vods, onTabChange]);

  // Fetch stream info on component mount
  useEffect(() => {
    const fetchStreamInfo = async () => {
      try {
        const response = await ApiClient.get<StreamInfo>('/stream/info');
        if (response.ok && response.data) {
          setStreamInfo(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stream info:', error);
      }
    };
    fetchStreamInfo();
  }, []);

  const handleCloseVOD = () => {
    setSelectedVOD(null);
    setSearchParams({});
  };

  return (
    <Box w="full" h="full" px={{ base: 2, md: 8 }} py={{ base: 2, md: 6 }} display="flex" alignItems="stretch" justifyContent="center">
      <Grid
        display="grid"
        templateColumns={{ base: '1fr', md: '420px 1fr 420px' }}
        gap={{ base: 2, md: 2 }}
        flex={1}
        minH={0}
        h="full"
        alignItems="stretch"
        p={0}
        style={{ gridTemplateColumns: '420px 1fr 420px', height: '100%' }}
      >
        {/* LEFT COLUMN - Session Info & Leaderboard */}
        <Box display="flex" flexDirection="column" minH={0} h="full" minW="420px" gap={2} bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)" overflow="hidden">
          {/* Current Session Info */}
          <Box position="relative" p={6} bg="blackAlpha.400" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100" minH="220px" display="flex" alignItems="center">
            <Flex gap={6} w="full" align="center">
              {/* Game Cover Art */}
              <Box 
                w="110px" 
                h="150px" 
                bg="gray.800" 
                borderRadius="md" 
                overflow="hidden" 
                boxShadow="0 4px 10px rgba(0,0,0,0.5)"
                flexShrink={0}
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                {/* Placeholder for Game Cover - Replace src with dynamic data later */}
                <Box w="full" h="full" bgGradient="to-br" gradientFrom="purple.900" gradientTo="gray.900" display="flex" alignItems="center" justifyContent="center">
                  <Box fontSize="2xl">🎮</Box>
                </Box>
              </Box>

              {/* Info Text */}
              <Box flex={1} minW={0} display="flex" flexDirection="column" justifyContent="center">
                <Box fontFamily="Cinzel, serif" fontSize="xs" color="purple.300" fontWeight="bold" letterSpacing="wider" mb={1} textTransform="uppercase">
                  Current Session
                </Box>
                <Box fontFamily="Cinzel, serif" fontSize="lg" lineHeight="1.2" color="white" mb={1} textShadow="0 2px 8px #3d0066" truncate>
                  {streamInfo.game ?? 'Just Chatting'}
                </Box>
                <Text fontFamily="Cinzel, serif" fontSize="xs" color="gray.300" mb={2} lineClamp={2}>
                  {streamInfo.title ?? 'Stream is currently offline'}
                </Text>
                <Flex fontSize="sm" fontWeight="bold" align="center" gap={2}>
                  <Box as="span" color={streamInfo.live ? 'red.400' : 'gray.500'} fontSize="md" animation={streamInfo.live ? 'pulse 2s infinite' : undefined}>
                    {streamInfo.live ? '● LIVE' : '● OFFLINE'}
                  </Box>
                </Flex>
              </Box>
            </Flex>
          </Box>
          {/* Leaderboard */}
          <Box flex={1} minH={0} overflow="hidden">
            <Leaderboard />
          </Box>
        </Box>
        {/* CENTER COLUMN - Stream/VODs */}
        <Box h="full" minH={0} minW={0} flex={2} overflow="hidden" display="flex" flexDirection="column" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
          {activeTab === 'live' ? (
            <Flex direction="column" h="full">
              <Box flexShrink={0} display="flex" flexDirection="column" overflow="hidden">
              {/* Stream Info Bar */}
              <Flex align="center" justify="space-between" bg="blackAlpha.700" borderBottom="1px solid" borderColor="whiteAlpha.200" px={6} py={3}>
                <Box fontSize="lg" fontWeight="bold" color="purple.200" fontFamily="Cinzel, serif">{streamInfo.title || 'Live Stream'}</Box>
                {/* ...existing code... */}
              </Flex>
              {/* Stream Player */}
              <Box w="full" aspectRatio={16/9} bg="black">
                <StreamPlayer />
              </Box>
              </Box>
              <Box flex={1} minH={0} bg="blackAlpha.300">
                <Marketplace />
              </Box>
            </Flex>
          ) : selectedVOD && selectedVOD.videoUrl ? (
            <Box h="full" minH={0} overflow="auto" bg="rgba(40,0,60,0.45)" borderRadius="xl" boxShadow="md" backdropFilter="blur(10px)" border="1px solid rgba(255,150,255,0.20)">
              <VODPlayer
                videoUrl={selectedVOD.videoUrl}
                title={selectedVOD.title ?? ''}
                date={selectedVOD.createdAt}
                provider={selectedVOD.platform === 'youtube' ? 'youtube' : selectedVOD.platform === 'twitch' ? 'twitch' : 'youtube'}
                onClose={handleCloseVOD}
              />
            </Box>
          ) : selectedVOD ? (
            <Box h="full" minH={0} display="flex" alignItems="center" justifyContent="center" overflow="auto" bg="rgba(40,0,60,0.45)" borderRadius="xl" boxShadow="md" backdropFilter="blur(10px)" border="1px solid rgba(255,150,255,0.20)">
              <Box textAlign="center">
                <Box fontFamily="Cinzel, serif" color="gray.400" mb={4}>Video URL not available</Box>
                <Button fontFamily="Cinzel, serif" onClick={handleCloseVOD} colorPalette="purple" variant="outline">Close</Button>
              </Box>
            </Box>
          ) : (
            <Box h="full" minH={0} display="flex" flexDirection="column" overflow="auto" bg="rgba(40,0,60,0.45)" borderRadius="xl" boxShadow="md" backdropFilter="blur(10px)" border="1px solid rgba(255,150,255,0.20)">
              <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={4} py={3} fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" justifyContent="space-between" alignItems="center" flexShrink={0}>All VODs</Box>
              <Box flex={1} overflowY="auto" minH={0}>
                {vods.length > 0 ? (
                  <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                    {vods.map((video: Video) => (
                      <Box key={video.id} onClick={() => setSelectedVOD(video)} cursor="pointer">
                        <VideoCard video={video} onPlay={() => setSelectedVOD(video)} />
                      </Box>
                    ))}
                  </Grid>
                ) : (
                  <Flex align="center" justify="center" h="full">
                    <Box fontFamily="Cinzel, serif" color="gray.400" fontStyle="italic">No VODs available</Box>
                  </Flex>
                )}
              </Box>
            </Box>
          )}
        </Box>
        {/* RIGHT COLUMN - Chat */}
        <Box h="full" minH={0} minW="420px" flex={1} overflow="hidden" display="flex" flexDirection="column" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
          <Chat />
        </Box>
      </Grid>
    </Box>
  );
};
