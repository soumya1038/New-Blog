import api from './api';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.onRemoteStreamCallback = null;
    this.configuration = { iceServers: DEFAULT_ICE_SERVERS };
    this.iceServersLoadedAt = 0;
    // Queue for ICE candidates received before PeerConnection exists
    this._remoteCandidateQueue = [];
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setOnRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
  }

  async getPeerConnectionConfiguration() {
    const maxAgeMs = 5 * 60 * 1000;
    if (Date.now() - this.iceServersLoadedAt < maxAgeMs) {
      return this.configuration;
    }

    try {
      const { data } = await api.get('/calls/ice-servers');
      if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
        this.configuration = { iceServers: data.iceServers };
        this.iceServersLoadedAt = Date.now();
      }
    } catch (error) {
      console.warn('WebRTC: using STUN fallback; failed to load ICE servers', error?.message || error);
      this.configuration = { iceServers: DEFAULT_ICE_SERVERS };
      this.iceServersLoadedAt = Date.now();
    }

    return this.configuration;
  }

  async createPeerConnection() {
    return new RTCPeerConnection(await this.getPeerConnectionConfiguration());
  }

  async startCall(withVideo = false) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: withVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      // console.log('✅ Local stream obtained:', {
      //   audio: this.localStream.getAudioTracks().length,
      //   video: this.localStream.getVideoTracks().length
      // });
      return this.localStream;
    } catch (error) {
      console.error('Failed to get media devices:', error);
      throw error;
    }
  }

  async createOffer(receiverId) {
    try {
      this.peerConnection = await this.createPeerConnection();
      
      // Set up ontrack BEFORE adding local tracks - CRITICAL for receiving remote tracks
      this.peerConnection.ontrack = (event) => {
        // console.log('📹 Caller received remote track:', event.track.kind, 'enabled:', event.track.enabled);
        // console.log('Remote stream:', event.streams[0]);
        // console.log('Remote stream tracks:', event.streams[0].getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        if (!this.remoteStream) {
          this.remoteStream = event.streams[0];
          if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(this.remoteStream);
          }
        }
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('call:ice-candidate', {
            receiverId,
            candidate: event.candidate
          });
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        // console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
      };

      // Add local tracks AFTER setting up ontrack handler
      this.localStream.getTracks().forEach(track => {
        // console.log('➕ Caller adding local track:', track.kind, 'enabled:', track.enabled);
        this.peerConnection.addTrack(track, this.localStream);
      });

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      // console.log('✅ Offer created and set as local description');

      if (this._remoteCandidateQueue.length && this.peerConnection) {
        for (const c of this._remoteCandidateQueue) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.warn('WebRTC: failed to add queued candidate', e);
          }
        }
        this._remoteCandidateQueue = [];
      }

      this.socket.emit('call:offer', {
        receiverId,
        offer
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async handleOffer(offer, callerId) {
    try {
      this.peerConnection = await this.createPeerConnection();
      
      // Set up ontrack FIRST - CRITICAL for receiving remote tracks
      this.peerConnection.ontrack = (event) => {
        // console.log('📹 Receiver received remote track:', event.track.kind, 'enabled:', event.track.enabled);
        // console.log('Remote stream:', event.streams[0]);
        // console.log('Remote stream tracks:', event.streams[0].getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        if (!this.remoteStream) {
          this.remoteStream = event.streams[0];
          if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(this.remoteStream);
          }
        }
      };
      
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('call:ice-candidate', {
            receiverId: callerId,
            candidate: event.candidate
          });
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        // console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
      };
      
      // Add local tracks AFTER setting up ontrack handler
      this.localStream.getTracks().forEach(track => {
        // console.log('➕ Receiver adding local track:', track.kind, 'enabled:', track.enabled);
        this.peerConnection.addTrack(track, this.localStream);
      });

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      // console.log('✅ Remote description set from offer');

      if (this._remoteCandidateQueue.length) {
        for (const c of this._remoteCandidateQueue) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.warn('WebRTC: failed to add queued candidate', e);
          }
        }
        this._remoteCandidateQueue = [];
      }
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  async createAnswer(callerId) {
    try {
      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(answer);
      // console.log('✅ Answer created and set as local description');

      this.socket.emit('call:answer', {
        callerId,
        answer
      });
      
      return answer;
    } catch (error) {
      console.error('Failed to create answer:', error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        // console.log('🧊 ICE candidate received, PeerConnection ready — adding immediately');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // PeerConnection not ready yet — queue candidate for later
        // console.log(`🧊 ICE candidate received, PeerConnection NOT ready — queueing (total queued: ${this._remoteCandidateQueue.length + 1})`);
        this._remoteCandidateQueue.push(candidate);
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  async toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }

  async endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        // console.log('🛑 Stopped local track:', track.kind);
      });
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      // console.log('🛑 Peer connection closed');
    }
    
    this.remoteStream = null;
    this._remoteCandidateQueue = [];
  }
}

export default new WebRTCService();
