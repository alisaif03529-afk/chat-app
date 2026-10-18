function formatLastSeen(date) {
  if (!date) return "Offline";
  const d = new Date(date);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return `Last seen today at ${time}`;
  const day = d.toLocaleDateString([], { day: "2-digit", month: "short" });
  return `Last seen ${day} at ${time}`;
}

function PresenceStatus({ isOnline, lastSeen }) {
  if (isOnline) {
    return (
      <span className="presence online">
        <span className="presence-dot" />
        Online
      </span>
    );
  }
  return <span className="presence offline">{formatLastSeen(lastSeen)}</span>;
}

export default PresenceStatus;