import React from 'react';

const IconBase = ({ size = 20, color = 'currentColor', children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const IconMic = (props) => (
  <IconBase {...props}>
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </IconBase>
);

export const IconMicOff = (props) => (
  <IconBase {...props}>
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-5.2 2" />
    <path d="M19 10v2a7 7 0 0 1-10 6.3" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </IconBase>
);

export const IconCamera = (props) => (
  <IconBase {...props}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="16" height="14" rx="2" ry="2" />
  </IconBase>
);

export const IconCameraOff = (props) => (
  <IconBase {...props}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="16" height="14" rx="2" ry="2" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </IconBase>
);

export const IconMessageCircle = (props) => (
  <IconBase {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </IconBase>
);

export const IconUsers = (props) => (
  <IconBase {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <circle cx="9" cy="7" r="4" />
  </IconBase>
);

export const IconPhoneOff = (props) => (
  <IconBase {...props}>
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-3.27" />
    <path d="M6.39 6.39A19.79 19.79 0 0 1 2 4.14 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </IconBase>
);

export const IconPlay = (props) => (
  <IconBase {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </IconBase>
);

export const IconPause = (props) => (
  <IconBase {...props}>
    <rect x="4" y="4" width="4" height="16" />
    <rect x="16" y="4" width="4" height="16" />
  </IconBase>
);

export const IconVolume2 = (props) => (
  <IconBase {...props}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </IconBase>
);

export const IconVolumeX = (props) => (
  <IconBase {...props}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </IconBase>
);

export const IconMaximize = (props) => (
  <IconBase {...props}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </IconBase>
);

export const IconMinimize = (props) => (
  <IconBase {...props}>
    <path d="M4 14h6v6" />
    <path d="M20 10h-6V4" />
    <path d="M14 10l7-7" />
    <path d="M10 14l-7 7" />
  </IconBase>
);

export const IconSettings = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .64.38 1.23 1 1.51.3.13.63.2.96.2H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </IconBase>
);

export const IconCopy = (props) => (
  <IconBase {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </IconBase>
);

export const IconCheck = (props) => (
  <IconBase {...props}>
    <path d="M20 6L9 17l-5-5" />
  </IconBase>
);

export const IconX = (props) => (
  <IconBase {...props}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </IconBase>
);

export const IconCrown = (props) => (
  <IconBase {...props}>
    <path d="M2 20h20" />
    <path d="M5 20V10l7-7 7 7v10" />
  </IconBase>
);

export const IconWifi = (props) => (
  <IconBase {...props}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M8.5 16a6 6 0 0 1 7 0" />
    <line x1="12" y1="20" x2="12" y2="20" />
  </IconBase>
);

export const IconUpload = (props) => (
  <IconBase {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </IconBase>
);

export const IconFilm = (props) => (
  <IconBase {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <line x1="7" y1="4" x2="7" y2="20" />
    <line x1="17" y1="4" x2="17" y2="20" />
    <line x1="2" y1="8" x2="7" y2="8" />
    <line x1="2" y1="16" x2="7" y2="16" />
    <line x1="17" y1="8" x2="22" y2="8" />
    <line x1="17" y1="16" x2="22" y2="16" />
  </IconBase>
);

export const IconSend = (props) => (
  <IconBase {...props}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </IconBase>
);

export const IconSkipBack10 = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 7H5v3" />
    <path d="M5 10a7 7 0 1 0 2.05-4.95" />
    <text x="12" y="14" textAnchor="middle" fontSize="8" fill={props.color || 'currentColor'} stroke="none">10</text>
  </IconBase>
);

export const IconSkipForward10 = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M16 7h3v3" />
    <path d="M19 10a7 7 0 1 1-2.05-4.95" />
    <text x="12" y="14" textAnchor="middle" fontSize="8" fill={props.color || 'currentColor'} stroke="none">10</text>
  </IconBase>
);
