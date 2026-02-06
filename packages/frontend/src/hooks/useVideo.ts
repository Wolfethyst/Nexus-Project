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
          ApiClient.get<{ videos: Video[] }>('/streams/list?limit=100'),
          ApiClient.get<{ clips: Clip[] }>('/clips/list'),
        ]);

        if (vodsRes.ok && vodsRes.data?.videos) {
          setVods(vodsRes.data.videos);
        }
        if (clipsRes.ok && clipsRes.data?.clips) {
          setClips(clipsRes.data.clips);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [setVods, setClips, setLoading]);
}

export async function playVideo(_id: string, _type: 'vod' | 'clip') {
  // Implementation will load and play the video
}
