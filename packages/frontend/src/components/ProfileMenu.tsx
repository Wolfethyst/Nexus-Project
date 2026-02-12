import React from 'react';
import { Box, Flex, Menu, IconButton, Avatar, Text, SimpleGrid, Button } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useThemeStore, ThemeName, ColorStyle } from '../store/useThemeStore';

interface ProfileMenuProps {
  onLogout?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onLogout }) => {
  const { session } = useAuthStore();
  const { theme, colorStyle, setTheme, setColorStyle } = useThemeStore();

  const themes: { name: ThemeName; label: string }[] = [
    { name: 'default', label: 'Default' },
    { name: 'light', label: 'Light' },
    { name: 'dark', label: 'Dark' },
    { name: 'oled', label: 'OLED' },
  ];

  const colors: { name: ColorStyle; hex: string }[] = [
      { name: 'purple', hex: '#a78bfa' },
      { name: 'blue', hex: '#60a5fa' },
      { name: 'green', hex: '#4ade80' },
      { name: 'red', hex: '#f87171' },
  ];

  return (
    <Menu.Root>
      <Menu.Trigger
        as={IconButton}
        aria-label="Options"
        icon={
          <Avatar.Root size="md">
            <Avatar.Image src={session?.user?.avatar} />
            <Avatar.Fallback name={session?.user?.displayName} />
          </Avatar.Root>
        }
        transition="all 0.2s"
        borderRadius="full"
        _focus={{ boxShadow: '0 0 0 2px #a78bfa' }}
      />
      <Menu.Content bg="var(--panel-bg)" borderColor="var(--panel-border)" zIndex={100} backdropFilter="blur(16px)">
        <Menu.Item value="profile-info">
          <Flex align="center" gap={3}>
            <Avatar.Root size="sm">
              <Avatar.Image src={session?.user?.avatar} />
              <Avatar.Fallback name={session?.user?.displayName} />
            </Avatar.Root>
            <Box>
              <Text fontWeight="bold" fontFamily="Marcellus, serif">{session?.user?.displayName}</Text>
              {/* Display point balance once implemented */}
              {/* <Text fontSize="sm" color="gray.500">12,345 points</Text> */}
            </Box>
          </Flex>
        </Menu.Item>
        <Menu.Separator />
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <Menu.Item value="settings" fontFamily="Marcellus, serif">
            Profile Settings
          </Menu.Item>
        </Link>
        <Menu.Separator />
        <Menu.Group title="Theme" fontFamily="Cinzel, serif" color="gray.400">
            {themes.map((t) => (
              <Menu.Item
                key={t.name}
                value={t.name}
                onClick={() => setTheme(t.name)}
                bg={theme === t.name ? 'purple.500/20' : 'transparent'}
              >
                <Text fontFamily="Marcellus, serif">{t.label}</Text>
              </Menu.Item>
            ))}
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group title="Accent Color" fontFamily="Cinzel, serif" color="gray.400">
            <SimpleGrid columns={4} gap={2} p={2}>
                {colors.map(c => (
                    <Button 
                        key={c.name}
                        h="2rem"
                        bg={c.hex}
                        onClick={() => setColorStyle(c.name)}
                        border={colorStyle === c.name ? '2px solid white' : '2px solid transparent'}
                        _hover={{ transform: 'scale(1.1)'}}
                    />
                ))}
            </SimpleGrid>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item value="logout" onClick={onLogout} fontFamily="Marcellus, serif">
          Logout
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};

export default ProfileMenu;