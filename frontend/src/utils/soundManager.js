// Sound Manager Utility
class SoundManager {
  constructor() {
    this.sounds = {
      notification: new Audio('/sounds/Receive-notification.mp3'),
      sendMsg: new Audio('/sounds/Send-msg.mp3'),
      receiveMsg: new Audio('/sounds/receive-msg.mp3'),
      callRing: new Audio('/sounds/call-ring-sound.mp3'),
      endCall: new Audio('/sounds/end-call.mp3'),
      incomingCall: new Audio('/sounds/NB-ring-notification.mp3'),
      startRecord: new Audio('/sounds/start-record.mp3'),
      endRecord: new Audio('/sounds/end-record.mp3')
    };

    // Configure sounds
    this.sounds.callRing.loop = true;
    this.sounds.incomingCall.loop = true;
    
    // Preload all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.preload = 'auto';
      sound.load();
    });
  }

  play(soundName) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.log('Sound play error:', err));
      }
    }
  }

  stop(soundName) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  stopAll() {
    Object.values(this.sounds).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }
}

export default new SoundManager();
