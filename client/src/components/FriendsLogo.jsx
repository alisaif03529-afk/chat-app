export default function FriendsLogo({ size = 150 }) {
  return (
    <div className="friends-logo" style={{ width: size }}>
      <svg viewBox="0 0 300 190" width="100%" role="img" aria-label="FriendsChat logo">
        <defs>
          <linearGradient id="fcOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffb13b" />
            <stop offset="100%" stopColor="#f2543d" />
          </linearGradient>
          <linearGradient id="fcTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1fb5a6" />
            <stop offset="100%" stopColor="#0d6e7e" />
          </linearGradient>
        </defs>

        {/* Left bubble (girl) */}
        <path
          d="M105 26 A64 64 0 1 0 95 150 L70 172 L72 140 A64 64 0 0 1 105 26 Z"
          fill="url(#fcOrange)"
          stroke="#1e2a4a"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        {/* Right bubble (boy) */}
        <path
          d="M195 26 A64 64 0 1 1 205 150 L230 172 L228 140 A64 64 0 0 0 195 26 Z"
          fill="url(#fcTeal)"
          stroke="#1e2a4a"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Girl face */}
        <path d="M80 80 Q82 40 110 46 Q132 52 128 84 Q126 110 104 112 Q82 110 80 80 Z" fill="#fff" stroke="#1e2a4a" strokeWidth="4" />
        <path d="M80 80 Q78 52 96 46" fill="none" stroke="#1e2a4a" strokeWidth="4" strokeLinecap="round" />
        <path d="M92 84 Q96 88 100 84" fill="none" stroke="#1e2a4a" strokeWidth="3" strokeLinecap="round" />
        <path d="M112 84 Q116 88 120 84" fill="none" stroke="#1e2a4a" strokeWidth="3" strokeLinecap="round" />
        <path d="M96 98 Q106 106 116 98" fill="none" stroke="#1e2a4a" strokeWidth="3" strokeLinecap="round" />

        {/* Boy face */}
        <path d="M180 80 Q180 44 204 44 Q228 44 228 80 Q228 112 204 112 Q180 112 180 80 Z" fill="#fff" stroke="#1e2a4a" strokeWidth="4" />
        <path d="M178 60 Q186 30 210 36 Q226 40 230 56 Q218 46 200 50 Q188 52 178 60 Z" fill="#1e2a4a" />
        <circle cx="196" cy="82" r="3" fill="#1e2a4a" />
        <circle cx="214" cy="82" r="3" fill="#1e2a4a" />
        <path d="M198 98 Q205 104 212 98" fill="none" stroke="#1e2a4a" strokeWidth="3" strokeLinecap="round" />

        {/* Middle dots */}
        <circle cx="146" cy="92" r="4" fill="#fff" />
        <circle cx="154" cy="92" r="4" fill="#fff" />
        <circle cx="162" cy="92" r="4" fill="#fff" />
      </svg>

      <div className="friends-logo-text">
        <span className="fl-friends">Friends</span>
        <span className="fl-chat">Chat</span>
      </div>
    </div>
  );
}