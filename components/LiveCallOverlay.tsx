
import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { Contact, CallType } from '../types';
import { WebRTCCall } from '../services/webrtc';
import { initSocket } from '../services/socket';

interface LiveCallOverlayProps {
  contact: Contact;
  type: CallType;
  onEnd: () => void;
  currentUserId: string;
}

const LiveCallOverlay: React.FC<LiveCallOverlayProps> = ({ contact, type, onEnd, currentUserId }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === 'video');
  const [status, setStatus] = useState('Connecting...');
  const [call, setCall] = useState<WebRTCCall | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    startCall();
    return () => {
      if (call) call.endCall();
    };
  }, []);

  const startCall = async () => {
    try {
      setStatus('Initializing...');
      socketRef.current = initSocket(currentUserId);

      const webrtcCall = new WebRTCCall(
        contact.id,
        (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        () => {
          setStatus('Call ended');
          onEnd();
        },
        (newStatus) => {
          setStatus(newStatus);
        }
      );

      setCall(webrtcCall);

      // Set up socket listeners
      socketRef.current.on('webrtc-offer', async (data: any) => {
        if (data.from === contact.id) {
          await webrtcCall.handleOffer(data.from, data.offer);
        }
      });

      socketRef.current.on('webrtc-answer', async (data: any) => {
        if (data.from === contact.id) {
          await webrtcCall.handleAnswer(data.answer);
        }
      });

      socketRef.current.on('webrtc-ice', async (data: any) => {
        if (data.from === contact.id) {
          await webrtcCall.handleIceCandidate(data.candidate);
        }
      });

      socketRef.current.on('webrtc-end', (data: any) => {
        if (data.from === contact.id) {
          webrtcCall.endCall();
        }
      });

      await webrtcCall.startCall(true, type === 'video');

      const localStream = webrtcCall.getLocalStream();
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } catch (err) {
      console.error('Error starting call:', err);
      setStatus('Permission Denied');
    }
  };

  const toggleMute = () => {
    if (call) {
      call.toggleAudio();
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (call) {
      call.toggleVideo();
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const endCall = () => {
    if (call) {
      call.endCall();
    }
    onEnd();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b141a]/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        <div className="relative mb-8">
          {type === 'video' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="w-[240px] h-[180px] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">You</div>
              </div>
              <div className="w-[240px] h-[180px] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">{contact.name}</div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20"></div>
              <img src={contact.avatar} alt={contact.name} className="w-48 h-48 rounded-full shadow-2xl relative z-10 border-4 border-[#00a884]" />
            </div>
          )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">{contact.name}</h2>
        <p className="text-[#00a884] font-medium tracking-wide uppercase text-sm animate-pulse">{status}</p>
      </div>

      {/* Controls */}
      <div className="h-[120px] bg-[#202c33]/50 backdrop-blur-md flex items-center justify-center gap-10 px-8">
        <button
          onClick={toggleMute}
          className={`p-5 rounded-full transition-all ${isMuted ? 'bg-white/10 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        <button
          onClick={endCall}
          className="p-6 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20"
        >
          <PhoneOff size={32} fill="currentColor" />
        </button>

        {type === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-5 rounded-full transition-all ${!isVideoEnabled ? 'bg-white/10 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isVideoEnabled ? <Video size={28} /> : <VideoOff size={28} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveCallOverlay;
