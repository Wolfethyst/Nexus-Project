import React from 'react';
import { Box, Flex, Menu, IconButton, Avatar, Text, SimpleGrid, Button, Modal, useDisclosure } from '@chakra-ui/react';
import { useAuthStore } from '../store';
import { useThemeStore, ThemeName, ColorStyle } from '../store/useThemeStore';
import { ProfileSettings } from './ProfileSettings';

interface ProfileMenuProps {
  onLogout?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onLogout }) => {
  const { session } = useAuthStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    <>
      <Menu.Root>
        <Menu.Trigger>
          <IconButton
            variant="ghost"
            aria-label="Options"
            transition="all 0.2s"
            borderRadius="full"
            _focus={{ boxShadow: '0 0 0 2px #a78bfa' }}
          >
            <Avatar.Root size="lg">
              <Avatar.Image src={session?.user?.avatar} />
              <Avatar.Fallback name={session?.user?.displayName} />
            </Avatar.Root>
          </IconButton>
        </Menu.Trigger>
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
        <Menu.Item value="settings" fontFamily="Marcellus, serif" onClick={onOpen}>
          Profile Settings
        </Menu.Item>
        <Menu.Separator />
        <Box px={1} py={1.5}>
            <Text px={2} fontSize="sm" fontWeight="semibold" color="gray.400" fontFamily="Cinzel, serif">Theme</Text>
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
        </Box>
        <Menu.Separator />
        <Box px={1} py={1.5}>
            <Text px={2} fontSize="sm" fontWeight="semibold" color="gray.400" fontFamily="Cinzel, serif">Accent Color</Text>
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
        </Box>
        <Menu.Separator />
        <Menu.Item value="logout" onClick={onLogout} fontFamily="Marcellus, serif">
          Logout
        </Menu.Item>
        </Menu.Content>
      </Menu.Root>

      <Modal.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} isCentered>
        <Modal.Overlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
        <Modal.Content bg="var(--panel-bg)" border="1px solid" borderColor="var(--panel-border)" borderRadius="2xl">
          <Modal.Header fontFamily="Cinzel, serif" color="purple.200">Profile Settings</Modal.Header>
          <Modal.CloseTrigger asChild>
            <IconButton aria-label="Close" variant="ghost" size="sm" position="absolute" top={2} right={2} />
          </Modal.CloseTrigger>
          <Modal.Body pb={6}>
            <ProfileSettings />
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default ProfileMenu;