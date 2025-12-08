class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.onRemoteStreamCallback = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    // Optionally load TURN server from environment variables (build-time for CRA)
    try {
      const turnUrl = (typeof process !== 'undefined' && process.env.REACT_APP_TURN_URL) || null;
      const turnUser = (typeof process !== 'undefined' && process.env.REACT_APP_TURN_USERNAME) || null;
      const turnPass = (typeof process !== 'undefined' && process.env.REACT_APP_TURN_PASSWORD) || null;
      if (turnUrl && turnUser && turnPass) {
        this.configuration.iceServers.push({
          urls: [`turn:${turnUrl}:3478`],
          username: turnUser,
          credential: turnPass
        });
        console.log('WebRTC: TURN server added from env');
      } else {
        console.log('WebRTC: No TURN server configured (REACT_APP_TURN_* env vars missing)');
      }
    } catch (err) {
      console.warn('WebRTC: Failed to read TURN env vars', err);
    }
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setOnRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
  }

  async startCall(withVideo = false) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
      });
      return this.localStream;
    } catch (error) {
      console.error('Failed to get media devices:', error);
      throw error;
    }
  }

  async createOffer(receiverId) {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      this.peerConnection.ontrack = (event) => {
        console.log('📹 Received remote track');
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
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

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
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
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Set up ICE candidate handler FIRST
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('call:ice-candidate', {
            receiverId: callerId,
            candidate: event.candidate
          });
        }
      };
      
      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Set up remote track handler
      this.peerConnection.ontrack = (event) => {
        console.log('📹 Received remote track');
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      };

      // Set remote description
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  async createAnswer(callerId) {
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

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
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
  }
}

export default new WebRTCService();
