import React, { useState } from 'react';
import { Box, Flex, Text, Button, Image, Grid, GridItem, Textarea, VStack } from '@chakra-ui/react';
import { useStore } from '../hooks/useStore';
import { useAuthStore } from '../store';

export const Marketplace: React.FC = () => {
  const { session } = useAuthStore();
  const { items, purchase } = useStore();
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [sendingTTS, setSendingTTS] = useState(false);

  const handlePurchase = async (itemId: string) => {
    if (!session) return;
    setPurchasing(true);
    const result = await purchase(itemId);
    if (result.ok) {
      setMessage({ type: 'success', text: `Purchased! Points remaining: ${result.pointsAfter}` });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Purchase failed' });
      setTimeout(() => setMessage(null), 3000);
    }
    setPurchasing(false);
  };

  const handleTTS = async () => {
    if (!session) return;
    if (!ttsText.trim()) return;
    
    setSendingTTS(true);
    // Mock TTS purchase for now - in reality this would hit an endpoint
    setTimeout(() => {
        setMessage({ type: 'success', text: 'TTS Message Sent!' });
        setTtsText('');
        setSendingTTS(false);
        setTimeout(() => setMessage(null), 3000);
    }, 1000);
  };

  // Only one return, all logic inside the component
  return (
    <Box h="full" display="flex" flexDirection="column" position="relative">
        {message && (
          <Box 
            position="absolute" 
            top={4} 
            left="50%" 
            transform="translateX(-50%)" 
            zIndex={20} 
            p={2} 
            borderRadius="md" 
            fontSize="sm" 
            bg={message.type === 'success' ? 'green.500' : 'red.500'} 
            color="white"
            boxShadow="lg"
          >
            {message.text}
          </Box>
        )}
        
      <Flex h="full" direction={{ base: 'column', lg: 'row' }}>
        {/* LEFT: TTS Section */}
        <Box 
            w={{ base: 'full', lg: '500px' }} 
            p={6} 
            borderRight={{ lg: '1px solid' }} 
            borderBottom={{ base: '1px solid', lg: 'none' }}
            borderColor="whiteAlpha.100" 
            bg="blackAlpha.200"
        >
            <VStack align="stretch" gap={4}>
                <Flex align="center" justify="space-between">
                    <Text fontFamily="Cinzel, serif" fontWeight="bold" color="purple.200" fontSize="2xl">TTS Message</Text>
                </Flex>
                
                <Text fontFamily="Cinzel, serif" fontSize="md" color="gray.400" lineHeight="tall">
                    Send a message that will be read aloud on stream by the AI voice.
                </Text>
                
                <Box position="relative">
                    <Textarea 
                        placeholder="Type your message here..." 
                        value={ttsText}
                        onChange={(e) => setTtsText(e.target.value)}
                        bg="blackAlpha.400"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        fontFamily="Marcellus, serif"
                        _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a78bfa' }}
                        rows={5}
                        resize="none"
                        maxLength={200}
                        color="white"
                        fontSize="md"
                        p={3}
                    />
                    <Text fontFamily="Cinzel, serif" position="absolute" bottom={2} right={2} fontSize="sm" color="gray.500">
                        {ttsText.length}/200
                    </Text>
                </Box>
                
                <Button 
                    colorPalette="purple" 
                    onClick={handleTTS}
                    isLoading={sendingTTS}
                    disabled={!ttsText.trim() || !session}
                    w="full"
                    variant="solid"
                    size="lg"
                    fontFamily="Cinzel, serif"
                >
                    <Image src="/assets/crystal_icon" alt="crystals" boxSize={5} mr={2} />
                    Send TTS - 500
                </Button>
                
                {!session && (
                    <Text fontFamily="Cinzel, serif" fontSize="sm" color="red.300" textAlign="center">
                        Must be signed in to use TTS
                    </Text>
                )}
            </VStack>
        </Box>

        {/* RIGHT: Redeems Grid */}
        <Box flex={1} overflowY="auto" p={6}>
            <Text fontFamily="Cinzel, serif" fontWeight="bold" color="purple.200" fontSize="2xl" mb={4}>Stream Redeems</Text>
            
            {items.length === 0 ? (
                <Flex align="center" justify="center" h="40">
                    <Text color="gray.400" fontStyle="italic">No redeems available</Text>
                </Flex>
            ) : (
                <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
                    {items.map((item) => (
                    <GridItem key={item.id} w="100%">
                        <Flex
                        direction="column"
                        h="full"
                        p={3}
                        borderRadius="lg"
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor="whiteAlpha.100"
                        _hover={{ bg: 'whiteAlpha.100', borderColor: 'purple.400', transform: 'translateY(-2px)' }}
                        transition="all 0.2s"
                        boxShadow="md"
                        position="relative"
                        overflow="hidden"
                        >
                        {/* Glow effect */}
                        <Box position="absolute" top={0} left={0} right={0} h="1px" bgGradient="to-r" gradientFrom="transparent" gradientVia="purple.500/50" gradientTo="transparent" opacity={0.5} />
                        
                        <Box flex={1} minW={0} mb={3}>
                            <Text fontFamily="Cinzel, serif" fontWeight="bold" color="white" fontSize="lg" mb={1} lineHeight="short">{item.name}</Text>
                            {item.description && (
                            <Text fontFamily="Cinzel, serif" fontSize="sm" color="gray.400" noOfLines={2}>{item.description}</Text>
                            )}
                        </Box>
                        
                        <Flex align="center" justify="space-between" mt="auto" pt={2} borderTop="1px solid" borderColor="whiteAlpha.100">
                            <Flex align="center" gap={1.5}>
                            <Text fontFamily="Cinzel, serif" fontWeight="bold" color="purple.300" fontSize="md">{item.cost}</Text>
                            <Image src="/assets/crystal_icon" alt="crystals" boxSize={4} />
                            </Flex>
                            <Button
                            size="sm"
                            colorPalette="purple"
                            variant="subtle"
                            onClick={() => handlePurchase(item.id)}
                            disabled={purchasing}
                            fontSize="sm"
                            fontFamily="Cinzel, serif"
                            >
                            Redeem
                            </Button>
                        </Flex>
                        </Flex>
                    </GridItem>
                    ))}
                </Grid>
            )}
        </Box>
      </Flex>
    </Box>
  );
};
