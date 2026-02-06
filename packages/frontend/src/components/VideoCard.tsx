import React from 'react';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail?: string;
    createdAt: string | number;
    duration?: string;
  };
  onPlay: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const dateStr = new Date(video.createdAt).toLocaleDateString();

  return (
    <div
      onClick={() => onPlay(video.id)}
      className="group cursor-pointer rounded-lg overflow-hidden bg-nexus-dark/50 hover:bg-nexus-dark/80 transition-colors"
    >
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-xs rounded">
            {video.duration}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-heading font-semibold line-clamp-2 text-sm">
          {video.title}
        </h3>
        <p className="text-xs text-muted mt-1">{dateStr}</p>
      </div>
    </div>
  );
};
