import React from 'react';
import "../../App.css";

function WelcomeMessage({ visible, userName }) {
  if (!visible) return null;

  return (
    <div className="welcome-message">
      <div className="welcome-content">
        <h3>Welcome, {userName}!</h3>
        <p>You have successfully logged in.</p>
      </div>
    </div>
  );
}

export default WelcomeMessage;
