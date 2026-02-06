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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-nexus-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-heading text-3xl font-bold mb-6">Profile Settings</h2>
      
      <form onSubmit={handleSubmit} className="panel space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            maxLength={25}
            className="w-full px-4 py-2 bg-nexus-dark border border-gray-700 rounded-lg focus:border-nexus-accent focus:outline-none"
            placeholder={session?.user?.username || 'Your display name'}
          />
          <p className="text-xs text-text-muted mt-1">{profile.displayName.length}/25 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Name Color</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={profile.nameColor}
              onChange={(e) => setProfile({ ...profile, nameColor: e.target.value })}
              className="h-10 w-20 rounded cursor-pointer"
            />
            <input
              type="text"
              value={profile.nameColor}
              onChange={(e) => setProfile({ ...profile, nameColor: e.target.value })}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 px-4 py-2 bg-nexus-dark border border-gray-700 rounded-lg focus:border-nexus-accent focus:outline-none font-mono"
              placeholder="#ffffff"
            />
          </div>
          <p className="text-xs text-text-muted mt-1">This color will appear in chat next to your name</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Pronouns</label>
          <input
            type="text"
            value={profile.pronouns}
            onChange={(e) => setProfile({ ...profile, pronouns: e.target.value })}
            maxLength={15}
            className="w-full px-4 py-2 bg-nexus-dark border border-gray-700 rounded-lg focus:border-nexus-accent focus:outline-none"
            placeholder="they/them"
          />
          <p className="text-xs text-text-muted mt-1">{profile.pronouns.length}/15 characters</p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-nexus-accent hover:bg-nexus-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};
