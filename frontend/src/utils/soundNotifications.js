// Sound notification utility using Web Audio API

class SoundNotification {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Play send message sound (short beep)
  playSendSound() {
    if (!this.enabled) return;
    this.init();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // Play receive sound for active chat (soft single beep)
  playReceiveSoundActive() {
    if (!this.enabled) return;
    this.init();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 700;
    oscillator.type = 'sine';
    
    // Softer volume for active chat
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.08);
  }

  // Play receive sound for other chats (double beep - alert)
  playReceiveSound() {
    if (!this.enabled) return;
    this.init();
    
    // First beep
    const oscillator1 = this.audioContext.createOscillator();
    const gainNode1 = this.audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(this.audioContext.destination);
    
    oscillator1.frequency.value = 600;
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator1.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.1);
    
    // Second beep
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode2 = this.audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(this.audioContext.destination);
    
    oscillator2.frequency.value = 800;
    oscillator2.type = 'sine';
    
    gainNode2.gain.setValueAtTime(0.3, this.audioContext.currentTime + 0.15);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);
    
    oscillator2.start(this.audioContext.currentTime + 0.15);
    oscillator2.stop(this.audioContext.currentTime + 0.25);
  }

  // Play notification sound (triple beep - distinct from chat sounds)
  playMessageNotificationSound() {
    if (!this.enabled) return;
    this.init();
    
    // Triple beep pattern for notifications
    const beeps = [
      { time: 0, freq: 650, duration: 0.08 },
      { time: 0.12, freq: 750, duration: 0.08 },
      { time: 0.24, freq: 850, duration: 0.12 }
    ];
    
    beeps.forEach(beep => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = beep.freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.35, this.audioContext.currentTime + beep.time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beep.time + beep.duration);
      
      oscillator.start(this.audioContext.currentTime + beep.time);
      oscillator.stop(this.audioContext.currentTime + beep.time + beep.duration);
    });
  }

  // Play notification received sound (double beep for like/comment/follow)
  playNotificationReceivedSound() {
    if (!this.enabled) return;
    this.init();
    
    const beeps = [
      { time: 0, freq: 900, duration: 0.1 },
      { time: 0.15, freq: 1100, duration: 0.12 }
    ];
    
    beeps.forEach(beep => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = beep.freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + beep.time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beep.time + beep.duration);
      
      oscillator.start(this.audioContext.currentTime + beep.time);
      oscillator.stop(this.audioContext.currentTime + beep.time + beep.duration);
    });
  }

  // Play like action sound (single short beep for person who liked)
  playLikeActionSound() {
    if (!this.enabled) return;
    this.init();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.08);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export default new SoundNotification();
