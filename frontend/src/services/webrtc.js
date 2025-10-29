class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.socket = null;
    
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  setSocket(socket) {
    this.socket = socket;
  }

  async startCall(isVideo = false) {
    try {
      // Cleanup existing resources first
      await this.cleanup();
      
      // Wait for browser to fully release devices
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const constraints = {
        audio: true,
        video: isVideo ? { facingMode: 'user' } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.peerConnection = new RTCPeerConnection(this.config);
      
      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        event.streams[0].getTracks().forEach(track => {
          this.remoteStream.addTrack(track);
        });
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('call:ice-candidate', {
            candidate: event.candidate
          });
        }
      };
      
      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async createOffer(receiverId) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    
    // Send offer to receiver
    if (this.socket && receiverId) {
      this.socket.emit('call:offer', { receiverId, offer });
    }
    
    return offer;
  }

  async createAnswer(callerId) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    // Send answer to caller
    if (this.socket && callerId) {
      this.socket.emit('call:answer', { callerId, answer });
    }
    
    return answer;
  }

  async handleOffer(offer) {
    if (!this.peerConnection) {
      this.peerConnection = new RTCPeerConnection(this.config);
      
      // Add local stream tracks if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        event.streams[0].getTracks().forEach(track => {
          this.remoteStream.addTrack(track);
        });
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('call:ice-candidate', {
            candidate: event.candidate
          });
        }
      };
    }
    
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  async endCall() {
    await this.cleanup();
  }

  async toggleVideo() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  toggleAudio() {
    if (!this.localStream) return;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      
      // Replace video track with screen track
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      }
      
      // Handle screen share stop
      screenTrack.onended = () => {
        this.stopScreenShare();
      };
      
      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack && this.peerConnection) {
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    }
  }

  startRecording() {
    if (!this.localStream) return;
    
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.localStream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.start();
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Download file
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        a.click();
        
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
    });
  }

  async cleanup() {
    // Stop all tracks immediately
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.remoteStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Wait for browser to release resources
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export default new WebRTCService();
