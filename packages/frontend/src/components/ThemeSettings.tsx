import React from 'react';
import { Box, Text, SimpleGrid, Button, VStack } from '@chakra-ui/react';
import { useThemeStore, ThemeName, ColorStyle } from '../store/useThemeStore';

export const ThemeSettings: React.FC = () => {
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
    <VStack align="stretch" gap={6}>
        <Box>
            <Text fontFamily="Cinzel, serif" fontWeight="bold" mb={3} color="purple.200">Base Theme</Text>
            <SimpleGrid columns={2} gap={3}>
                {themes.map((t) => (
                <Button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    variant={theme === t.name ? 'solid' : 'outline'}
                    colorPalette="purple"
                    fontFamily="Marcellus, serif"
                    justifyContent="flex-start"
                    bg={theme === t.name ? 'purple.500' : 'transparent'}
                    borderColor={theme === t.name ? 'transparent' : 'whiteAlpha.300'}
                    _hover={{ bg: theme === t.name ? 'purple.600' : 'whiteAlpha.100' }}
                >
                    {t.label}
                </Button>
                ))}
            </SimpleGrid>
        </Box>

        <Box>
            <Text fontFamily="Cinzel, serif" fontWeight="bold" mb={3} color="purple.200">Accent Color</Text>
            <SimpleGrid columns={4} gap={3}>
                {colors.map(c => (
                    <Button 
                        key={c.name}
                        h="3rem"
                        bg={c.hex}
                        onClick={() => setColorStyle(c.name)}
                        border={colorStyle === c.name ? '2px solid white' : '2px solid transparent'}
                        _hover={{ transform: 'scale(1.05)'}}
                        rounded="xl"
                        boxShadow={colorStyle === c.name ? `0 0 15px ${c.hex}` : 'none'}
                    />
                ))}
            </SimpleGrid>
        </Box>
    </VStack>
  );
};