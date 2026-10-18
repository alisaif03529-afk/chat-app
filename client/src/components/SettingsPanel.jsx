function SettingsPanel({ onClose, onLogout, onEditProfile, onClearChat }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <button className="settings-btn" onClick={onEditProfile}>
          Edit Profile
        </button>

        <button className="settings-btn danger" onClick={onClearChat}>
          Delete Chat
        </button>

        <button className="settings-btn logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;