
import React from 'react';
import { Box, Image, Text } from '@chakra-ui/react';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail?: string;
    createdAt: string | number;
    duration?: string;
  };
  onPlay: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const dateStr = new Date(video.createdAt).toLocaleDateString();

  return (
    <Box
      onClick={() => onPlay(video.id)}
      cursor="pointer"
      rounded="lg"
      overflow="hidden"
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      _hover={{ bg: 'whiteAlpha.100', borderColor: 'purple.400', boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' }}
      transition="all 0.2s"
    >
      <Box position="relative" w="full" aspectRatio={16/9} bg="black" overflow="hidden">
        {video.thumbnail && (
          <Image
            src={video.thumbnail}
            alt={video.title}
            w="full"
            h="full"
            objectFit="cover"
            transition="transform 0.2s"
            _groupHover={{ transform: 'scale(1.05)' }}
          />
        )}
        {video.duration && (
          <Box position="absolute" bottom={2} right={2} bg="blackAlpha.800" px={2} py={1} fontSize="xs" rounded="md">
            {video.duration}
          </Box>
        )}
      </Box>
      <Box p={3}>
        <Text as="h3" fontWeight="semibold" fontSize="sm" lineClamp={2} fontFamily="Cinzel, serif">
          {video.title}
        </Text>
        <Text fontSize="xs" color="gray.400" mt={1}>{dateStr}</Text>
      </Box>
    </Box>
  );
};
