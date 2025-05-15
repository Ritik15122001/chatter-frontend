// components/UserSelectionModal.jsx
import React from 'react';
import "../../App.css";

function UserSelectionModal({ visible, users, onSelect }) {
  if (!visible) return null;

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <h2>Who are you?</h2>
        <div className="user-list">
          {users.map(user => (
            <div 
              key={user.id} 
              className="user-option"
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
