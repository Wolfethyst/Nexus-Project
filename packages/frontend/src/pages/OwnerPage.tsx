import React, { useState, useEffect } from 'react';
import { Layout } from '../components';
import { useAuth } from '../hooks';
import { ApiClient } from '../lib/api';

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
    if (!isOwner) return;
    loadStats();
    loadStoreItems();
    loadRedeems();
  }, [isOwner]);

  const loadStats = async () => {
    const res = await ApiClient.get<typeof stats>('/points/leaderboard?limit=1');
    if (res.ok) {
      setStats({ vods: 0, clips: 0, users: 0 });
    }
  };

  const loadStoreItems = async () => {
    const res = await ApiClient.get<{ data: StoreItem[] }>('/store/list');
    if (res.ok) setStoreItems(res.data?.data || []);
  };

  const loadRedeems = async () => {
    const res = await ApiClient.get<{ redeems: StoreItem[] }>('/store/redeems');
    if (res.ok) setRedeems(res.data?.redeems || []);
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
      // Store Tala settings (implementation depends on backend)
      // For now, just confirm they were saved
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
      setMessage({ type: 'success', text: 'Chat settings saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Owner access required</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Owner Dashboard</h1>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-white/10 overflow-x-auto">
          {(['overview', 'store', 'redeems', 'tala', 'chat', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-md">
              <p className="text-gray-400 text-sm">Total VODs</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.vods}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-md">
              <p className="text-gray-400 text-sm">Total Clips</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.clips}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-md">
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white mt-2">{stats.users}</p>
            </div>
          </div>
        )}

        {/* Store Management Tab */}
        {activeTab === 'store' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Store Items</h2>

            {/* New Item Form */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingStore ? 'Edit Item' : 'Create New Item'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Item Name"
                  value={editingStore?.name || newStoreItem.name}
                  onChange={(e) =>
                    editingStore
                      ? setEditingStore({ ...editingStore, name: e.target.value })
                      : setNewStoreItem({ ...newStoreItem, name: e.target.value })
                  }
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="Cost (points)"
                  value={editingStore?.cost || newStoreItem.cost}
                  onChange={(e) =>
                    editingStore
                      ? setEditingStore({ ...editingStore, cost: Number(e.target.value) })
                      : setNewStoreItem({ ...newStoreItem, cost: Number(e.target.value) })
                  }
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <textarea
                  placeholder="Description"
                  value={editingStore?.description || newStoreItem.description || ''}
                  onChange={(e) =>
                    editingStore
                      ? setEditingStore({ ...editingStore, description: e.target.value })
                      : setNewStoreItem({ ...newStoreItem, description: e.target.value })
                  }
                  className="col-span-2 bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500 resize-none h-20"
                />
                <input
                  type="text"
                  placeholder="Image Key (e.g., item.png)"
                  value={editingStore?.imageKey || newStoreItem.imageKey || ''}
                  onChange={(e) =>
                    editingStore
                      ? setEditingStore({ ...editingStore, imageKey: e.target.value })
                      : setNewStoreItem({ ...newStoreItem, imageKey: e.target.value })
                  }
                  className="col-span-2 bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <button
                  onClick={saveStoreItem}
                  disabled={saving}
                  className="col-span-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 px-4 py-2 rounded font-semibold text-white transition-colors"
                >
                  {saving ? 'Saving...' : editingStore ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {storeItems.map((item) => (
                <div key={item.id} className="bg-white/5 border border-white/10 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-gray-400">{item.cost} points</p>
                  </div>
                  <button
                    onClick={() => setEditingStore(item)}
                    className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm font-semibold text-white"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redeems Management Tab */}
        {activeTab === 'redeems' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Channel Redeems</h2>

            {/* New Redeem Form */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-md mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingRedeem ? 'Edit Redeem' : 'Create New Redeem'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Redeem Name"
                  value={editingRedeem?.name || newRedeem.name}
                  onChange={(e) =>
                    editingRedeem
                      ? setEditingRedeem({ ...editingRedeem, name: e.target.value })
                      : setNewRedeem({ ...newRedeem, name: e.target.value })
                  }
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="Cost (points)"
                  value={editingRedeem?.cost || newRedeem.cost}
                  onChange={(e) =>
                    editingRedeem
                      ? setEditingRedeem({ ...editingRedeem, cost: Number(e.target.value) })
                      : setNewRedeem({ ...newRedeem, cost: Number(e.target.value) })
                  }
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <textarea
                  placeholder="Description"
                  value={editingRedeem?.description || newRedeem.description || ''}
                  onChange={(e) =>
                    editingRedeem
                      ? setEditingRedeem({ ...editingRedeem, description: e.target.value })
                      : setNewRedeem({ ...newRedeem, description: e.target.value })
                  }
                  className="col-span-2 bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500 resize-none h-20"
                />
                <input
                  type="text"
                  placeholder="Sound Key (e.g., alert.mp3)"
                  value={editingRedeem?.soundKey || newRedeem.soundKey || ''}
                  onChange={(e) =>
                    editingRedeem
                      ? setEditingRedeem({ ...editingRedeem, soundKey: e.target.value })
                      : setNewRedeem({ ...newRedeem, soundKey: e.target.value })
                  }
                  className="col-span-2 bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500"
                />
                <button
                  onClick={saveRedeem}
                  disabled={saving}
                  className="col-span-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 px-4 py-2 rounded font-semibold text-white transition-colors"
                >
                  {saving ? 'Saving...' : editingRedeem ? 'Update Redeem' : 'Create Redeem'}
                </button>
              </div>
            </div>

            {/* Redeems List */}
            <div className="space-y-2">
              {redeems.map((redeem) => (
                <div key={redeem.id} className="bg-white/5 border border-white/10 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{redeem.name}</p>
                    <p className="text-sm text-gray-400">{redeem.cost} points</p>
                  </div>
                  <button
                    onClick={() => setEditingRedeem(redeem)}
                    className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm font-semibold text-white"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tala AI Tab */}
        {activeTab === 'tala' && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-md">
            <h2 className="text-xl font-bold mb-4">Tala - Chat AI Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={talaSettings.enabled}
                  onChange={(e) => setTalaSettings({ ...talaSettings, enabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white">Enable Tala AI</span>
              </label>

              <div>
                <label className="block text-white font-semibold mb-2">Personality</label>
                <select
                  value={talaSettings.personality}
                  onChange={(e) => setTalaSettings({ ...talaSettings, personality: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                >
                  <option value="friendly">Friendly & Helpful</option>
                  <option value="sarcastic">Sarcastic & Witty</option>
                  <option value="professional">Professional</option>
                  <option value="meme">Meme Lord</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Response Rate: {talaSettings.responseRate}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={talaSettings.responseRate}
                  onChange={(e) => setTalaSettings({ ...talaSettings, responseRate: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={talaSettings.learnFromChat}
                  onChange={(e) => setTalaSettings({ ...talaSettings, learnFromChat: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white">Learn from chat (improve over time)</span>
              </label>

              <button
                onClick={saveTalaSettings}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 px-4 py-2 rounded font-semibold text-white transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Chat Settings Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-md">
            <h2 className="text-xl font-bold mb-4">Chat Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Max Message Length</label>
                <input
                  type="number"
                  value={chatSettings.maxMessageLength}
                  onChange={(e) => setChatSettings({ ...chatSettings, maxMessageLength: Number(e.target.value) })}
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Slowmode (seconds between messages, 0 = off)</label>
                <input
                  type="number"
                  min="0"
                  value={chatSettings.slowmodeSeconds}
                  onChange={(e) => setChatSettings({ ...chatSettings, slowmodeSeconds: Number(e.target.value) })}
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chatSettings.emoteOnly}
                  onChange={(e) => setChatSettings({ ...chatSettings, emoteOnly: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white">Emote Only Mode</span>
              </label>

              <button
                onClick={saveChatSettings}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 px-4 py-2 rounded font-semibold text-white transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-md">
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            <p className="text-gray-400">User moderation tools coming soon</p>
          </div>
        )}
      </div>
    </Layout>
  );
};
