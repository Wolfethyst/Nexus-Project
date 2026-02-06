import React from 'react';

interface VODPlayerProps {
  videoUrl: string;
  title: string;
  provider?: 'youtube' | 'twitch' | 'bunny';
  onClose?: () => void;
}

export const VODPlayer: React.FC<VODPlayerProps> = ({
  videoUrl,
  title,
  provider = 'youtube',
  onClose
}) => {
  const getEmbedUrl = () => {
    // Extract video ID from URL or use directly if it's just an ID
    const videoId = videoUrl.includes('/') ? videoUrl.split('/').pop()?.split('?')[0] : videoUrl;
    
    switch (provider) {
      case 'youtube':
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      case 'twitch':
        return `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}&autoplay=true`;
      default:
        return '';
    }
  };

  return (
    <div className="panel lg:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted capitalize">{provider} VOD</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted hover:text-primary text-sm"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>
      <div className="bg-black/40 rounded-lg overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          src={getEmbedUrl()}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};
