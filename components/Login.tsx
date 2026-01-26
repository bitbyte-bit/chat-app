
import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, ArrowRight, Eye, EyeOff, Loader2, UserPlus, Key, CheckCircle, XCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { useNotification } from './NotificationProvider';
import { dbQuery, dbRun } from '../services/database';
import { deriveKeyFromPassword } from '../services/crypto';

interface LoginProps {
  profile: UserProfile;
  /**
   * onLogin can be synchronous or asynchronous to support potential background tasks
   * like cryptographic key derivation during the login process.
   */
  onLogin: (password: string) => boolean | Promise<boolean>;
  onRegister?: (data: any) => void;
}

const Login: React.FC<LoginProps> = ({ profile, onLogin, onRegister }) => {
  const { confirm, showNotification } = useNotification();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLink, setIsProfileLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedResetCode, setGeneratedResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newAccount, setNewAccount] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const profileParam = urlParams.get('profile');
    if (profileParam && profileParam === profile.id) {
      setIsProfileLink(true);
      // Update Open Graph meta tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');

      if (ogTitle) ogTitle.setAttribute('content', `Welcome to Zenj - ${profile.name}`);
      if (ogDescription) ogDescription.setAttribute('content', `Join ${profile.name} on Zenj, your minimalist AI companion. Real-time voice, video, and image generation.`);
      if (ogImage) ogImage.setAttribute('content', profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name)}`);

      // Update page title
      document.title = `Welcome to Zenj - ${profile.name}`;
    }
  }, [profile]);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(newAccount.password));
  }, [newAccount.password]);

  /**
   * handleLogin is now async to properly await the result of onLogin,
   * which may perform asynchronous operations (like PBKDF2 key derivation).
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setIsLoading(true);
    try {
      // Execute and await the authentication check
      const success = await onLogin(password);
      if (!success) {
        setError(true);
        setIsLoading(false);
      }
      // If successful, the parent component (App) will update isAuthenticated state,
      // causing this component to unmount as the user enters the main application.
    } catch (err) {
      console.error('Login error:', err);
      setError(true);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail || !forgotPhone) {
      showNotification('Please enter both email and phone.', [], 'error');
      return;
    }
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, phone: forgotPhone })
      });
      const data = await response.json();
      if (response.ok) {
        setGeneratedResetCode(data.code);
        showNotification(`Reset code sent: ${data.code} (In production, this would be emailed/SMS)`, [], 'info');
      } else {
        if (data.error === 'Account not found') {
          showNotification('Account not found. Redirecting to create new account.', [], 'error');
          setShowForgotPassword(false);
          setShowCreateAccount(true);
        } else {
          showNotification(data.error, [], 'error');
        }
      }
    } catch (err) {
      showNotification('Error retrieving account.', [], 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword || !confirmPassword) {
      showNotification('Please fill all fields.', [], 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match.', [], 'error');
      return;
    }
    if (resetCode !== generatedResetCode) {
      showNotification('Invalid reset code.', [], 'error');
      return;
    }
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, phone: forgotPhone, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Password reset successfully!', [], 'success');
        setShowForgotPassword(false);
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setGeneratedResetCode('');
      } else {
        showNotification(data.error, [], 'error');
      }
    } catch (err) {
      showNotification('Error resetting password.', [], 'error');
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.name || !newAccount.email || !newAccount.phone || !newAccount.password || !newAccount.confirmPassword) {
      showNotification('All fields are required.', [], 'error');
      return;
    }
    if (newAccount.password !== newAccount.confirmPassword) {
      showNotification('Passwords do not match.', [], 'error');
      return;
    }
    if (passwordStrength < 3) {
      showNotification('Password is too weak. Please use a stronger password.', [], 'error');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAccount.email)) {
      showNotification('Please enter a valid email address.', [], 'error');
      return;
    }
    // Basic phone validation (simple check for digits)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(newAccount.phone)) {
      showNotification('Please enter a valid phone number.', [], 'error');
      return;
    }
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Account created successfully!', [], 'success');
        setShowCreateAccount(false);
        setNewAccount({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
        // Optionally, auto-login or redirect
      } else {
        if (data.error === 'Account already exists') {
          showNotification('Account already exists. Please log in with your existing credentials.', [], 'info');
          setShowCreateAccount(false);
          setNewAccount({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
        } else {
          showNotification(data.error, [], 'error');
        }
      }
    } catch (err) {
      showNotification('Error creating account.', [], 'error');
    }
  };

  return (
      <div className="relative">
        <div className="fixed inset-0 z-[250] bg-[#0b141a] flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00a884] blur-[120px] rounded-full" style={{ opacity: 0.1 }}></div>
      </div>

      <div className="w-full max-w-sm relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white font-outfit">
              {profile.id ? (isProfileLink ? `Welcome to Zenj, ${profile.name}!` : `Welcome back, ${profile.name}`) : 'Welcome to Zenj'}
            </h2>
            <p className="text-[#8696a0] text-sm">{profile.id ? 'Please enter your password to unlock your presence.' : 'Please create an account to get started.'}</p>
          </div>
        </div>

        {profile.id ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#202c33] border rounded-xl py-3 px-4 text-white outline-none transition-all ${error ? 'border-red-500' : 'border-white focus:border-[#00a884]'}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8696a0] hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm">Incorrect password. Please try again.</p>}
            </div>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-[#00a884] text-black font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
              {isLoading ? 'Unlocking...' : 'Unlock'}
            </button>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[#00a884] text-xs font-medium hover:text-white transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-[#8696a0] text-sm">No account found. Please create a new account to get started.</p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setShowCreateAccount(true)}
            className="text-[#00a884] text-xs font-medium hover:text-white transition-colors flex items-center gap-1"
          >
            <UserPlus size={12} /> Create New Account
          </button>
        </div>
      </div>
    </div>
            {showForgotPassword && (
              <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6">
                <div className="bg-[#111b21] rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <h3 className="text-white font-bold text-lg text-center">Forgot Password</h3>
                  {!generatedResetCode ? (
                    <div>
                <p className="text-[#8696a0] text-sm text-center">Enter your email and phone to receive a reset code.</p>
                <input
                  type="email"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 bg-[#202c33] text-white py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleForgotPassword}
                    className="flex-1 bg-[#00a884] text-black font-bold py-3 rounded-xl"
                  >
                    Send Code
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[#8696a0] text-sm text-center">Enter the reset code and your new password.</p>
                <input
                  type="text"
                  placeholder="Reset Code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setGeneratedResetCode('');
                      setResetCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="flex-1 bg-[#202c33] text-white py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="flex-1 bg-[#00a884] text-black font-bold py-3 rounded-xl"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-[#111b21] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-bold text-lg text-center">Create New Account</h3>
            <input
              type="text"
              placeholder="Name"
              value={newAccount.name}
              onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
              className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
            />
            <input
              type="email"
              placeholder="Email"
              value={newAccount.email}
              onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
              className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={newAccount.phone}
              onChange={(e) => setNewAccount({...newAccount, phone: e.target.value})}
              className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
            />
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Password"
                value={newAccount.password}
                onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#202c33] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      passwordStrength === 0 ? 'bg-gray-500' :
                      passwordStrength === 1 ? 'bg-red-500' :
                      passwordStrength === 2 ? 'bg-orange-500' :
                      passwordStrength === 3 ? 'bg-yellow-500' :
                      passwordStrength === 4 ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{
                      width: passwordStrength === 0 ? '0%' :
                      passwordStrength === 1 ? '20%' :
                      passwordStrength === 2 ? '40%' :
                      passwordStrength === 3 ? '60%' :
                      passwordStrength === 4 ? '80%' :
                      '100%'
                    }}
                  ></div>
                </div>
                <span className="text-xs text-[#8696a0]">
                  {passwordStrength === 0 ? 'Very Weak' :
                   passwordStrength === 1 ? 'Weak' :
                   passwordStrength === 2 ? 'Fair' :
                   passwordStrength === 3 ? 'Good' :
                   passwordStrength === 4 ? 'Strong' :
                   'Very Strong'}
                </span>
              </div>
            </div>
            <input
              type="password"
              placeholder="Confirm Password"
              value={newAccount.confirmPassword}
              onChange={(e) => setNewAccount({...newAccount, confirmPassword: e.target.value})}
              className="w-full bg-[#202c33] border border-white rounded-xl py-3 px-4 text-white outline-none focus:border-[#00a884] transition-all"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateAccount(false);
                  setNewAccount({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
                }}
                className="flex-1 bg-[#202c33] text-white py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 bg-[#00a884] text-black font-bold py-3 rounded-xl"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
