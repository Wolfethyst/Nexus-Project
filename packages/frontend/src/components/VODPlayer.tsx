
import React from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';

interface VODPlayerProps {
  videoUrl: string;
  title: string;
  date?: string | number;
  provider?: 'youtube' | 'twitch' | 'bunny';
  onClose?: () => void;
}

export const VODPlayer: React.FC<VODPlayerProps> = ({
  videoUrl,
  title,
  date,
  provider = 'youtube',
  onClose
}) => {
  const getEmbedUrl = () => {
    // Extract video ID from URL or use directly if it's just an ID
    const videoId = videoUrl.includes('/') ? videoUrl.split('/').pop()?.split('?')[0] : videoUrl;
    switch (provider) {
      case 'youtube':
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      case 'twitch':
        return `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}&autoplay=true`;
      default:
        return '';
    }
  };

  const formatDate = (dateValue?: string | number) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title, url: shareUrl }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <Box p={0} bg="rgba(40,0,60,0.45)" borderRadius="xl" boxShadow="md" backdropFilter="blur(10px)" border="1px solid rgba(255,150,255,0.20)">
      <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={4} py={3} fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <span>{title}</span>
          {date && <Text fontSize="xs" color="gray.200" mt={1}>{formatDate(date)}</Text>}
        </Box>
        <Flex align="center" gap={3}>
          <Button fontFamily="Cinzel, serif" onClick={handleShare} variant="ghost" colorPalette="purple" size="sm">Share</Button>
          {onClose && (
            <Button fontFamily="Cinzel, serif" onClick={onClose} variant="ghost" colorPalette="purple" size="sm">Close</Button>
          )}
        </Flex>
      </Box>
      <Box bg="blackAlpha.700" borderRadius="lg" overflow="hidden" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          src={getEmbedUrl()}
          style={{ width: '100%', height: '100%' }}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Box>
    </Box>
  );
};
