import React, { useState } from 'react';
import { Box, Flex, Text, Button, Image, Grid, GridItem, Input } from '@chakra-ui/react';
import { useRedeems } from '../hooks';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';

export const Redeems: React.FC = () => {
  const { session } = useAuthStore();
  const { items, purchase } = useRedeems();
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
        
      {/* Redeems Grid */}
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
            {/* Redeems Header */}
            <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={6} h="52px" fontFamily="Cinzel, serif" fontSize="lg" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" alignItems="center" justifyContent="space-between" flexShrink={0}>
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
            {filteredItems.length === 0 ? (
                <Flex align="center" justify="center" h="40">
                    <Text color="gray.400" fontStyle="italic">{items.length === 0 ? "No items available" : "No matching items"}</Text>
                </Flex>
            ) : (
                <Grid templateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={4}>
                    {filteredItems.map((item) => (
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
                            variant="subtle"
                            onClick={() => handlePurchase(item.id)}
                            disabled={purchasing}
                            fontSize="xs"
                            fontFamily="Marcellus, serif"
                            >
                            Buy
                            </Button>
                        </Flex>
                        </Flex>
                    </GridItem>
                    ))}
                </Grid>
            )}
            </Box>
        </Box>
    </Box>
  );
};
