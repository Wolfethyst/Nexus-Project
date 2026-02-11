import React from 'react';
import { Center, VStack, Heading, Text, Spinner } from '@chakra-ui/react';

export const NotFoundPage: React.FC = () => (
  <Center h="full">
    <VStack gap={4}>
      <Spinner size="xl" color="red.500" />
      <Heading color="red.400" fontFamily="Cinzel, serif">404 - Not Found</Heading>
      <Text color="gray.400">The page you requested does not exist.</Text>
    </VStack>
  </Center>
);