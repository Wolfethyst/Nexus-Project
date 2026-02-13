import React, { useState, useEffect } from 'react';
import { Layout } from '../components';
import { useAuth } from '../hooks';
import { ApiClient } from '../lib/api';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Tabs,
  Grid,
  Input,
  Textarea,
  chakra,
  Checkbox,
} from '@chakra-ui/react';

type Tab = 'overview' | 'store' | 'redeems' | 'tala' | 'chat' | 'users';

interface StoreItem {
  id?: string;
  name: string;
  description?: string;
  cost: number;
  type: 'item' | 'redeem';
  imageKey?: string;
  soundKey?: string;
}

export const OwnerPage: React.FC = () => {
  console.log('OwnerPage rendered');
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ vods: 0, clips: 0, users: 0 });

  // Store Management
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [newStoreItem, setNewStoreItem] = useState<StoreItem>({ name: '', cost: 0, type: 'item' });

  // Redeems Management
  const [redeems, setRedeems] = useState<StoreItem[]>([]);
  const [editingRedeem, setEditingRedeem] = useState<StoreItem | null>(null);
  const [newRedeem, setNewRedeem] = useState<StoreItem>({ name: '', cost: 0, type: 'redeem' });

  // Sound Files
  const [soundFiles, setSoundFiles] = useState<string[]>([]);

  // Tala AI Settings
  const [talaSettings, setTalaSettings] = useState({
    enabled: true,
    personality: 'friendly',
    responseRate: 50,
    learnFromChat: true,
  });

  // Chat Settings
  const [chatSettings, setChatSettings] = useState({
    maxMessageLength: 500,
    slowmodeSeconds: 0,
    emoteOnly: false,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    console.log('isOwner:', isOwner);
    if (!isOwner) return;
    loadStats();
    loadStoreItems();
    loadRedeems();
    loadSoundFiles();
  }, [isOwner]);

  const loadStats = async () => {
    console.log('Loading stats...');
    const res = await ApiClient.get<typeof stats>('/admin/stats');
    console.log('Stats response:', res);
    if (res.ok && res.data) {
      setStats(res.data);
    }
  };

  const loadStoreItems = async () => {
    console.log('Loading store items...');
    const res = await ApiClient.get<{ data: StoreItem[] }>('/store/list');
    console.log('Store items response:', res);
    if (res.ok) setStoreItems(res.data?.data || []);
  };

  const loadRedeems = async () => {
    console.log('Loading redeems...');
    const res = await ApiClient.get<{ redeems: StoreItem[] }>('/store/redeems');
    console.log('Redeems response:', res);
    if (res.ok) setRedeems(res.data?.redeems || []);
  };

  const loadSoundFiles = async () => {
    const res = await ApiClient.get<{ files: string[] }>('/admin/sounds');
    if (res.ok && res.data) {
      setSoundFiles(res.data.files);
    }
  };

  const saveStoreItem = async () => {
    setSaving(true);
    try {
      const res = await ApiClient.post('/store/save', { item: editingStore || newStoreItem });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Store item saved!' });
        setEditingStore(null);
        setNewStoreItem({ name: '', cost: 0, type: 'item' });
        loadStoreItems();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const saveRedeem = async () => {
    setSaving(true);
    try {
      const res = await ApiClient.post('/store/save', { item: editingRedeem || newRedeem });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Redeem saved!' });
        setEditingRedeem(null);
        setNewRedeem({ name: '', cost: 0, type: 'redeem' });
        loadRedeems();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const saveTalaSettings = async () => {
    setSaving(true);
    try {
      // Assuming an endpoint to save these settings
      await ApiClient.post('/admin/settings/tala', talaSettings);
      setMessage({ type: 'success', text: 'Tala settings saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const saveChatSettings = async () => {
    setSaving(true);
    try {
      await ApiClient.post('/admin/settings/chat', chatSettings);
      setMessage({ type: 'success', text: 'Chat settings saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${ApiClient.baseURL}/admin/upload/sound`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Fix: Include cookies for auth
        // Note: Content-Type header is not set manually to let browser set boundary
      });
      const data = await res.json();
      if (data.ok && data.key) {
        editingRedeem ? setEditingRedeem({ ...editingRedeem, soundKey: data.key }) : setNewRedeem({ ...newRedeem, soundKey: data.key });
        loadSoundFiles();
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  if (!isOwner) {
    return (
      <Layout>
        <Flex align="center" justify="center" h="full">
          <Text fontFamily="Cinzel, serif" color="gray.400">Owner access required</Text>
        </Flex>
      </Layout>
    );
  }

  return (
    <Layout showNav={false} showHeader={true}>
      <Box w="full" maxW="6xl" mx="auto" p={4}>
        <Flex align="center" gap={3} mb={6}>
          <Heading fontFamily="Cinzel, serif" as="h1" size="xl" color="white">Owner Dashboard</Heading>
          <Box as="span" px={2} py={1} fontSize="xs" fontWeight="bold" bg="purple.500/20" border="1px solid" borderColor="purple.500" color="purple.200" rounded="md">
            v2.0
          </Box>
        </Flex>

        {message && (
          <Box
            mb={4}
            p={3}
            rounded="md"
            fontSize="sm"
            bg={message.type === 'success' ? 'green.500/20' : 'red.500/20'}
            border="1px solid"
            borderColor={message.type === 'success' ? 'green.500/50' : 'red.500/50'}
            color={message.type === 'success' ? 'green.400' : 'red.400'}
          >
            {message.text}
          </Box>
        )}

        {/* Tab Navigation */}
        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value as Tab)} variant="line" colorPalette="purple">
          <Tabs.List>
            <Tabs.Trigger value="overview" fontFamily="Cinzel, serif">Overview</Tabs.Trigger>
            <Tabs.Trigger value="store" fontFamily="Cinzel, serif">Store</Tabs.Trigger>
            <Tabs.Trigger value="redeems" fontFamily="Cinzel, serif">Redeems</Tabs.Trigger>
            <Tabs.Trigger value="tala" fontFamily="Cinzel, serif">Tala AI</Tabs.Trigger>
            <Tabs.Trigger value="chat" fontFamily="Cinzel, serif">Chat</Tabs.Trigger>
            <Tabs.Trigger value="users" fontFamily="Cinzel, serif">Users</Tabs.Trigger>
          </Tabs.List>
          
            <Tabs.Content value="overview">
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={4} rounded="md">
                  <Text color="gray.400" fontSize="sm">Total VODs</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="white" mt={2}>{stats.vods}</Text>
                </Box>
                <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={4} rounded="md">
                  <Text color="gray.400" fontSize="sm">Total Clips</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="white" mt={2}>{stats.clips}</Text>
                </Box>
                <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={4} rounded="md">
                  <Text color="gray.400" fontSize="sm">Active Users</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="white" mt={2}>{stats.users}</Text>
                </Box>
              </Grid>
            </Tabs.Content>
            <Tabs.Content value="store">
              <Heading as="h2" size="lg" mb={4}>Store Items</Heading>
              <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={4} rounded="md" mb={6}>
                <Heading as="h3" size="md" mb={4}>{editingStore ? 'Edit Item' : 'Create New Item'}</Heading>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Input
                    placeholder="Item Name"
                    value={editingStore?.name || newStoreItem.name}
                    onChange={(e) => editingStore ? setEditingStore({ ...editingStore, name: e.target.value }) : setNewStoreItem({ ...newStoreItem, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Cost (points)"
                    value={editingStore?.cost || newStoreItem.cost}
                    onChange={(e) => editingStore ? setEditingStore({ ...editingStore, cost: Number(e.target.value) }) : setNewStoreItem({ ...newStoreItem, cost: Number(e.target.value) })}
                  />
                  <Textarea
                    gridColumn="span 2"
                    placeholder="Description"
                    value={editingStore?.description || newStoreItem.description || ''}
                    onChange={(e) => editingStore ? setEditingStore({ ...editingStore, description: e.target.value }) : setNewStoreItem({ ...newStoreItem, description: e.target.value })}
                  />
                  <Input
                    gridColumn="span 2"
                    placeholder="Image Key (e.g., item.png)"
                    value={editingStore?.imageKey || newStoreItem.imageKey || ''}
                    onChange={(e) => editingStore ? setEditingStore({ ...editingStore, imageKey: e.target.value }) : setNewStoreItem({ ...newStoreItem, imageKey: e.target.value })}
                  />
                  <Button
                    gridColumn="span 2"
                    onClick={saveStoreItem}
                    loading={saving}
                    colorPalette="purple"
                  >
                    {editingStore ? 'Update Item' : 'Create Item'}
                  </Button>
                </Grid>
              </Box>
              <Flex direction="column" gap={2}>
                {storeItems.map((item) => (
                  <Flex key={item.id} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={3} rounded="md" justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="semibold" color="white">{item.name}</Text>
                      <Text fontSize="sm" color="gray.400">{item.cost} points</Text>
                    </Box>
                    <Button colorPalette="blue" size="sm" onClick={() => setEditingStore(item)}>Edit</Button>
                  </Flex>
                ))}
              </Flex>
            </Tabs.Content>
            <Tabs.Content value="redeems">
              <Heading as="h2" size="lg" mb={4}>Channel Redeems</Heading>
              <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={4} rounded="md" mb={6}>
                <Heading as="h3" size="md" mb={4}>{editingRedeem ? 'Edit Redeem' : 'Create New Redeem'}</Heading>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Input
                    placeholder="Redeem Name"
                    value={editingRedeem?.name || newRedeem.name}
                    onChange={(e) => editingRedeem ? setEditingRedeem({ ...editingRedeem, name: e.target.value }) : setNewRedeem({ ...newRedeem, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Cost (points)"
                    value={editingRedeem?.cost || newRedeem.cost}
                    onChange={(e) => editingRedeem ? setEditingRedeem({ ...editingRedeem, cost: Number(e.target.value) }) : setNewRedeem({ ...newRedeem, cost: Number(e.target.value) })}
                  />
                  <Textarea
                    gridColumn="span 2"
                    placeholder="Description"
                    value={editingRedeem?.description || newRedeem.description || ''}
                    onChange={(e) => editingRedeem ? setEditingRedeem({ ...editingRedeem, description: e.target.value }) : setNewRedeem({ ...newRedeem, description: e.target.value })}
                  />
                  <Box gridColumn="span 2">
                    <Text mb={1} fontSize="sm" color="gray.400">Sound File</Text>
                    <Flex gap={2}>
                      <chakra.select
                        value={editingRedeem?.soundKey || newRedeem.soundKey || ''}
                        onChange={(e) => editingRedeem ? setEditingRedeem({ ...editingRedeem, soundKey: e.target.value }) : setNewRedeem({ ...newRedeem, soundKey: e.target.value })}
                        bg="blackAlpha.400" border="1px solid" borderColor="whiteAlpha.200" p={2} rounded="md" flex={1} color="white"
                      >
                        <option value="" style={{ color: 'black' }}>Select a sound...</option>
                        {soundFiles.map(file => (
                          <option key={file} value={file} style={{ color: 'black' }}>{file.replace(/^sounds\//, '')}</option>
                        ))}
                      </chakra.select>
                      <label style={{ cursor: 'pointer' }}>
                        <Button as="span" colorPalette="blue" pointerEvents="none">Upload</Button>
                        <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                    </Flex>
                  </Box>
                  <Button
                    gridColumn="span 2"
                    onClick={saveRedeem}
                    loading={saving}
                    colorPalette="purple"
                  >
                    {editingRedeem ? 'Update Redeem' : 'Create Redeem'}
                  </Button>
                </Grid>
              </Box>
              <Flex direction="column" gap={2}>
                {redeems.map((redeem) => (
                  <Flex key={redeem.id} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={3} rounded="md" justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="semibold" color="white">{redeem.name}</Text>
                      <Text fontSize="sm" color="gray.400">{redeem.cost} points</Text>
                    </Box>
                    <Button colorPalette="blue" size="sm" onClick={() => setEditingRedeem(redeem)}>Edit</Button>
                  </Flex>
                ))}
              </Flex>
            </Tabs.Content>
            {/* Other TabPanels would go here, converting the remaining sections */}
            <Tabs.Content value="tala">
              <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={6} rounded="md">
                <Heading as="h2" size="lg" mb={4}>Tala - Chat AI Settings</Heading>
                <Flex direction="column" gap={6}>
                  <Checkbox.Root checked={talaSettings.enabled} onCheckedChange={(e) => setTalaSettings({ ...talaSettings, enabled: !!e.checked })}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>Enable Tala AI</Checkbox.Label>
                  </Checkbox.Root>

                  <Box>
                    <Text mb={2} fontWeight="semibold">Personality</Text>
                    <chakra.select 
                      value={talaSettings.personality} 
                      onChange={(e: any) => setTalaSettings({ ...talaSettings, personality: e.target.value })}
                      bg="blackAlpha.400" border="1px solid" borderColor="whiteAlpha.200" p={2} rounded="md" w="full" color="white"
                    >
                      <option value="friendly" style={{ color: 'black' }}>Friendly & Helpful</option>
                      <option value="sarcastic" style={{ color: 'black' }}>Sarcastic & Witty</option>
                      <option value="professional" style={{ color: 'black' }}>Professional</option>
                      <option value="meme" style={{ color: 'black' }}>Meme Lord</option>
                    </chakra.select>
                  </Box>

                  <Box>
                    <Text mb={2} fontWeight="semibold">Response Rate: {talaSettings.responseRate}%</Text>
                    <Input type="number" min={0} max={100} value={talaSettings.responseRate} onChange={(e) => setTalaSettings({ ...talaSettings, responseRate: Number(e.target.value) })} />
                  </Box>

                  <Checkbox.Root checked={talaSettings.learnFromChat} onCheckedChange={(e) => setTalaSettings({ ...talaSettings, learnFromChat: !!e.checked })}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>Learn from chat (improve over time)</Checkbox.Label>
                  </Checkbox.Root>

                  <Button onClick={saveTalaSettings} loading={saving} colorPalette="purple" alignSelf="flex-start">
                    Save Tala Settings
                  </Button>
                </Flex>
              </Box>
            </Tabs.Content>
            <Tabs.Content value="chat">
              <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={6} rounded="md">
                <Heading as="h2" size="lg" mb={4}>Chat Settings</Heading>
                <Flex direction="column" gap={4}>
                  <Box>
                    <Text mb={2} fontWeight="semibold">Max Message Length</Text>
                    <Input type="number" value={chatSettings.maxMessageLength} onChange={(e) => setChatSettings({ ...chatSettings, maxMessageLength: Number(e.target.value) })} />
                  </Box>
                  <Box>
                    <Text mb={2} fontWeight="semibold">Slowmode (seconds)</Text>
                    <Input type="number" value={chatSettings.slowmodeSeconds} onChange={(e) => setChatSettings({ ...chatSettings, slowmodeSeconds: Number(e.target.value) })} />
                  </Box>
                  <Checkbox.Root checked={chatSettings.emoteOnly} onCheckedChange={(e) => setChatSettings({ ...chatSettings, emoteOnly: !!e.checked })}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>Emote Only Mode</Checkbox.Label>
                  </Checkbox.Root>
                  <Button onClick={saveChatSettings} loading={saving} colorPalette="purple" alignSelf="flex-start">
                    Save Chat Settings
                  </Button>
                </Flex>
              </Box>
            </Tabs.Content>
            <Tabs.Content value="users">
              <Box bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" p={6} rounded="md">
                <Heading as="h2" size="lg" mb={4}>User Management</Heading>
                <Text color="gray.400">User moderation tools coming soon.</Text>
              </Box>
            </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Layout>
  );
};
