// components/VerificationModal.jsx
import React from 'react';
import "../../App.css";

function VerificationModal({
  visible,
  selectedUser,
  verificationCode,
  onCodeChange,
  onBack,
  onVerify
}) {
  if (!visible) return null;

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <h2>Verify your identity</h2>
        <p>Enter verification code for {selectedUser?.name}</p>
        <p className="verification-hint">(Use code: 0000)</p>
        <input
          type="text"
          value={verificationCode}
          onChange={onCodeChange}
          placeholder="Enter verification code"
          className="verification-input"
          maxLength={4}
          autoFocus
        />
        <div className="auth-buttons">
          <button onClick={onBack}>Back</button>
          <button onClick={onVerify}>Verify</button>
        </div>
      </div>
    </div>
  );
}

export default VerificationModal;
