import { create } from 'zustand';
import type { Video, Clip, StreamTitle } from '@nexus/shared';

interface VideoStore {
  vods: Video[];
  clips: Clip[];
  currentVideo: Video | null;
  streamTitle: StreamTitle | null;
  isLoading: boolean;
  
  setVods: (vods: Video[]) => void;
  setClips: (clips: Clip[]) => void;
  setCurrentVideo: (video: Video | null) => void;
  setStreamTitle: (title: StreamTitle | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  vods: [],
  clips: [],
  currentVideo: null,
  streamTitle: null,
  isLoading: false,
  
  setVods: (vods) => set({ vods }),
  setClips: (clips) => set({ clips }),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setStreamTitle: (title) => set({ streamTitle: title }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
