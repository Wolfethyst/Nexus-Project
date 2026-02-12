import React from 'react';
import { Box, Flex, Menu, IconButton, Avatar, Text, Dialog, useDisclosure, Portal } from '@chakra-ui/react';
import { useAuthStore } from '../store';
import { ProfileSettings } from './ProfileSettings';
import { ThemeSettings } from './ThemeSettings';

interface ProfileMenuProps {
  onLogout?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onLogout }) => {
  const { session } = useAuthStore();
  const profileDisclosure = useDisclosure();
  const themeDisclosure = useDisclosure();

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
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
        <Portal> {/* Portal renders content directly into document.body */}
          <Menu.Content bg="var(--panel-bg)" borderColor="var(--panel-border)" zIndex={9999} backdropFilter="blur(16px)" color="white" position="fixed">
          <Menu.Item value="profile-info" closeOnSelect={false}>
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
          
          <Menu.Item value="themes" fontFamily="Marcellus, serif" onClick={themeDisclosure.onOpen}>
              Themes
          </Menu.Item>

          <Menu.Item value="customization" fontFamily="Marcellus, serif" onClick={profileDisclosure.onOpen}>
              Customization
          </Menu.Item>

          <Menu.Separator />
          <Menu.Item value="logout" onClick={onLogout} fontFamily="Marcellus, serif">
            Logout
          </Menu.Item>
          </Menu.Content>
        </Portal>
      </Menu.Root>

      {/* Customization Modal */}
      <Dialog.Root open={profileDisclosure.open} onOpenChange={(details) => !details.open && profileDisclosure.onClose()}>
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(10px)" />
        <Dialog.Positioner>
          <Dialog.Content bg="var(--panel-bg)" border="1px solid" borderColor="var(--panel-border)" borderRadius="2xl">
            <Dialog.Header fontFamily="Cinzel, serif" color="purple.200">Customization</Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <IconButton aria-label="Close" variant="ghost" size="sm" position="absolute" top={2} right={2} />
            </Dialog.CloseTrigger>
            <Dialog.Body pb={6}>
              <ProfileSettings />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Theme Modal */}
      <Dialog.Root open={themeDisclosure.open} onOpenChange={(details) => !details.open && themeDisclosure.onClose()}>
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(10px)" />
        <Dialog.Positioner>
          <Dialog.Content bg="var(--panel-bg)" border="1px solid" borderColor="var(--panel-border)" borderRadius="2xl">
            <Dialog.Header fontFamily="Cinzel, serif" color="purple.200">Theme Settings</Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <IconButton aria-label="Close" variant="ghost" size="sm" position="absolute" top={2} right={2} />
            </Dialog.CloseTrigger>
            <Dialog.Body pb={6}>
              <ThemeSettings />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
};

export default ProfileMenu;