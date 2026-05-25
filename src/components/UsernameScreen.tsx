import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UsernameScreen() {
  const { saveUsername } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    const err = await saveUsername(value);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="uname-wrap">
      <div className="uname-box">
        <div className="auth-logo">Recommenderz</div>
        <h2>Choose a username to get started. You can always change it later.</h2>
        <input
          type="text"
          className="auth-input"
          placeholder="Username"
          maxLength={20}
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ marginTop: 16 }}
        />
        <div className="uname-err">{error}</div>
        <button
          onClick={handleSave}
          className="auth-btn"
          style={{ marginTop: 12 }}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Next'}
        </button>
      </div>
    </div>
  );
}
