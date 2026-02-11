import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StreamPlayer, VideoCard, VODPlayer, Chat, Leaderboard, Marketplace } from '../components';
import { useVideoStore } from '../store';
import { Tabs } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { useVideoData } from '../hooks/useVideo';
import { ApiClient } from '../lib/api';
import type { Video } from '@nexus/shared';
import { Grid, Box, Flex, Button, Text, Input } from '@chakra-ui/react';

interface StreamInfo {
  title?: string;
  game?: string;
  live?: boolean;
  cover?:string | null;
}

interface HomePageProps {
  activeTab: 'live' | 'vods';
  onTabChange: (tab: 'live' | 'vods') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ activeTab, onTabChange }) => {
  const { isOwner } = useAuth(); // Ensure session and roles are loaded
  useVideoData(); // Load VODs from backend
  const { vods, clips } = useVideoStore();
  const [streamInfo, setStreamInfo] = useState<StreamInfo>({ title: 'Stream Title Loading...', game: 'Loading...', live: false });
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [vodTab, setVodTab] = useState<string>('vods');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Owner editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', game: '' });

  useEffect(() => {
    if (streamInfo) {
      setEditForm({ title: streamInfo.title || '', game: streamInfo.game || '' });
    }
  }, [streamInfo]);

  const fetchStreamInfo = React.useCallback(async () => {
    try {
      const response = await ApiClient.get<StreamInfo>('/stream/info');
      if (response.ok && response.data) {
        setStreamInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stream info:', error);
    }
  }, []);

  const handleSaveStreamInfo = async () => {
    try {
      const res = await ApiClient.post('/stream/title', editForm);
      if (res.ok) {
        setIsEditing(false);
        await fetchStreamInfo(); // Re-fetch to get new cover
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const vodId = searchParams.get('vod');
    if (vodId) {
      const allVideos = [...vods, ...clips];
      const matching = allVideos.find(v => v.videoUrl?.includes(vodId) || v.videoId === vodId || v.id === vodId);
      if (matching) {
        setSelectedVideo(matching);
      }
    }
  }, [searchParams, vods, clips, onTabChange]);

  // Fetch stream info on component mount
  useEffect(() => { fetchStreamInfo(); }, [fetchStreamInfo]);

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setSearchParams({});
  };

  // Get unique games
  const games = React.useMemo(() => {
    const all = [...vods, ...clips];
    const gameSet = new Set<string>();
    all.forEach(v => {
      const name = (v as any).gameName || v.title?.match(/\[(.*?)\]/)?.[1] || 'Other';
      gameSet.add(name);
    });
    return Array.from(gameSet).sort();
  }, [vods, clips]);

  // Filter videos for selected game
  const gameContent = React.useMemo(() => {
    if (!selectedGame && !selectedVideo) return { vods: [], videos: [], clips: [] };
    
    // If a video is selected but no game selected, try to infer game or show all (fallback)
    // For now, we rely on selectedGame being set by user or inferred.
    const targetGame = selectedGame || (selectedVideo as any)?.gameName || selectedVideo?.title?.match(/\[(.*?)\]/)?.[1] || 'Other';
    
    const all = [...vods, ...clips].filter(v => {
      const g = (v as any).gameName || v.title?.match(/\[(.*?)\]/)?.[1] || 'Other';
      return g === targetGame;
    });

    return {
      vods: all.filter(v => v.type === 'vod' || !v.type),
      videos: all.filter(v => v.type === 'video'),
      clips: all.filter(v => v.type === 'clip')
    };
  }, [selectedGame, selectedVideo, vods, clips]);

  // Auto-select game if video is selected from URL
  useEffect(() => {
    if (selectedVideo && !selectedGame) {
      const g = (selectedVideo as any).gameName || selectedVideo.title?.match(/\[(.*?)\]/)?.[1] || 'Other';
      setSelectedGame(g);
    }
  }, [selectedVideo, selectedGame]);

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
        <Flex direction="column" minH={0} h="full" minW="420px" gap={2}>
          {/* Current Session Info */}
          <Box 
            position="relative" 
            py={1.5} pl={3} pr={1.5} 
            bg="rgba(20, 10, 40, 0.4)" 
            borderRadius="2xl" 
            boxShadow="xl" 
            border="1px solid" 
            borderColor="whiteAlpha.100" 
            backdropFilter="blur(8px)"
            minH="220px" 
            display="flex" 
            alignItems="center"
          >
            <Flex gap={4} w="full" align="center">
              {/* Game Cover Art */}
              <Box 
                w="150px"
                h="200px"
                bg="gray.800" 
                borderRadius="md" 
                overflow="hidden" 
                boxShadow="0 4px 10px rgba(0,0,0,0.5)"
                flexShrink={0}
                border="1px solid"
                borderColor="whiteAlpha.200"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {streamInfo.cover ? (
                  <img
                    src={streamInfo.cover}
                    alt={streamInfo.game || 'Game Cover'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Box w="full" h="full" bgGradient="to-br" gradientFrom="purple.900" gradientTo="gray.900" display="flex" alignItems="center" justifyContent="center">
                    <Box fontSize="2xl">🎮</Box>
                  </Box>
                )}
              </Box>

              {/* Info Text */}
              <Box flex={1} minW={0} display="flex" flexDirection="column" justifyContent="center">
                <Flex align="center" justify="space-between" mb={1}>
                  <Box fontFamily="Cinzel, serif" fontSize="xs" color="purple.300" fontWeight="bold" letterSpacing="wider" textTransform="uppercase">
                    Current Session
                  </Box>
                  {isOwner && !isEditing && (
                    <Button 
                      size="xs" 
                      variant="ghost" 
                      colorPalette="purple" 
                      onClick={() => setIsEditing(true)} 
                      h="auto" 
                      minH="auto" 
                      py={0} 
                      fontSize="xs"
                      fontFamily="Cinzel, serif"
                    >
                      Edit
                    </Button>
                  )}
                </Flex>

                {isEditing ? (
                  <Box mb={2}>
                    <Input 
                      value={editForm.title} 
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      placeholder="Stream Title"
                      size="xs"
                      mb={1}
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.300"
                      color="white"
                      fontFamily="Cinzel, serif"
                    />
                    <Input 
                      value={editForm.game} 
                      onChange={(e) => setEditForm({...editForm, game: e.target.value})}
                      placeholder="Game"
                      size="xs"
                      mb={2}
                      bg="whiteAlpha.100"
                      borderColor="whiteAlpha.300"
                      color="white"
                      fontFamily="Cinzel, serif"
                    />
                    <Flex gap={2}>
                      <Button size="xs" colorPalette="green" onClick={handleSaveStreamInfo} fontFamily="Cinzel, serif">Save</Button>
                      <Button size="xs" variant="ghost" onClick={() => setIsEditing(false)} fontFamily="Cinzel, serif">Cancel</Button>
                    </Flex>
                  </Box>
                ) : (
                  <>
                    <Box fontFamily="Cinzel, serif" fontSize="lg" lineHeight="1.2" color="white" mb={1} textShadow="0 2px 8px #3d0066" truncate>
                      {streamInfo.game ?? 'Just Chatting'}
                    </Box>
                    <Text fontFamily="Cinzel, serif" fontSize="xs" color="gray.300" mb={2} lineClamp={2}>
                      {streamInfo.title ?? 'Stream is currently offline'}
                    </Text>
                  </>
                )}
                
                {!isEditing && (
                  <Flex fontSize="sm" fontWeight="bold" align="center" gap={2}>
                    <Box as="span" color={streamInfo.live ? 'red.400' : 'gray.500'} fontSize="md" animation={streamInfo.live ? 'pulse 2s infinite' : undefined}>
                      {streamInfo.live ? '● LIVE' : '● OFFLINE'}
                    </Box>
                  </Flex>
                )}
              </Box>
            </Flex>
          </Box>
          {/* Leaderboard */}
          <Box flex={1} minH={0}>
            <Leaderboard />
          </Box>
        </Flex>
        {/* CENTER COLUMN - Stream/VODs */}
        <Flex direction="column" h="full" minH={0} minW={0} flex={2} overflow="hidden" gap={2}>
          {activeTab === 'live' ? (
            <>
              <Box flexShrink={0} display="flex" flexDirection="column" overflow="hidden" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
                {/* Stream Info Bar */}
                <Flex align="center" justify="space-between" bg="blackAlpha.700" borderBottom="1px solid" borderColor="whiteAlpha.200" px={6} py={3}>
                  <Box fontSize="lg" fontWeight="bold" color="purple.200" fontFamily="Cinzel, serif" textShadow="0 0 10px rgba(213,123,255,0.3)">{streamInfo.title || 'Live Stream'}</Box>
                </Flex>
                {/* Stream Player */}
                <Box w="full" aspectRatio={16/9} bg="black">
                  <StreamPlayer />
                </Box>
              </Box>
              <Box flex={1} minH={0}>
                <Marketplace />
              </Box>
            </>
          ) : selectedVideo && selectedVideo.videoUrl ? (
            <Flex direction="column" h="full" minH={0} overflow="hidden" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
              <Box flexShrink={0}>
              <VODPlayer
                videoUrl={selectedVideo.videoUrl}
                title={selectedVideo.title ?? ''}
                date={selectedVideo.createdAt}
                provider={selectedVideo.platform === 'youtube' ? 'youtube' : selectedVideo.platform === 'twitch' ? 'twitch' : 'youtube'}
                onClose={handleCloseVideo}
              />
              </Box>
              {/* Video List below player */}
              <Box flex={1} minH={0} overflow="hidden" display="flex" flexDirection="column">
                 <Tabs.Root value={vodTab} onValueChange={(e) => setVodTab(e.value)} colorPalette="purple" variant="line" h="full" display="flex" flexDirection="column">
                  <Tabs.List px={4} pt={2} borderBottom="1px solid" borderColor="whiteAlpha.100">
                    <Tabs.Trigger value="vods" fontFamily="Cinzel, serif">VODs</Tabs.Trigger>
                    <Tabs.Trigger value="videos" fontFamily="Cinzel, serif">Videos</Tabs.Trigger>
                    <Tabs.Trigger value="clips" fontFamily="Cinzel, serif">Clips</Tabs.Trigger>
                  </Tabs.List>
                  <Box flex={1} overflowY="auto" p={4}>
                    <Tabs.Content value="vods" p={0}>
                      <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                        {gameContent.vods.map((video: Video) => (
                          <Box key={video.id} onClick={() => setSelectedVideo(video)} cursor="pointer">
                            <VideoCard video={video} onPlay={() => setSelectedVideo(video)} />
                          </Box>
                        ))}
                      </Grid>
                    </Tabs.Content>
                    <Tabs.Content value="videos" p={0}>
                      <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                        {gameContent.videos.map((video: Video) => (
                          <Box key={video.id} onClick={() => setSelectedVideo(video)} cursor="pointer">
                            <VideoCard video={video} onPlay={() => setSelectedVideo(video)} />
                          </Box>
                        ))}
                      </Grid>
                    </Tabs.Content>
                    <Tabs.Content value="clips" p={0}>
                      <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                        {gameContent.clips.map((video: Video) => (
                          <Box key={video.id} onClick={() => setSelectedVideo(video)} cursor="pointer">
                            <VideoCard video={video} onPlay={() => setSelectedVideo(video)} />
                          </Box>
                        ))}
                      </Grid>
                    </Tabs.Content>
                  </Box>
                </Tabs.Root>
              </Box>
            </Flex>
          ) : selectedVideo ? (
            <Box h="full" minH={0} display="flex" alignItems="center" justifyContent="center" overflow="auto" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
              <Box textAlign="center">
                <Box fontFamily="Cinzel, serif" color="gray.400" mb={4}>Video URL not available</Box>
                <Button fontFamily="Cinzel, serif" onClick={handleCloseVideo} colorPalette="purple" variant="outline">Close</Button>
              </Box>
            </Box>
          ) : (
            <Box h="full" minH={0} display="flex" flexDirection="column" overflow="auto" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
              {!selectedGame ? (
                <>
                  <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={4} py={3} fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" justifyContent="space-between" alignItems="center" flexShrink={0}>
                    Game Library
                  </Box>
                  <Box flex={1} overflowY="auto" p={4}>
                    <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={4}>
                      {games.map(game => (
                        <Box 
                          key={game} 
                          onClick={() => setSelectedGame(game)} 
                          cursor="pointer"
                          transition="transform 0.2s"
                          _hover={{ transform: 'scale(1.05)' }}
                        >
                          <Box aspectRatio={3/4} bg="gray.800" borderRadius="lg" mb={2} display="flex" alignItems="center" justifyContent="center" border="1px solid" borderColor="whiteAlpha.200" boxShadow="lg" overflow="hidden">
                             {/* Placeholder for Game Cover - Ideally fetch from IGDB or use a video thumb */}
                             <Box fontSize="4xl">🎮</Box>
                          </Box>
                          <Text fontFamily="Cinzel, serif" fontSize="sm" fontWeight="bold" color="white" textAlign="center" lineClamp={2}>{game}</Text>
                        </Box>
                      ))}
                    </Grid>
                  </Box>
                </>
              ) : (
                <Flex direction="column" h="full">
                  <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={4} py={3} display="flex" alignItems="center" gap={4} flexShrink={0}>
                    <Button onClick={() => setSelectedGame(null)} size="xs" variant="ghost" colorPalette="purple" fontFamily="Cinzel, serif">← Back</Button>
                    <Text fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px">{selectedGame}</Text>
                  </Box>
                  
                  <Tabs.Root value={vodTab} onValueChange={(e) => setVodTab(e.value)} colorPalette="purple" variant="line" h="full" display="flex" flexDirection="column">
                    <Tabs.List px={4} pt={2} borderBottom="1px solid" borderColor="whiteAlpha.100">
                      <Tabs.Trigger value="vods" fontFamily="Cinzel, serif">VODs</Tabs.Trigger>
                      <Tabs.Trigger value="videos" fontFamily="Cinzel, serif">Videos</Tabs.Trigger>
                      <Tabs.Trigger value="clips" fontFamily="Cinzel, serif">Clips</Tabs.Trigger>
                    </Tabs.List>
                    <Box flex={1} overflowY="auto" p={4}>
                      <Tabs.Content value="vods" p={0}>
                        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                          {gameContent.vods.map((video: Video) => (
                            <Box key={video.id} onClick={() => setSelectedVideo(video)} cursor="pointer">
                              <VideoCard video={video} onPlay={() => setSelectedVideo(video)} />
                            </Box>
                          ))}
                        </Grid>
                      </Tabs.Content>
                      <Tabs.Content value="videos" p={0}>
                        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                          {gameContent.videos.map((video: Video) => (
                            <Box key={video.id} onClick={() => setSelectedVideo(video)} cursor="pointer">
                              <VideoCard video={video} onPlay={() => setSelectedVideo(video)} />
                            </Box>
                          ))}
                        </Grid>
                      </Tabs.Content>
                      <Tabs.Content value="clips" p={0}>
                        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={3}>
                          {gameContent.clips.map((video: Video) => (
                            <Box key={video.id} onClick={() => setSelectedVideo(video)} cursor="pointer">
                              <VideoCard video={video} onPlay={() => setSelectedVideo(video)} />
                            </Box>
                          ))}
                        </Grid>
                      </Tabs.Content>
                    </Box>
                  </Tabs.Root>
                </Flex>
              )}
            </Box>
          )}
        </Flex>
        {/* RIGHT COLUMN - Chat */}
        <Box h="full" minH={0} minW="420px" flex={1} overflow="hidden" display="flex" flexDirection="column" bg="rgba(20, 10, 40, 0.4)" borderRadius="2xl" boxShadow="xl" p={0} border="1px solid" borderColor="whiteAlpha.100" backdropFilter="blur(8px)">
          <Chat />
        </Box>
      </Grid>
    </Box>
  );
};
