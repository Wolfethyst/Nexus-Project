import React, { useState } from 'react';
import { useRedeems } from '../hooks/useRedeems';
import { useAuthStore } from '../store';
import { Box, Flex, Text, Button, Grid, GridItem, Textarea, VStack, Input, Image } from '@chakra-ui/react';
import { ApiClient } from '../lib/api';

export const Redeems: React.FC = () => {
  const { redeems, loading, triggerRedeem, triggerTTS } = useRedeems();
  const { session } = useAuthStore();
  const user = session?.user;
  const [ttsMessage, setTtsMessage] = useState('');
    const [ttsStatus, setTtsStatus] = useState<{ok: boolean, msg: string} | null>(null);
    const [sendingTTS, setSendingTTS] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

  const handleTTS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsMessage.trim()) return;
    
    setSendingTTS(true);
    const result = await triggerTTS(ttsMessage);
    if (result.ok) {
      setTtsMessage('');
      setTtsStatus({ ok: true, msg: 'Message sent!' });
      setTimeout(() => setTtsStatus(null), 3000);
    } else {
      setTtsStatus({ ok: false, msg: result.error || 'Failed to send' });
    }
    setSendingTTS(false);
  };

  const filteredRedeems = redeems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <Box p={4} textAlign="center" color="gray.400">Loading redeems...</Box>;

  return (
    <Box h="full" display="flex" flexDirection="column" position="relative">
      <Flex h="full" direction={{ base: 'column', lg: 'row' }} gap={2}>
        {/* LEFT: TTS Section */}
        <Box 
            w={{ base: 'full', lg: '450px' }} 
            bg="var(--panel-bg)"
            borderRadius="2xl" 
            boxShadow="xl" 
            border="1px solid" 
            borderColor="var(--panel-border)" 
            backdropFilter="blur(16px)"
            display="flex"
            flexDirection="column"
            overflow="hidden"
        >
            <Box bgGradient="linear(to-r, rgba(20,5,30,0.9), rgba(40,0,60,0.6))" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={6} h="52px" fontFamily="Cinzel, serif" fontSize="lg" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" alignItems="center" justifyContent="space-between" flexShrink={0}>
                <span>TTS Message</span>
            </Box>

            <Box p={4} overflowY="auto" flex={1}>
            <VStack align="stretch" gap={4}>
                <Box position="relative">
                    <Textarea 
                        placeholder="Type your message here..." 
                        value={ttsMessage}
                        onChange={(e) => setTtsMessage(e.target.value)}
                        bg="blackAlpha.400"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        fontFamily="Marcellus, serif"
                        _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a78bfa' }}
                        rows={3}
                        resize="none"
                        maxLength={150}
                        color="white"
                        fontSize="sm"
                        p={3}
                    />
                    <Text fontFamily="Marcellus, serif" position="absolute" bottom={2} right={2} fontSize="sm" color="gray.500">
                        {ttsMessage.length}/150
                    </Text>
                </Box>
                
                <Button 
                    colorPalette="purple"
                    onClick={handleTTS}
                    loading={sendingTTS}
                    disabled={!user || (!ttsMessage.trim() && !!user) || ((user as any).points || 0) < 250}
                    w="full"
                    variant="solid"
                    size="md"
                    fontFamily="Marcellus, serif"
                >
                    {!user ? "Sign in to use TTS" : (
                        <>
                            Send TTS&nbsp;
                            <Image src={`${ApiClient.baseURL}/assets/crystal_icon`} alt="crystals" boxSize={3} mx={1} display="inline-block" verticalAlign="middle" objectFit="contain" />
                            250
                        </>
                    )}
                </Button>
                {ttsStatus && (
                  <Text textAlign="center" fontSize="sm" color={ttsStatus.ok ? 'green.400' : 'red.400'}>
                    {ttsStatus.msg}
                  </Text>
                )}
            </VStack>
            </Box>
        </Box>

        {/* RIGHT: Redeems Grid */}
        <Box 
            flex={1} 
            display="flex" 
            flexDirection="column" 
            minW={0}
            bg="var(--panel-bg)"
            borderRadius="2xl" 
            boxShadow="xl" 
            border="1px solid" 
            borderColor="var(--panel-border)" 
            backdropFilter="blur(16px)"
            overflow="hidden"
        >
            <Box bgGradient="linear(to-r, rgba(20,5,30,0.9), rgba(40,0,60,0.6))" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={6} h="52px" fontFamily="Cinzel, serif" fontSize="lg" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" alignItems="center" justifyContent="space-between" flexShrink={0}>
                <span>Redeems</span>
                <Input 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="xs"
                    w="150px"
                    bg="blackAlpha.500"
                    borderColor="rgba(197,140,255,0.3)"
                    color="white"
                    _focus={{ borderColor: 'purple.400' }}
                    fontFamily="Marcellus, serif"
                />
            </Box>
            
            <Box flex={1} overflowY="auto" p={4}>
            {filteredRedeems.length === 0 ? (
                <Flex align="center" justify="center" h="40">
                    <Text color="gray.400" fontStyle="italic">{redeems.length === 0 ? "No redeems available" : "No matching redeems"}</Text>
                </Flex>
            ) : (
                <Grid templateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={4}>
                    {filteredRedeems.map((item) => (
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
                        <Box position="absolute" top={0} left={0} right={0} h="1px" bgGradient="linear(to-r, transparent, #a78bfa80, transparent)" opacity={0.5} />
                        
                        <Box flex={1} minW={0} mb={3}>
                            <Text fontFamily="Marcellus, serif" fontWeight="bold" color="white" fontSize="sm" mb={1} lineHeight="short">{item.name}</Text>
                            {item.description && (
                            <Text fontFamily="Marcellus, serif" fontSize="xs" color="gray.400" lineClamp={2}>{item.description}</Text>
                            )}
                        </Box>
                        
                        <Flex align="center" justify="space-between" mt="auto" pt={2} borderTop="1px solid" borderColor="whiteAlpha.100">
                            <Flex align="center" gap={1.5}>
                            <Text fontFamily="Marcellus, serif" fontWeight="bold" color="purple.300" fontSize="sm">{item.cost}</Text>
                            <Image src={`${ApiClient.baseURL}/assets/crystal_icon`} alt="crystals" boxSize={4} objectFit="contain" />
                            </Flex>
                            <Button
                            size="sm"
                            colorPalette="purple"
                            variant="solid"
                            onClick={() => triggerRedeem(item.id)}
                            disabled={!user || ((user as any).points || 0) < item.cost}
                            fontSize="xs"
                            fontFamily="Marcellus, serif"
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
        </Box>
      </Flex>
    </Box>
  );
};
