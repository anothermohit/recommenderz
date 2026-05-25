import React from 'react';

interface AvatarProps {
  username: string;
  photoURL?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({ username, photoURL, size = 32, className = '', style }: AvatarProps) {
  const initial = username ? username[0].toUpperCase() : '?';
  const fontSize = Math.max(size * 0.35, 9);

  if (photoURL) {
    return <img src={photoURL} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', ...style }} className={className} />;
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#efefef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize,
        color: '#8e8e8e',
        flexShrink: 0,
        ...style,
      }}
    >
      {initial}
    </div>
  );
}
