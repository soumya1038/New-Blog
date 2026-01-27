// Sound Manager Utility
class SoundManager {
  constructor() {
    this.sounds = {};
    this.audioContext = null;
  }

  initSound(name, path) {
    if (!this.sounds[name]) {
      this.sounds[name] = new Audio(path);
      this.sounds[name].preload = 'auto';
      this.sounds[name].load();
    }
  }

  play(soundName) {
    const soundPaths = {
      notification: '/sounds/Receive-notification.mp3',
      sendMsg: '/sounds/Send-msg.mp3',
      receiveMsg: '/sounds/receive-msg.mp3',
      callRing: '/sounds/call-ring-sound.mp3',
      endCall: '/sounds/end-call.mp3',
      incomingCall: '/sounds/NB-ring-notification.mp3',
      startRecord: '/sounds/start-record.mp3',
      endRecord: '/sounds/end-record.mp3',
      bubbleTyping: '/sounds/bubble_typing.mp3',
      joinVideoCall: '/sounds/join_video_call.mp3',
      joinCall: '/sounds/start-record.mp3',
      leaveCall: '/sounds/success complite publish notification.mp3'
    };

    if (!soundPaths[soundName]) return;

    this.initSound(soundName, soundPaths[soundName]);
    const sound = this.sounds[soundName];
    
    if (sound) {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log(`Sound ${soundName} play error:`, err.message);
          // Try to play with user interaction
          document.addEventListener('click', () => {
            sound.play().catch(() => {});
          }, { once: true });
        });
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
      if (sound) {
        sound.pause();
        sound.currentTime = 0;
      }
    });
  }
}

export default new SoundManager();
