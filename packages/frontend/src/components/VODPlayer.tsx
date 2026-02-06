import React from 'react';

interface VODPlayerProps {
  videoUrl: string;
  title: string;
  date?: string | number;
  provider?: 'youtube' | 'twitch' | 'bunny';
  onClose?: () => void;
}

export const VODPlayer: React.FC<VODPlayerProps> = ({
  videoUrl,
  title,
  date,
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

  const formatDate = (dateValue?: string | number) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title, url: shareUrl }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="panel lg:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {date && <p className="text-xs text-muted mt-1">{formatDate(date)}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="text-muted hover:text-primary text-sm"
          >
            Share
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted hover:text-primary text-sm"
            >
              Close
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
