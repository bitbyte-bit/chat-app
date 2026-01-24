
import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginProps {
  profile: UserProfile;
  /**
   * onLogin can be synchronous or asynchronous to support potential background tasks
   * like cryptographic key derivation during the login process.
   */
  onLogin: (password: string) => boolean | Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ profile, onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLink, setIsProfileLink] = useState(false);

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

  return (
    <div className="fixed inset-0 z-[250] bg-[#0b141a] flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00a884]/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-sm relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="space-y-4">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-24 h-24 rounded-[32px] mx-auto border-4 border-[#202c33] shadow-2xl"
          />
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white font-outfit">
              {isProfileLink ? `Welcome to Zenj, ${profile.name}!` : `Welcome back, ${profile.name}`}
            </h2>
            <p className="text-[#8696a0] text-sm">Please enter your password to unlock your presence.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#00a884] uppercase tracking-widest ml-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                autoFocus
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                className={`w-full bg-[#111b21] border ${error ? 'border-rose-500' : 'border-white/5'} rounded-2xl py-4 pl-12 pr-12 text-white outline-none focus:border-[#00a884]/40 transition-all text-lg`}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b4a54] hover:text-[#00a884]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="text-rose-500 text-xs mt-2 ml-2 font-medium">Incorrect password. Please try again.</p>}
          </div>

          <button 
            type="submit"
            disabled={!password || isLoading}
            className="w-full bg-[#00a884] text-black font-bold py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl shadow-[#00a884]/20 hover:bg-[#06cf9c] transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Unlock <ArrowRight size={20} /></>}
          </button>
        </form>

        <button 
          onClick={() => { if(confirm("This will erase all data. Proceed?")) { localStorage.clear(); window.location.reload(); } }}
          className="text-[#8696a0] text-xs font-medium hover:text-white transition-colors"
        >
          Not you? Reset this presence
        </button>
      </div>
    </div>
  );
};

export default Login;
