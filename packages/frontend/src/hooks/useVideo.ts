import { useEffect } from 'react';
import type { Video, Clip } from '@nexus/shared';
import { ApiClient } from '../lib/api';
import { useVideoStore } from '../store';

export function useVideoData() {
  const { setVods, setClips, setLoading } = useVideoStore();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [vodsRes, clipsRes] = await Promise.all([
          ApiClient.get<{ streams: Video[] }>('/streams/list?limit=50'),
          ApiClient.get<{ clips: Clip[] }>('/clips/list'),
        ]);

        if (vodsRes.ok && vodsRes.data) {
          setVods(vodsRes.data.streams);
        }
        if (clipsRes.ok && clipsRes.data) {
          setClips(clipsRes.data.clips);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [setVods, setClips, setLoading]);
}

export async function playVideo(id: string, type: 'vod' | 'clip') {
  const { currentVideo } = useVideoStore.getState();
  // Implementation will load and play the video
}
