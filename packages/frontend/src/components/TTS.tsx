import React, { useState, useEffect } from 'react';
import { Box, Flex, Text, Input, Button, Image } from '@chakra-ui/react';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';

export const TTS: React.FC = () => {
  const { session } = useAuthStore();
  const [ttsText, setTtsText] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ttsCost, setTtsCost] = useState<number>(100);

  useEffect(() => {
    (async () => {
      try {
        const res = await ApiClient.get<{ cost: number }>("/tts/cost");
        if (res.ok && typeof res.data?.cost === 'number') {
          setTtsCost(res.data.cost);
        }
      } catch (e) {}
    })();
  }, []);

  const handleSendTTS = async () => {
    if (!ttsText.trim() || !session) return;
    setSending(true);
    try {
      const res = await ApiClient.post<{ ok: boolean; remainingPoints?: number; error?: string }>(
        '/tts/send',
        { message: ttsText }
      );
      if (res.ok && res.data?.ok) {
        setMessage({ type: 'success', text: 'TTS sent!' });
        setTtsText('');
      } else {
        setMessage({ type: 'error', text: res.data?.error || 'TTS failed' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'TTS failed' });
    }
    setSending(false);
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <Box h="full" display="flex" flexDirection="column" position="relative" bg="var(--panel-bg)" borderRadius="2xl" boxShadow="xl" border="1px solid" borderColor="var(--panel-border)" backdropFilter="blur(16px)" minW={0} overflow="hidden">
      {/* Panel Header (matches other panels) */}
      <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={6} h="52px" fontFamily="Cinzel, serif" fontSize="lg" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" alignItems="center" flexShrink={0}>
        <span>TTS</span>
      </Box>
      <Box flex={1} display="flex" flexDirection="column" p={4}>
        {!session ? (
          <Flex align="center" justify="center" h="100%">
            <Text color="gray.400" fontStyle="italic" fontFamily="Marcellus, serif">You must sign in to use TTS</Text>
          </Flex>
        ) : (
          <>
            <Input
              placeholder="Type your TTS message..."
              value={ttsText}
              onChange={e => setTtsText(e.target.value)}
              size="md"
              mb={3}
              bg="blackAlpha.500"
              borderColor="rgba(197,140,255,0.3)"
              color="white"
              fontFamily="Marcellus, serif"
              _focus={{ borderColor: 'purple.400' }}
              disabled={sending}
              as="textarea"
              resize="none"
            />
            <Button
              bgGradient="linear(to-r, purple.500, pink.400)"
              _hover={{ bgGradient: 'linear(to-r, purple.600, pink.500)' }}
              color="white"
              size="md"
              onClick={handleSendTTS}
              loading={sending}
              fontFamily="Marcellus, serif"
              mb={2}
              disabled={sending || !ttsText.trim()}
            >
              <Image src={`${ApiClient.baseURL}/assets/crystal_icon`} alt="crystals" boxSize={5} objectFit="contain" mr={2} />
              Send TTS - {ttsCost}
            </Button>
            {message && (
              <Box
                mt={2}
                borderRadius="md"
                fontSize="sm"
                bg={message.type === 'success' ? 'green.500' : 'red.500'}
                color="white"
                boxShadow="lg"
                p={2}
              >
                {message.text}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
