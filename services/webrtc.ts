import { emitMessage } from './socket';

export class WebRTCCall {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStream: (stream: MediaStream) => void;
  private onCallEnded: () => void;
  private onStatusChange: (status: string) => void;
  private targetUserId: string;

  constructor(
    targetUserId: string,
    onRemoteStream: (stream: MediaStream) => void,
    onCallEnded: () => void,
    onStatusChange: (status: string) => void
  ) {
    this.targetUserId = targetUserId;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnded = onCallEnded;
    this.onStatusChange = onStatusChange;

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        emitMessage({
          type: 'webrtc-ice',
          to: this.targetUserId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStream(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.onStatusChange(this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'disconnected' ||
          this.peerConnection.connectionState === 'failed' ||
          this.peerConnection.connectionState === 'closed') {
        this.onCallEnded();
      }
    };
  }

  async startCall(audio: boolean, video: boolean): Promise<void> {
    try {
      this.onStatusChange('Requesting media access...');
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio, video });

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream!);
      });

      this.onStatusChange('Creating offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      emitMessage({
        type: 'webrtc-offer',
        to: this.targetUserId,
        offer
      });

      this.onStatusChange('Waiting for answer...');
    } catch (error) {
      console.error('Error starting call:', error);
      this.onStatusChange('Failed to access media devices');
      throw error;
    }
  }

  async handleOffer(from: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.onStatusChange('Receiving call...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Get user media for answer
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: offer.sdp?.includes('video') || false
      });

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream!);
      });

      this.onStatusChange('Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      emitMessage({
        type: 'webrtc-answer',
        to: from,
        answer
      });

      this.onStatusChange('Connected');
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      this.onStatusChange('Connected');
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  endCall(): void {
    emitMessage({
      type: 'webrtc-end',
      to: this.targetUserId
    });
    this.cleanup();
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peerConnection.close();
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }
}