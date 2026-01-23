
import React, { useState } from 'react';
import { X, Phone, Share2, CheckCircle2, Copy, Loader2 } from 'lucide-react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (phone: string) => void;
  userName: string;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, onAdd, userName }) => {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'input' | 'success'>('input');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!phone.trim()) return;
    setIsAdding(true);
    
    // Simulate API call
    setTimeout(() => {
      onAdd(phone);
      setIsAdding(false);
      setStep('success');
    }, 1000);
  };

  const handleShareInvite = async () => {
    const inviteLink = `https://zenj.ai/register?ref=${encodeURIComponent(phone)}&inviter=${encodeURIComponent(userName)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Zenj Chat',
          text: `Hey! I added you on Zenj. Use this link to finish your registration:`,
          url: inviteLink,
        });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        alert('Invite link copied to clipboard!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#202c33] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-[#e9edef]">Add New Friend</h3>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {step === 'input' ? (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-[#00a884]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="text-[#00a884]" size={28} />
                </div>
                <p className="text-[#8696a0] text-sm">
                  Enter your friend's phone number to find them or invite them to Zenj.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#00a884] uppercase tracking-wider">Phone Number</label>
                <input 
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  className="w-full bg-[#2a3942] border border-transparent focus:border-[#00a884] rounded-xl py-3 px-4 text-[#d1d7db] outline-none transition-all text-lg"
                />
              </div>

              <button 
                onClick={handleAdd}
                disabled={!phone.trim() || isAdding}
                className="w-full bg-[#00a884] text-black font-bold py-4 rounded-xl hover:bg-[#06cf9c] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdding ? <Loader2 className="animate-spin" size={20} /> : 'Add Friend'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Friend Added!</h4>
                <p className="text-[#8696a0] text-sm">
                  A placeholder profile has been created for <strong>{phone}</strong>. Share the invite link to let them complete their registration.
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleShareInvite}
                  className="w-full bg-[#00a884] text-black font-bold py-4 rounded-xl hover:bg-[#06cf9c] transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={20} />
                  Share Invite Link
                </button>
                <button 
                  onClick={onClose}
                  className="w-full bg-[#2a3942] text-[#d1d7db] font-semibold py-3 rounded-xl hover:bg-[#32414a] transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
