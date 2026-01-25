
import React, { useState } from 'react';
import { Camera, ArrowRight, Sparkles, Check, User, Phone, Info, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: { name: string; phone: string; email: string; password: string; bio: string; avatar: string }) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    bio: 'Finding peace in connection.',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
  });

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Relaxed phone validation to be more user friendly
  const validatePhone = (phone: string) => phone.length >= 10;

  const next = () => setStep(s => s + 1);

  const isIdentityComplete = formData.name.trim().length >= 2 && 
                              validatePhone(formData.phone) && 
                              validateEmail(formData.email) && 
                              formData.password.length >= 6;

  const handleFinish = async () => {
    if (!isIdentityComplete) return;
    
    setIsInitializing(true);
    try {
      // Small delay for psychological feedback of "initialization"
      await new Promise(resolve => setTimeout(resolve, 800));
      onComplete(formData);
    } catch (err) {
      console.error("Registration failed:", err);
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0b141a] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00a884]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#00a884]/10 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Sparkles className="text-[#00a884]" size={32} />
          </div>
          <h1 className="text-3xl font-bold font-outfit text-white tracking-tight">Welcome to Zenj</h1>
          <p className="text-[#8696a0] font-medium text-sm">Your journey to peaceful connection begins here.</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar max-h-[70vh] px-2">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <img src={formData.avatar} className="w-24 h-24 rounded-[32px] object-cover border-4 border-[#202c33] shadow-2xl" alt="Avatar" />
                <button 
                  onClick={() => setFormData({...formData, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`})}
                  className="absolute -bottom-1 -right-1 bg-[#00a884] text-black p-1.5 rounded-lg shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera size={16} />
                </button>
              </div>
              <div className="w-full space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#00a884] uppercase tracking-[0.2em] ml-2">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={18} />
                    <input 
                      type="text"
                      placeholder="e.g. Zen Master"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-[#111b21] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-[#00a884]/40 transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#00a884] uppercase tracking-[0.2em] ml-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={18} />
                    <input 
                      type="email"
                      placeholder="zen@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={`w-full bg-[#111b21] border ${formData.email && !validateEmail(formData.email) ? 'border-rose-500' : 'border-white/5'} rounded-2xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-[#00a884]/40 transition-all`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#00a884] uppercase tracking-[0.2em] ml-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={18} />
                    <input 
                      type="tel"
                      placeholder="+256XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className={`w-full bg-[#111b21] border ${formData.phone && !validatePhone(formData.phone) ? 'border-rose-500' : 'border-white/5'} rounded-2xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-[#00a884]/40 transition-all`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#00a884] uppercase tracking-[0.2em] ml-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-[#111b21] border border-white/5 rounded-2xl py-3.5 pl-12 pr-12 text-white outline-none focus:border-[#00a884]/40 transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b4a54] hover:text-[#00a884]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button 
              disabled={!isIdentityComplete}
              onClick={next}
              className="w-full bg-[#00a884] text-black font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 shadow-2xl shadow-[#00a884]/20 hover:bg-[#06cf9c] transition-all disabled:opacity-50"
            >
              Continue Journey <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#00a884] uppercase tracking-[0.2em] ml-2">Your Presence (Bio)</label>
              <div className="relative">
                <Info className="absolute left-4 top-4 text-[#3b4a54]" size={18} />
                <textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full h-32 bg-[#111b21] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[#00a884]/40 transition-all text-lg resize-none"
                />
              </div>
            </div>
            <button 
              onClick={handleFinish}
              disabled={isInitializing || !isIdentityComplete}
              className="w-full bg-[#00a884] text-black font-bold py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl shadow-[#00a884]/20 hover:bg-[#06cf9c] transition-all text-lg disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <span>Initialize Presence</span>
                  <Check size={20} strokeWidth={3} />
                </>
              )}
            </button>
            <button 
              onClick={() => setStep(1)} 
              disabled={isInitializing}
              className="w-full text-[#8696a0] font-medium text-sm disabled:opacity-30"
            >
              Back to Identity
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-6 bg-[#00a884]' : 'bg-[#202c33]'}`}></div>
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-6 bg-[#00a884]' : 'bg-[#202c33]'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
