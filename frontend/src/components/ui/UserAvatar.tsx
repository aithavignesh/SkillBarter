import React, { useState } from 'react';

interface UserAvatarProps {
  name: string;
  src?: string | null;
  className: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, className }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'SB';
  const showImage = Boolean(src) && src !== failedUrl;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef1f5] font-semibold text-[#17233b] ${className}`}
    >
      {showImage ? (
        <img
          key={src}
          src={src!}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-200"
          onError={() => setFailedUrl(src || null)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
};
