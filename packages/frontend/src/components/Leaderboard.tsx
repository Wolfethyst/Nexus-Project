import React, { useEffect, useState } from 'react';
import { ApiClient } from '../lib/api';
import { Box, Flex, Text, Avatar, Spinner, Image } from '@chakra-ui/react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  profile_image?: string;
  points: number;
  rank: number;
}

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get<{ leaderboard: LeaderboardEntry[] }>('/points/leaderboard?limit=50');
      if (response.ok && response.data?.leaderboard) {
        setEntries(response.data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper for rank colors in v3
  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1: return { bg: 'yellow.500/10', border: 'yellow.400', color: 'yellow.400' };
      case 2: return { bg: 'gray.300/10', border: 'gray.300', color: 'gray.300' };
      case 3: return { bg: 'orange.600/10', border: 'orange.600', color: 'orange.600' };
      default: return { bg: 'white/5', border: 'white/10', color: 'purple.400' };
    }
  };

  return (
    <Box 
      h="full" 
      display="flex" 
      flexDirection="column" 
      bg="rgba(40,0,60,0.45)" 
      borderRadius="xl" 
      boxShadow="md" 
      backdropFilter="blur(10px)" 
      border="1px solid" 
      borderColor="rgba(255,150,255,0.20)"
    >
      {/* HEADER SECTION */}
      <Box 
        bgGradient="to-r" 
        gradientFrom="rgba(20,5,30,0.9)" 
        gradientTo="rgba(40,0,60,0.6)" 
        borderBottom="1px solid" 
        borderColor="rgba(197,140,255,0.65)" 
        px={5} py={4} 
        fontFamily="Cinzel, serif" 
        fontSize="md" 
        fontWeight="bold" 
        color="#e1a6ff" 
        textShadow="0 0 10px rgba(213,123,255,0.3)" 
        textTransform="uppercase" 
        letterSpacing="1px"
      >
        Crystals Leaderboard
      </Box>

      {/* CONTENT SECTION */}
      <Box flex={1} overflowY="auto" display="flex" flexDirection="column" gap={2} p={2}>
        {loading ? (
          <Flex flex={1} align="center" justify="center" direction="column" gap={3}>
            <Spinner colorPalette="purple" size="lg" />
            <Text fontFamily="Cinzel, serif" color="gray.400" fontSize="sm">Loading High Scores...</Text>
          </Flex>
        ) : entries.length === 0 ? (
          <Flex align="center" justify="center" h="full">
            <Text color="gray.400" fontStyle="italic">No leaderboard data</Text>
          </Flex>
        ) : (
          entries.map((entry) => {
            const styles = getRankStyles(entry.rank);
            return (
              <Flex
                key={entry.user_id}
                align="center"
                justify="space-between"
                p={2}
                borderRadius="md"
                bg={styles.bg}
                borderLeft="4px solid"
                borderLeftColor={styles.border}
                transition="all 0.2s"
                _hover={{ bg: 'white/10' }}
              >
                <Flex align="center" gap={3} flex={1} minW={0}>
                  <Text fontFamily="Cinzel, serif" fontSize="sm" fontWeight="bold" w={6} textAlign="center" color={styles.color}>
                    #{entry.rank}
                  </Text>
                  
                  {/* v3 Avatar Pattern */}
                  <Avatar.Root size="md">
                    <Avatar.Image src={entry.profile_image} alt={entry.username} />
                    <Avatar.Fallback name={entry.username} />
                  </Avatar.Root>

                  <Box flex={1} minW={0}>
                    <Text fontFamily="Cinzel, serif" fontWeight="semibold" color="white" fontSize="sm" truncate>
                      {entry.username}
                    </Text>
                  </Box>
                </Flex>

                <Flex align="center" gap={1.5}>
                  <Text fontFamily="Cinzel, serif" fontSize="sm" fontWeight="bold" color="purple.300">
                    {entry.points.toLocaleString()}
                  </Text>
                  <Image src={`${ApiClient.baseURL}/assets/crystal_icon`} alt="crystals" boxSize="20px" />
                </Flex>
              </Flex>
            );
          })
        )}
      </Box>
    </Box>
  );
};