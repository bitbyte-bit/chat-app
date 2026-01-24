
import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';

const PWAInstallBanner: React.FC = () => {
  const [installable, setInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isStandalone) {
      setInstallable(false);
      return;
    }

    // Check if the event was already stashed by the index.html script
    if ((window as any).deferredPrompt) {
      setInstallable(true);
    }

    // Listen for the custom event from index.html
    const handleInstallAvailable = () => {
      setInstallable(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    return () => window.removeEventListener('pwa-install-available', handleInstallAvailable);
  }, []);

  const handleInstall = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) return;

    // Show the native prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, clear it
    (window as any).deferredPrompt = null;
    setInstallable(false);
  };

  if (!installable || isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[300] p-4 safe-top animate-in slide-in-from-top duration-500">
      <div className="max-w-xl mx-auto glass rounded-[32px] p-4 flex items-center justify-between border border-[#00a884]/30 shadow-2xl shadow-[#00a884]/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00a884] rounded-2xl flex items-center justify-center text-black shadow-lg">
            <Smartphone size={24} />
          </div>
          <div className="flex flex-col">
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
              Zenj for Mobile <Sparkles size={14} className="text-[#00a884]" />
            </h4>
            <p className="text-[#8696a0] text-xs">Add to Home Screen for the full experience</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleInstall}
            className="bg-[#00a884] hover:bg-[#06cf9c] text-black text-xs font-bold px-5 py-2.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-[#00a884]/20"
          >
            Install
          </button>
          <button 
            onClick={() => setIsDismissed(true)}
            className="p-2 text-[#8696a0] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
