import React from 'react';
import "../../App.css";

function UserSelectionModal({ visible, users, onSelect }) {
  if (!visible) return null;

  return (
    <div className="user-modal-overlay">
      <div className="user-modal">
        <h2>Select Your Profile</h2>
        <div className="user-list">
          {users.map(user => (
            <div 
              key={user.id} 
              className="user-card"
              onClick={() => onSelect(user)}
            >
              <div className="user-avatar">{user.avatar || '👤'}</div>
              <div className="user-name">{user.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserSelectionModal;
