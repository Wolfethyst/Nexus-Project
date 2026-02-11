import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../store';

interface ProfileData {
  displayName: string;
  nameColor: string;
  pronouns: string;
}

export const ProfilePage: React.FC = () => {
  const { session } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    nameColor: '#ffffff',
    pronouns: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await ApiClient.get<ProfileData>('/nexus/profile');
        if (response.ok && response.data) {
          setProfile(response.data);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await ApiClient.post<ProfileData>('/nexus/profile', profile);
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" h="full">
        <Spinner size="xl" color="purple.500" />
      </Flex>
    );
  }

  return (
    <Box h="full" overflowY="auto" p={4}>
      <Box maxW="2xl" mx="auto" mt={8}>
        <Heading as="h2" size="lg" mb={8} fontFamily="Cinzel, serif" color="purple.100" textAlign="center" textShadow="0 0 10px rgba(168,85,247,0.5)">
          Profile Settings
        </Heading>
        
        <Box 
          as="form" 
          onSubmit={handleSubmit} 
          bg="rgba(30, 10, 60, 0.5)" 
          backdropFilter="blur(16px)"
          border="1px solid"
          borderColor="whiteAlpha.200"
          p={8} 
          borderRadius="2xl" 
          boxShadow="xl" 
          display="flex" 
          flexDirection="column" 
          gap={6}
        >
        <Box>
          <Text fontFamily="Cinzel, serif" fontWeight="bold" mb={2} color="purple.200">Display Name</Text>
          <Input
            type="text"
            value={profile.displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, displayName: e.target.value })}
            maxLength={25}
            placeholder={session?.user?.username || 'Your display name'}
            bg="blackAlpha.400"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #9f7aea' }}
            color="white"
          />
          <Text fontSize="xs" color="gray.400" mt={1}>{profile.displayName.length}/25 characters</Text>
        </Box>
        <Box>
          <Text fontFamily="Cinzel, serif" fontWeight="bold" mb={2} color="purple.200">Name Color</Text>
          <Flex align="center" gap={4}>
            <Input
              type="color"
              value={profile.nameColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, nameColor: e.target.value })}
              w="20"
              h="10"
              p={0}
              borderRadius="md"
              cursor="pointer"
              bg="transparent"
              border="none"
            />
            <Input
              type="text"
              value={profile.nameColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, nameColor: e.target.value })}
              pattern="^#[0-9A-Fa-f]{6}$"
              fontFamily="mono"
              placeholder="#ffffff"
              bg="blackAlpha.400"
              border="1px solid"
              borderColor="whiteAlpha.200"
              color="white"
            />
          </Flex>
          <Text fontSize="xs" color="gray.400" mt={1}>This color will appear in chat next to your name</Text>
        </Box>
        <Box>
          <Text fontFamily="Cinzel, serif" fontWeight="bold" mb={2} color="purple.200">Pronouns</Text>
          <Input
            type="text"
            value={profile.pronouns}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, pronouns: e.target.value })}
            maxLength={15}
            placeholder="they/them"
            bg="blackAlpha.400"
            border="1px solid"
            borderColor="whiteAlpha.200"
            color="white"
          />
          <Text fontSize="xs" color="gray.400" mt={1}>{profile.pronouns.length}/15 characters</Text>
        </Box>
        {message && (
          <Box borderRadius="md" p={3} bg={message.type === 'success' ? 'green.500/20' : 'red.500/20'} border="1px solid" borderColor={message.type === 'success' ? 'green.500/50' : 'red.500/50'}>
            <Text color={message.type === 'success' ? 'green.300' : 'red.300'}>{message.text}</Text>
          </Box>
        )}
        <Button
          type="submit"
          isLoading={saving}
          colorPalette="purple"
          variant="solid"
          w="full"
          fontFamily="Cinzel, serif"
          size="md"
          boxShadow="0 0 15px rgba(128, 90, 213, 0.4)"
          _hover={{ bg: 'purple.400', boxShadow: '0 0 20px rgba(128, 90, 213, 0.6)' }}
        >
          Save Profile
        </Button>
      </Box>
      </Box>
    </Box>
  );
};
