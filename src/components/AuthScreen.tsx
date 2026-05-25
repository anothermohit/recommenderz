import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './Icons';

export default function AuthScreen() {
  const { signInWithGoogle, sendOTP, verifyOTP } = useAuth();
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!phone) return;
    setError('');
    try {
      await sendOTP(phone);
      setOtpSent(true);
    } catch (e: any) {
      setError('Error: ' + (e.message || e));
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return;
    setError('');
    try {
      await verifyOTP(otp);
    } catch (_e) {
      setError('Invalid code');
    }
  };

  return (
    <div className="auth-wrap">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="auth-box">
          <div className="auth-logo">Recommenderz</div>
          <button onClick={signInWithGoogle} className="auth-google">
            <GoogleIcon />
            Log in with Google
          </button>
          <div className="auth-sep">
            <div className="auth-sep-line" />
            <div className="auth-sep-text">OR</div>
            <div className="auth-sep-line" />
          </div>
          {showPhone && (
            <>
              <input
                type="tel"
                className="auth-input"
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              {!otpSent && (
                <button onClick={handleSendOTP} className="auth-btn">Next</button>
              )}
              {otpSent && (
                <>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Confirmation code"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                  />
                  <button onClick={handleVerifyOTP} className="auth-btn">Confirm</button>
                </>
              )}
            </>
          )}
          {!showPhone && (
            <button onClick={() => setShowPhone(true)} className="auth-phone-link">
              Log in with phone number
            </button>
          )}
          {error && <div className="uname-err">{error}</div>}
          <div id="recaptcha-container" />
        </div>
        <div className="auth-footer">
          Don't have an account? <span onClick={signInWithGoogle}>Sign up</span>
        </div>
      </div>
    </div>
  );
}
