
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';
import { Box, Flex, Text, Avatar as ChakraAvatar, Input, Button, Link as ChakraLink } from '@chakra-ui/react';

interface ChatMessage {
  id: string;
  userId: string;
  user: string;
  text: string;
  platform: string;
  originPlatform: string;
  avatar?: string;
  pronouns?: string;
  decoration?: string;
  messageDecoration?: string;
  color?: string;
  timestamp: number;
}

export const Chat: React.FC = () => {
  const { session } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to chat stream on mount
  useEffect(() => {
    connectToChat();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectToChat = () => {
    try {
      setIsConnecting(true);
      const es = new EventSource(`${ApiClient.baseURL}/chat/stream`);
      es.addEventListener('message', (e: Event) => {
        try {
          const messageEvent = e as MessageEvent;
          const data = JSON.parse(messageEvent.data);
          if (data.type === 'history') {
            setMessages(data.messages || []);
          } else if (data.type === 'chat') {
            setMessages((prev) => [...prev, data.message]);
          }
        } catch (err) {
          console.error('Failed to parse chat message:', err);
        }
      });
      es.addEventListener('error', () => {
        console.error('Chat connection error');
        eventSourceRef.current?.close();
        setIsConnected(false);
        setTimeout(connectToChat, 5000);
      });
      es.addEventListener('open', () => {
        setIsConnecting(false);
        setIsConnected(true);
      });
      eventSourceRef.current = es;
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      setIsConnecting(false);
      setTimeout(connectToChat, 5000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !session?.user) return;
    try {
      const response = await ApiClient.post('/chat/send', {
        text: inputValue,
        user: session.user.display || 'Adventurer',
        platform: 'nexus',
        originPlatform: 'nexus',
        avatar: session.user.avatar,
        userId: session.user.id,
      });
      if (response.ok) {
        setInputValue('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <Box h="full" display="flex" flexDirection="column" bg="rgba(40,0,60,0.45)" borderRadius="xl" boxShadow="md" backdropFilter="blur(10px)" border="1px solid rgba(255,150,255,0.20)">
      <Box bgGradient="to-r" gradientFrom="rgba(20,5,30,0.9)" gradientTo="rgba(40,0,60,0.6)" borderBottom="1px solid" borderColor="rgba(197,140,255,0.65)" px={5} py={4} fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold" color="#e1a6ff" textShadow="0 0 10px rgba(213,123,255,0.3)" textTransform="uppercase" letterSpacing="1px" display="flex" alignItems="center" justifyContent="space-between">
        <span>Live Chat</span>
        <Flex align="center" gap={2}>
          <Box w={2} h={2} borderRadius="full" bg={isConnected ? 'green.500' : isConnecting ? 'yellow.500' : 'red.500'} animation={isConnected || isConnecting ? 'pulse 2s infinite' : undefined} />
          <Text fontFamily="Cinzel, serif" fontSize="xs" color="gray.200">
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Offline'}
          </Text>
        </Flex>
      </Box>
      <Box flex={1} overflowY="auto" display="flex" flexDirection="column" gap={1} p={2}>
        {messages.map((msg) => (
            <Flex
              key={msg.id}
              gap={2}
              p={2}
              borderRadius="md"
              bg="whiteAlpha.50"
              borderLeftWidth={2}
              borderLeftColor="transparent"
              _hover={{ bg: 'whiteAlpha.100' }}
              align="flex-start"
              transition="background 0.2s"
            >
              {msg.avatar && (
                <ChakraAvatar.Root size="md" flexShrink={0}>
                  <ChakraAvatar.Image src={msg.avatar} />
                  <ChakraAvatar.Fallback name={msg.user} />
                </ChakraAvatar.Root>
              )}
              <Box flex={1} minW={0}>
                <Flex align="baseline" gap={2}>
                  <Text fontFamily="Cinzel, serif" fontWeight="bold" fontSize="sm" color={msg.color || 'purple.300'}>{msg.user}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Flex>
                <Text fontSize="sm" color="gray.200" fontFamily="Marcellus, serif" wordBreak="break-word" lineHeight="relaxed">
                  {msg.text}
                </Text>
              </Box>
            </Flex>
          ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box flexShrink={0} p={3} bg="blackAlpha.400" borderTop="1px solid" borderColor="whiteAlpha.100">
        {session?.user ? (
          <form onSubmit={handleSendMessage} style={{ width: '100%' }}>
            <Flex 
              gap={0} 
              mb={2} 
              bg="blackAlpha.700" 
              borderRadius="full" 
              border="1px solid" 
              borderColor="purple.700"
              pl={4}
              _focusWithin={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a78bfa' }}
              transition="all 0.2s"
            >
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Send a message..."
                variant="unstyled"
                color="white"
                _placeholder={{ color: 'gray.400' }}
                fontFamily="Marcellus, serif"
                autoComplete="off"
                flex={1}
              />
              <Button
                type="submit"
                size="md"
                bg="purple.600"
                color="white"
                borderRadius="full"
                _hover={{ bg: 'purple.500' }}
                transition="background 0.2s"
                disabled={!inputValue.trim()}
              >
                ➜
              </Button>
            </Flex>
            <Button
              type="button"
              w="auto"
              variant="plain"
              fontSize="xs"
              fontFamily="Cinzel, serif"
              fontWeight="bold"
              textTransform="uppercase"
              color="purple.400"
              _hover={{ color: 'purple.300' }}
            >
              Tip (Coming Soon)
            </Button>
          </form>
        ) : (
          <Box textAlign="center" py={4}>
            <ChakraLink
              href="https://api.wolfethyst.tv/auth/twitch/login"
              display="inline-block"
              w="full"
              py={2}
              px={4}
              borderRadius="md"
              _hover={{ textDecoration: 'none', bg: 'whiteAlpha.100' }}
            >
              <Text color="purple.300" fontFamily="Cinzel, serif" fontSize="md" fontWeight="bold">
                Sign in to chat
              </Text>
            </ChakraLink>
          </Box>
        )}
      </Box>
    </Box>
  );
};
