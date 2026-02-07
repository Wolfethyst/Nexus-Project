import { useCallback, useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';

export interface User {
  user_id: string;
  username: string;
  profile_image?: string;
  points: number;
  rank: number;
}

export interface PointEvent {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  source: string;
  created_at: number;
}

export function useLeaderboard(limit: number = 50) {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ leaderboard: User[] }>(`/points/leaderboard?limit=${limit}&offset=${offset}`);
      setLeaderboard(response.data?.leaderboard || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, error, fetchLeaderboard };
}

export function useUserProfile(userId?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ user: User }>(`/points/user/${userId}`);
      setUser(response.data?.user || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  return { user, loading, error, fetchUser };
}

export function useMyProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ user: User }>('/points/me');
      setUser(response.data?.user || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  return { user, loading, error, fetchMyProfile };
}

export function usePointEvents(limit: number = 50) {
  const [events, setEvents] = useState<PointEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ events: PointEvent[] }>(`/points/events?limit=${limit}&offset=${offset}`);
      setEvents(response.data?.events || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch point events');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, fetchEvents };
}
