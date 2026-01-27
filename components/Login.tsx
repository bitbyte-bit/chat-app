
import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, ArrowRight, Eye, EyeOff, Loader2, UserPlus, Key, CheckCircle, XCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { useNotification } from './NotificationProvider';
import { dbQuery, dbRun } from '../services/database';
import { deriveKeyFromPassword } from '../services/crypto';

interface LoginProps {
   /**
    * onLogin can be synchronous or asynchronous to support potential background tasks
    * like cryptographic key derivation during the login process.
    */
   onLogin: (email: string, password: string) => boolean | Promise<boolean>;
   onRegister?: (data: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const { confirm, showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newAccount, setNewAccount] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [passwordStrength, setPasswordStrength] = useState(0);


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
    if (!email || !password) return;

    setIsLoading(true);
    try {
      // Execute and await the authentication check
      const success = await onLogin(email, password);
      if (!success) {
        setError(true);
        setEmail('');
        setPassword('');
        setIsLoading(false);
      }
      // If successful, the parent component (App) will update isAuthenticated state,
      // causing this component to unmount as the user enters the main application.
    } catch (err) {
      console.error('Login error:', err);
      setError(true);
      setEmail('');
      setPassword('');
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
        setCodeSent(true);
        showNotification('Reset code sent to your email/SMS. Please check and enter the code below.', [], 'info');
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
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, phone: forgotPhone, code: resetCode, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Password reset successfully!', [], 'success');
        setShowForgotPassword(false);
        setCodeSent(false);
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
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
      await onRegister(newAccount);
      setShowCreateAccount(false);
      setNewAccount({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    } catch (err) {
      // onRegister handles notifications
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
              Welcome back
            </h2>
            <p className="text-[#8696a0] text-sm">Please enter your email and password to continue.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-[#202c33] border rounded-xl py-3 px-4 text-white outline-none transition-all ${error ? 'border-red-500' : 'border-white focus:border-[#00a884]'}`}
              disabled={isLoading}
            />
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
            {error && <p className="text-red-500 text-sm">Invalid email or password. Please try again.</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-[#00a884] text-black font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-[#00a884] text-xs font-medium hover:text-white transition-colors"
            >
              Forgot Password?
            </button>
            <button
              type="button"
              onClick={() => setShowCreateAccount(true)}
              className="text-[#00a884] text-xs font-medium hover:text-white transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
            {showForgotPassword && (
              <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6">
                <div className="bg-[#111b21] rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <h3 className="text-white font-bold text-lg text-center">Forgot Password</h3>
                  {!codeSent ? (
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
                      setCodeSent(false);
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
