
import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { Contact, CallType } from '../types';
import { connectToLive, encodeAudio, decodeAudio, decodeAudioData } from '../services/gemini';

interface LiveCallOverlayProps {
  contact: Contact;
  type: CallType;
  onEnd: () => void;
}

const LiveCallOverlay: React.FC<LiveCallOverlayProps> = ({ contact, type, onEnd }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(type === 'video');
  const [status, setStatus] = useState('Connecting...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []);

  const stopSession = () => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    sourcesRef.current.forEach(s => s.stop());
  };

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' 
      });

      if (videoRef.current && type === 'video') {
        videoRef.current.srcObject = stream;
      }

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

      const sessionPromise = connectToLive(contact.systemInstruction, {
        onopen: () => {
          setStatus('Connected');
          
          // Microhpone streaming
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            if (isMuted) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const base64 = encodeAudio(new Uint8Array(int16.buffer));
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };

          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);

          // Video frame streaming
          if (type === 'video') {
            frameIntervalRef.current = window.setInterval(() => {
              if (!videoRef.current || !canvasRef.current || !isVideoEnabled) return;
              const ctx = canvasRef.current.getContext('2d');
              if (!ctx) return;
              
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
              ctx.drawImage(videoRef.current, 0, 0);
              
              const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
              });
            }, 1000);
          }
        },
        onmessage: async (msg) => {
          const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData && outputAudioContextRef.current) {
            const buffer = await decodeAudioData(
              decodeAudio(audioData),
              outputAudioContextRef.current,
              24000,
              1
            );
            
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContextRef.current.destination);
            
            const now = outputAudioContextRef.current.currentTime;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
          console.error('Live Error:', e);
          setStatus('Error: ' + (e as any).message);
        },
        onclose: () => onEnd()
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setStatus('Permission Denied');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b141a]/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        
        <div className="relative mb-8">
          {isVideoEnabled ? (
            <div className="w-[320px] h-[480px] bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
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
          onClick={() => setIsMuted(!isMuted)}
          className={`p-5 rounded-full transition-all ${isMuted ? 'bg-white/10 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        <button 
          onClick={onEnd}
          className="p-6 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20"
        >
          <PhoneOff size={32} fill="currentColor" />
        </button>

        <button 
          onClick={() => setIsVideoEnabled(!isVideoEnabled)}
          className={`p-5 rounded-full transition-all ${!isVideoEnabled ? 'bg-white/10 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
        >
          {isVideoEnabled ? <Video size={28} /> : <VideoOff size={28} />}
        </button>
      </div>
    </div>
  );
};

export default LiveCallOverlay;
