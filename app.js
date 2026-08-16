/* =========================================================
   Classroom Wheel of Names - Core Engine & Soundboard Logic
   ========================================================= */

// Color Palette for Slices - Vibrant & Cheerful Palette
const SLICE_COLORS = [
  '#0284c7', // Sky Blue
  '#f59e0b', // Amber Sun
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Bright Orange
  '#14b8a6', // Teal
  '#e11d48', // Crimson Rose
  '#84cc16', // Fresh Lime
  '#3b82f6', // Royal Blue
  '#d946ef'  // Fuchsia
];

// Default sample student names for new classroom
const DEFAULT_CLASSROOMS = {
  'ม.1/1': [
    '1. ด.ช.กิตติศักดิ์ เจริญสุข',
    '2. ด.ช.ณัฐภัทร วงศ์ษา',
    '3. ด.ช.ธนกฤต แสนสุข',
    '4. ด.ช.ปภังกร บุญมี',
    '5. ด.ช.วรเมธ คงไทย',
    '6. ด.ญ.กัญญาณัฐ ทองใบ',
    '7. ด.ญ.ชลธิชา สดใส',
    '8. ด.ญ.ณิชากร พุ่มพวง',
    '9. ด.ญ.ธัญญาพร แก้วมณี',
    '10. ด.ญ.พิมพกานต์ สมบูรณ์',
    '11. ด.ญ.วริศรา นามดี',
    '12. ด.ญ.อรัญญา รัตนชัย'
  ],
  'ม.2/3': [
    '1. นายกรวิชญ์ พัฒนา',
    '2. นายกิตติคุณ มีชัย',
    '3. นายชานนท์ มั่นคง',
    '4. นายธีรภัทร ชาญวิทย์',
    '5. น.ส.กมลวรรณ ดวงใจ',
    '6. น.ส.จิตราภรณ์ มงคล',
    '7. น.ส.ณัฐณิชา ศรีสุข',
    '8. น.ส.พิมพ์ชนก แก้วใส'
  ]
};

class WheelApp {
  constructor() {
    this.canvas = document.getElementById('wheelCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.namesTextarea = document.getElementById('namesTextarea');
    this.nameCountDisplay = document.getElementById('nameCount');
    this.historyCountDisplay = document.getElementById('historyCount');
    this.historyList = document.getElementById('historyList');
    this.durationInput = document.getElementById('spinDuration');
    this.durationValue = document.getElementById('durationValue');
    this.removeWinnerToggle = document.getElementById('removeWinnerToggle');
    this.pointer = document.getElementById('wheelPointer');

    // Music & Soundboard UI Elements
    this.spinMusicSelect = document.getElementById('spinMusicSelect');
    this.winMusicSelect = document.getElementById('winMusicSelect');
    this.volumeInput = document.getElementById('musicVolume');
    this.volumeValue = document.getElementById('volumeValue');
    this.previewSpinBtn = document.getElementById('previewSpinMusicBtn');
    this.previewWinBtn = document.getElementById('previewWinMusicBtn');
    this.customSpinAudioInput = document.getElementById('customSpinAudioInput');
    this.customWinAudioInput = document.getElementById('customWinAudioInput');
    this.customSpinAudioName = document.getElementById('customSpinAudioName');
    this.customWinAudioName = document.getElementById('customWinAudioName');

    // Modals & Controls
    this.winnerModal = document.getElementById('winnerModal');
    this.winnerNameDisplay = document.getElementById('winnerNameDisplay');
    this.addClassModal = document.getElementById('addClassModal');
    this.newClassNameInput = document.getElementById('newClassNameInput');
    this.classSelect = document.getElementById('classSelect');

    // Audio & State
    this.soundEnabled = true;
    this.volume = 0.8;
    this.audioCtx = null;
    this.isSpinning = false;
    this.currentAngle = 0;
    this.names = [];
    this.history = [];
    this.currentWinner = null;
    this.lastTickIndex = -1;

    // Music playback state
    this.activeSpinAudio = null;
    this.activeWinAudio = null;
    this.activeSynthNodes = [];
    this.activeSynthInterval = null;
    this.customSpinAudioUrl = null;
    this.customWinAudioUrl = null;
    this.isPreviewingSpin = false;
    this.isPreviewingWin = false;

    // Load data from LocalStorage
    this.loadState();
    this.initAudio();
    this.bindEvents();
    this.resizeCanvas();
    this.updateNamesFromTextarea();
    this.render();
  }

  // Initialize Web Audio API for synthetic, zero-latency sounds
  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Tick sound when passing slices
  playTickSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      this.resumeAudio();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.04);

      const vol = this.volume * 0.35;
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);

      // Animate pointer on tick
      this.pointer.classList.remove('tick');
      void this.pointer.offsetWidth;
      this.pointer.classList.add('tick');
    } catch (e) {}
  }

  // ==========================================
  // Music Engine: Spin BGM (TikTok, Repo & Custom)
  // ==========================================
  startSpinMusic() {
    if (!this.soundEnabled) return;
    this.resumeAudio();

    const mode = this.spinMusicSelect.value;
    if (mode === 'ticks_only') return;

    // Handle HTML Audio Files (Repo Online or Custom Upload)
    let audioSrc = null;
    if (mode === 'repo_spin') {
      audioSrc = './audio/spin-music.mp3';
    } else if (mode === 'custom_spin' && this.customSpinAudioUrl) {
      audioSrc = this.customSpinAudioUrl;
    }

    if (audioSrc) {
      try {
        // Create audio element if not exists or if source changed
        if (!this.activeSpinAudio || this.activeSpinAudio.getAttribute('data-src') !== audioSrc) {
          if (this.activeSpinAudio) {
            this.activeSpinAudio.pause();
          }
          this.activeSpinAudio = new Audio(audioSrc);
          this.activeSpinAudio.setAttribute('data-src', audioSrc);
          this.activeSpinAudio.loop = true; // วนซ้ำเมื่อจบเพลง
        }

        this.activeSpinAudio.volume = this.volume;
        this.activeSpinAudio.loop = true;

        // เล่นต่อจากเดิม (ไม่รีเซ็ตเวลา)
        const playPromise = this.activeSpinAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('Audio autoplay prevented or file not found yet:', err);
          });
        }
      } catch (e) {}
      return;
    }

    // Web Audio Synthesizer Presets
    if (!this.audioCtx) return;

    if (mode === 'tiktok_edm') {
      // 128 BPM energetic electronic TikTok beat loop with bass & synth pulse
      const bpm = 128;
      const beatDuration = 60 / bpm;
      if (!this.synthStep) this.synthStep = 0;
      const bassNotes = [130.81, 146.83, 164.81, 196.00];
      const synthNotes = [523.25, 659.25, 783.99, 1046.50];

      const playStep = () => {
        if (!this.isSpinning && !this.isPreviewingSpin) return;
        const now = this.audioCtx.currentTime;

        if (this.synthStep % 2 === 0) {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          const rootFreq = bassNotes[(Math.floor(this.synthStep / 4)) % bassNotes.length];
          osc.frequency.setValueAtTime(rootFreq * 1.5, now);
          osc.frequency.exponentialRampToValueAtTime(rootFreq * 0.5, now + 0.15);

          gain.gain.setValueAtTime(this.volume * 0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        }

        const hihat = this.audioCtx.createOscillator();
        const hGain = this.audioCtx.createGain();
        hihat.type = 'triangle';
        const note = synthNotes[this.synthStep % synthNotes.length];
        hihat.frequency.setValueAtTime(note, now);
        hGain.gain.setValueAtTime(this.volume * 0.22, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        hihat.connect(hGain);
        hGain.connect(this.audioCtx.destination);
        hihat.start(now);
        hihat.stop(now + 0.12);

        this.synthStep++;
      };

      playStep();
      this.activeSynthInterval = setInterval(playStep, (beatDuration / 2) * 1000);
    } else if (mode === 'drumroll') {
      let rollStep = 0;
      const playRoll = () => {
        if (!this.isSpinning && !this.isPreviewingSpin) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220 + (rollStep % 10) * 15, now);
        gain.gain.setValueAtTime(this.volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        rollStep++;
      };
      playRoll();
      this.activeSynthInterval = setInterval(playRoll, 75);
    } else if (mode === 'arcade') {
      const arcadeNotes = [261.63, 329.63, 392.0, 523.25, 440.0, 349.23, 392.0, 523.25];
      let step = 0;
      const playArcade = () => {
        if (!this.isSpinning && !this.isPreviewingSpin) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(arcadeNotes[step % arcadeNotes.length], now);
        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        step++;
      };
      playArcade();
      this.activeSynthInterval = setInterval(playArcade, 120);
    }
  }

  stopSpinMusic(resetPosition = false) {
    if (this.activeSynthInterval) {
      clearInterval(this.activeSynthInterval);
      this.activeSynthInterval = null;
    }
    if (this.activeSpinAudio) {
      this.activeSpinAudio.pause(); // หยุดพักชั่วคราว ไม่ลบเวลา เพื่อให้เล่นต่อจากเดิม
      if (resetPosition) {
        this.activeSpinAudio.currentTime = 0;
      }
    }
    this.activeSynthNodes.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    this.activeSynthNodes = [];
  }

  // ==========================================
  // Music Engine: Victory / Celebration BGM
  // ==========================================
  playVictoryMusic() {
    if (!this.soundEnabled) return;
    this.stopVictoryMusic();
    this.resumeAudio();

    const mode = this.winMusicSelect.value;

    let audioSrc = null;
    if (mode === 'repo_win') {
      audioSrc = './audio/win-music.mp3';
    } else if (mode === 'custom_win' && this.customWinAudioUrl) {
      audioSrc = this.customWinAudioUrl;
    }

    if (audioSrc) {
      try {
        this.activeWinAudio = new Audio(audioSrc);
        this.activeWinAudio.volume = this.volume;
        this.activeWinAudio.play().catch(err => {
          console.log('Win audio playback note:', err);
        });
      } catch (e) {}
      return;
    }

    if (!this.audioCtx) return;

    if (mode === 'tiktok_party') {
      const chords = [
        [523.25, 659.25, 783.99],
        [587.33, 739.99, 880.00],
        [659.25, 830.61, 987.77],
        [1046.5, 1318.5, 1567.9]
      ];

      chords.forEach((chord, chordIdx) => {
        const startTime = this.audioCtx.currentTime + chordIdx * 0.22;
        chord.forEach(freq => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);

          const dur = chordIdx === chords.length - 1 ? 1.2 : 0.2;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.25, startTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + dur);
        });
      });
    } else if (mode === 'fanfare') {
      const notes = [
        { f: 523.25, d: 0.15, t: 0 },
        { f: 523.25, d: 0.15, t: 0.15 },
        { f: 523.25, d: 0.15, t: 0.30 },
        { f: 659.25, d: 0.35, t: 0.45 },
        { f: 523.25, d: 0.15, t: 0.80 },
        { f: 659.25, d: 0.15, t: 0.95 },
        { f: 783.99, d: 0.80, t: 1.10 },
        { f: 1046.50, d: 1.20, t: 1.90 }
      ];

      notes.forEach(n => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        const start = this.audioCtx.currentTime + n.t;
        osc.frequency.setValueAtTime(n.f, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(start);
        osc.stop(start + n.d);
      });
    } else if (mode === 'cute_pop') {
      const melody = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1318.51];
      melody.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        const start = this.audioCtx.currentTime + idx * 0.11;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this.volume * 0.32, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    }
  }

  stopVictoryMusic() {
    if (this.activeWinAudio) {
      this.activeWinAudio.pause();
      this.activeWinAudio.currentTime = 0;
      this.activeWinAudio = null;
    }
  }

  // Load and Save LocalStorage
  loadState() {
    // 1. Theme
    const savedTheme = localStorage.getItem('wheel_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    // 2. Classrooms
    const savedClasses = localStorage.getItem('wheel_classrooms');
    this.classrooms = savedClasses ? JSON.parse(savedClasses) : DEFAULT_CLASSROOMS;

    const savedCurrentClass = localStorage.getItem('wheel_current_class') || Object.keys(this.classrooms)[0];
    this.populateClassSelect(savedCurrentClass);

    // 3. History
    const savedHistory = localStorage.getItem('wheel_history');
    this.history = savedHistory ? JSON.parse(savedHistory) : [];
    this.renderHistory();

    // 4. Spin Duration & Remove Winner setting
    const savedDuration = localStorage.getItem('wheel_spin_duration') || '6';
    this.durationInput.value = savedDuration;
    this.durationValue.textContent = savedDuration;

    const savedAutoRemove = localStorage.getItem('wheel_auto_remove') === 'true';
    this.removeWinnerToggle.checked = savedAutoRemove;

    // 5. Volume & Music Presets
    const savedVolume = localStorage.getItem('wheel_music_volume') || '80';
    this.volumeInput.value = savedVolume;
    this.volumeValue.textContent = savedVolume;
    this.volume = parseInt(savedVolume, 10) / 100;

    const savedSpinMusic = localStorage.getItem('wheel_spin_music') || 'tiktok_edm';
    this.spinMusicSelect.value = savedSpinMusic;

    const savedWinMusic = localStorage.getItem('wheel_win_music') || 'tiktok_party';
    this.winMusicSelect.value = savedWinMusic;
  }

  saveClasses() {
    localStorage.setItem('wheel_classrooms', JSON.stringify(this.classrooms));
  }

  saveHistory() {
    localStorage.setItem('wheel_history', JSON.stringify(this.history));
  }

  populateClassSelect(selectedClass) {
    this.classSelect.innerHTML = '';
    const classNames = Object.keys(this.classrooms);
    if (classNames.length === 0) {
      this.classrooms['ห้องเรียนของฉัน'] = DEFAULT_CLASSROOMS['ม.1/1'];
      classNames.push('ห้องเรียนของฉัน');
    }

    classNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (name === selectedClass) option.selected = true;
      this.classSelect.appendChild(option);
    });

    const activeClass = this.classSelect.value;
    localStorage.setItem('wheel_current_class', activeClass);
    const names = this.classrooms[activeClass] || [];
    this.namesTextarea.value = names.join('\n');
  }

  bindEvents() {
    // Spin Buttons
    document.getElementById('centerSpinBtn').addEventListener('click', () => this.spin());
    document.getElementById('mainSpinBtn').addEventListener('click', () => this.spin());

    // Keyboard Shortcuts (Spacebar / Enter to spin, Esc to close modal)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if ((e.code === 'Space' || e.key === 'Enter') && !this.isSpinning) {
        e.preventDefault();
        this.spin();
      } else if (e.code === 'Escape') {
        this.closeModals();
      }
    });

    // Textarea input
    this.namesTextarea.addEventListener('input', () => {
      this.updateNamesFromTextarea();
      this.render();
    });

    // Shuffle Names
    document.getElementById('shuffleNamesBtn').addEventListener('click', () => {
      if (this.names.length <= 1) return;
      this.shuffleArray(this.names);
      this.namesTextarea.value = this.names.join('\n');
      this.updateNamesFromTextarea();
      this.render();
    });

    // Clear Names
    document.getElementById('clearNamesBtn').addEventListener('click', () => {
      if (confirm('คุณต้องการล้างรายชื่อนักเรียนทั้งหมดในห้องนี้หรือไม่?')) {
        this.namesTextarea.value = '';
        this.updateNamesFromTextarea();
        this.render();
      }
    });

    // Volume Slider
    this.volumeInput.addEventListener('input', (e) => {
      this.volumeValue.textContent = e.target.value;
      this.volume = parseInt(e.target.value, 10) / 100;
      localStorage.setItem('wheel_music_volume', e.target.value);
      if (this.activeSpinAudio) this.activeSpinAudio.volume = this.volume;
      if (this.activeWinAudio) this.activeWinAudio.volume = this.volume;
    });

    // Music Selector Events
    this.spinMusicSelect.addEventListener('change', (e) => {
      localStorage.setItem('wheel_spin_music', e.target.value);
      if (e.target.value === 'custom_spin' && !this.customSpinAudioUrl) {
        this.customSpinAudioInput.click();
      }
    });

    this.winMusicSelect.addEventListener('change', (e) => {
      localStorage.setItem('wheel_win_music', e.target.value);
      if (e.target.value === 'custom_win' && !this.customWinAudioUrl) {
        this.customWinAudioInput.click();
      }
    });

    // Custom Audio File Uploads
    this.customSpinAudioInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.customSpinAudioUrl = URL.createObjectURL(file);
        this.customSpinAudioName.style.display = 'block';
        this.customSpinAudioName.textContent = `🎵 ${file.name}`;
      }
    });

    this.customWinAudioInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.customWinAudioUrl = URL.createObjectURL(file);
        this.customWinAudioName.style.display = 'block';
        this.customWinAudioName.textContent = `🎵 ${file.name}`;
      }
    });

    // Preview Spin Music Button
    this.previewSpinBtn.addEventListener('click', () => {
      if (this.isPreviewingSpin) {
        this.stopSpinMusic();
        this.isPreviewingSpin = false;
        this.previewSpinBtn.textContent = '▶️ ลองฟัง';
      } else {
        this.stopSpinMusic();
        this.stopVictoryMusic();
        this.isPreviewingSpin = true;
        this.previewSpinBtn.textContent = '⏹️ หยุด';
        this.startSpinMusic();
        setTimeout(() => {
          if (this.isPreviewingSpin) {
            this.stopSpinMusic();
            this.isPreviewingSpin = false;
            this.previewSpinBtn.textContent = '▶️ ลองฟัง';
          }
        }, 5000);
      }
    });

    // Preview Win Music Button
    this.previewWinBtn.addEventListener('click', () => {
      if (this.isPreviewingWin) {
        this.stopVictoryMusic();
        this.isPreviewingWin = false;
        this.previewWinBtn.textContent = '▶️ ลองฟัง';
      } else {
        this.stopSpinMusic();
        this.stopVictoryMusic();
        this.isPreviewingWin = true;
        this.previewWinBtn.textContent = '⏹️ หยุด';
        this.playVictoryMusic();
        setTimeout(() => {
          this.isPreviewingWin = false;
          this.previewWinBtn.textContent = '▶️ ลองฟัง';
        }, 3500);
      }
    });

    // Duration Slider
    this.durationInput.addEventListener('input', (e) => {
      this.durationValue.textContent = e.target.value;
      localStorage.setItem('wheel_spin_duration', e.target.value);
    });

    // Remove Winner Toggle
    this.removeWinnerToggle.addEventListener('change', (e) => {
      localStorage.setItem('wheel_auto_remove', e.target.checked);
    });

    // Class selection change
    this.classSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      localStorage.setItem('wheel_current_class', selected);
      const names = this.classrooms[selected] || [];
      this.namesTextarea.value = names.join('\n');
      this.updateNamesFromTextarea();
      this.render();
    });

    // Add Class Modal
    document.getElementById('addClassBtn').addEventListener('click', () => {
      this.newClassNameInput.value = '';
      this.addClassModal.classList.add('active');
      this.newClassNameInput.focus();
    });

    document.getElementById('closeAddClassModalBtn').addEventListener('click', () => {
      this.addClassModal.classList.remove('active');
    });

    document.getElementById('cancelAddClassBtn').addEventListener('click', () => {
      this.addClassModal.classList.remove('active');
    });

    document.getElementById('confirmAddClassBtn').addEventListener('click', () => {
      const newName = this.newClassNameInput.value.trim();
      if (!newName) return alert('กรุณากรอกชื่อห้องเรียน');
      if (this.classrooms[newName]) return alert('มีห้องเรียนชื่อนี้อยู่แล้ว');

      this.classrooms[newName] = [];
      this.saveClasses();
      this.populateClassSelect(newName);
      this.addClassModal.classList.remove('active');
      this.namesTextarea.value = '';
      this.updateNamesFromTextarea();
      this.render();
    });

    // Delete Class
    document.getElementById('deleteClassBtn').addEventListener('click', () => {
      const currentClass = this.classSelect.value;
      const allClassNames = Object.keys(this.classrooms);
      if (allClassNames.length <= 1) {
        return alert('ต้องมีห้องเรียนอย่างน้อย 1 ห้อง');
      }
      if (confirm(`คุณต้องการลบห้อง "${currentClass}" ใช่หรือไม่?`)) {
        delete this.classrooms[currentClass];
        this.saveClasses();
        const nextClass = Object.keys(this.classrooms)[0];
        this.populateClassSelect(nextClass);
        this.updateNamesFromTextarea();
        this.render();
      }
    });

    // Clear History
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      if (confirm('คุณต้องการล้างประวัติการสุ่มทั้งหมดหรือไม่?')) {
        this.history = [];
        this.saveHistory();
        this.renderHistory();
      }
    });

    // Winner Modal Actions
    document.getElementById('closeWinnerModalBtn').addEventListener('click', () => this.closeModals());
    document.getElementById('keepWinnerBtn').addEventListener('click', () => this.closeModals());
    document.getElementById('removeWinnerBtn').addEventListener('click', () => {
      if (this.currentWinner) {
        this.removeStudent(this.currentWinner);
      }
      this.closeModals();
    });

    // Sound toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    soundToggleBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      soundIcon.textContent = this.soundEnabled ? '🔊' : '🔇';
      if (!this.soundEnabled) {
        this.stopSpinMusic();
        this.stopVictoryMusic();
      }
    });

    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('wheel_theme', newTheme);
      themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      this.render();
    });

    // Fullscreen toggle (Navbar)
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      this.toggleFullscreen(document.documentElement);
    });

    // Wheel Card Dedicated Fullscreen Toggle
    const wheelCard = document.getElementById('wheelCard');
    const wheelCardFullscreenBtn = document.getElementById('wheelCardFullscreenBtn');
    if (wheelCardFullscreenBtn) {
      wheelCardFullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen(wheelCard);
      });
    }

    // Fullscreen change listener to resize canvas
    document.addEventListener('fullscreenchange', () => {
      const isCardFs = document.fullscreenElement === wheelCard;
      if (wheelCardFullscreenBtn) {
        wheelCardFullscreenBtn.querySelector('.btn-text').textContent = isCardFs ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ';
        wheelCardFullscreenBtn.querySelector('.icon').textContent = isCardFs ? '🗗' : '⛶';
      }
      setTimeout(() => {
        this.resizeCanvas();
        this.render();
      }, 100);
    });

    // Resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  toggleFullscreen(element) {
    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  closeModals() {
    this.winnerModal.classList.remove('active');
    this.addClassModal.classList.remove('active');
    this.stopVictoryMusic();
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  updateNamesFromTextarea() {
    const raw = this.namesTextarea.value;
    this.names = raw
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    this.nameCountDisplay.textContent = this.names.length;

    // Save to current class in classroom storage
    const currentClass = this.classSelect.value;
    if (currentClass && this.classrooms) {
      this.classrooms[currentClass] = this.names;
      this.saveClasses();
    }
  }

  removeStudent(name) {
    const index = this.names.indexOf(name);
    if (index !== -1) {
      this.names.splice(index, 1);
      this.namesTextarea.value = this.names.join('\n');
      this.updateNamesFromTextarea();
      this.render();
    }
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, 600) * (window.devicePixelRatio || 1);
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 8;

    this.ctx.clearRect(0, 0, width, height);

    if (this.names.length === 0) {
      // Draw empty wheel placeholder
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#e0f2fe';
      this.ctx.fill();
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = '#bae6fd';
      this.ctx.stroke();

      this.ctx.fillStyle = '#0369a1';
      this.ctx.font = 'bold 18px Kanit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('กรุณาเพิ่มรายชื่อนักเรียน', centerX, centerY);
      this.ctx.restore();
      return;
    }

    const numSlices = this.names.length;
    const arc = (2 * Math.PI) / numSlices;

    // Draw slices
    for (let i = 0; i < numSlices; i++) {
      const sliceStartAngle = this.currentAngle + i * arc;
      const sliceEndAngle = sliceStartAngle + arc;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, sliceStartAngle, sliceEndAngle);
      this.ctx.closePath();

      // Background color
      this.ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      this.ctx.fill();

      // Border line
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.stroke();

      // Text on Slice (Aligned with needle at 0 radians)
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(sliceStartAngle + arc / 2);

      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = this.getOptimalFontSize(numSlices, radius);
      this.ctx.textBaseline = 'middle';

      // Trim long text with ellipsis
      let text = this.names[i];
      const maxTextWidth = radius - 55;
      if (this.ctx.measureText(text).width > maxTextWidth) {
        while (this.ctx.measureText(text + '...').width > maxTextWidth && text.length > 1) {
          text = text.substring(0, text.length - 1);
        }
        text += '...';
      }

      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(text, radius - 18, 0);
      this.ctx.restore();
    }

    // Outer wheel border circle
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.stroke();
  }

  getOptimalFontSize(count, radius) {
    if (count <= 6) return 'bold 20px Kanit, sans-serif';
    if (count <= 12) return 'bold 17px Kanit, sans-serif';
    if (count <= 24) return 'bold 15px Kanit, sans-serif';
    if (count <= 40) return 'bold 13px Kanit, sans-serif';
    return 'bold 11px Kanit, sans-serif';
  }

  spin() {
    if (this.isSpinning) return;
    if (this.names.length === 0) {
      alert('กรุณาเพิ่มรายชื่อนักเรียนก่อนเริ่มหมุน!');
      return;
    }

    this.isSpinning = true;
    this.resumeAudio();

    // Start selected Spin BGM (TikTok / Drumroll / Custom)
    this.startSpinMusic();

    // Update UI status badge
    const statusText = document.getElementById('wheelStatusText');
    const pulseDot = document.querySelector('.pulse-dot');
    if (statusText) statusText.textContent = 'กำลังสุ่ม...';
    if (pulseDot) pulseDot.classList.add('spinning');

    const durationSeconds = parseFloat(this.durationInput.value) || 6;
    const durationMs = durationSeconds * 1000;

    // Pick random winner index
    const winningIndex = Math.floor(Math.random() * this.names.length);
    const numSlices = this.names.length;
    const arc = (2 * Math.PI) / numSlices;

    // Pointer is located at 3 o'clock (0 radians / right side).
    // Target calculation:
    const targetSliceCenterOffset = (winningIndex * arc) + (arc / 2);
    const extraRotations = 7 + Math.floor(Math.random() * 3);
    
    const currentNormalized = (this.currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const targetNormalized = (2 * Math.PI - targetSliceCenterOffset) % (2 * Math.PI);
    
    let angleDiff = targetNormalized - currentNormalized;
    if (angleDiff < 0) {
      angleDiff += 2 * Math.PI;
    }

    const totalRotation = (extraRotations * 2 * Math.PI) + angleDiff;
    const startAngle = this.currentAngle;
    const finalAngle = startAngle + totalRotation;
    const startTime = performance.now();

    // Randomize spin personality (55% chance of suspenseful overshoot bounce-back)
    const willBounceBack = Math.random() < 0.55;
    const overshootRad = willBounceBack ? arc * (0.55 + Math.random() * 0.25) : 0;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Deceleration with randomized suspenseful overshoot and pull-back physics
      const currentWheelAngle = this.computeOvershootAngle(startAngle, totalRotation, overshootRad, progress);
      this.currentAngle = currentWheelAngle;

      // Calculate slice under pointer for realistic tick sound
      const normAngle = (2 * Math.PI - (this.currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) % (2 * Math.PI);
      const currentPointerIndex = Math.floor(normAngle / arc);

      if (currentPointerIndex !== this.lastTickIndex) {
        this.playTickSound();
        this.lastTickIndex = currentPointerIndex;
      }

      this.render();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Stop spin music
        this.stopSpinMusic();

        // Snap exactly to dead center of winning slice
        this.currentAngle = finalAngle;
        this.render();
        this.isSpinning = false;
        
        if (statusText) statusText.textContent = 'ได้ผู้โชคดีแล้ว!';
        if (pulseDot) pulseDot.classList.remove('spinning');

        this.onSpinComplete(this.names[winningIndex]);
      }
    };

    requestAnimationFrame(animate);
  }

  // Smooth deceleration easing with realistic spring overshoot and pull-back (if overshootRad > 0)
  computeOvershootAngle(startAngle, totalDelta, overshootRad, t) {
    if (t >= 1) return startAngle + totalDelta;
    if (t <= 0) return startAngle;

    const baseEase = 1 - Math.pow(1 - t, 4);
    let overshoot = 0;
    if (overshootRad > 0 && t > 0.65) {
      const localT = (t - 0.65) / 0.35;
      overshoot = Math.sin(localT * Math.PI) * Math.pow(1 - localT * 0.3, 2) * overshootRad;
    }

    return startAngle + (totalDelta * baseEase) + overshoot;
  }

  onSpinComplete(winner) {
    this.currentWinner = winner;

    // Play Victory Celebration BGM & trigger confetti
    this.playVictoryMusic();
    this.triggerConfetti();

    // Add to history
    this.history.unshift({
      name: winner,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });
    this.saveHistory();
    this.renderHistory();

    // Show winner celebration modal (Ensure 1 line auto-fit)
    this.winnerNameDisplay.textContent = winner;
    this.winnerNameDisplay.style.fontSize = '';
    if (winner.length > 30) {
      this.winnerNameDisplay.style.fontSize = '1.65rem';
    } else if (winner.length > 22) {
      this.winnerNameDisplay.style.fontSize = '2.0rem';
    } else if (winner.length > 15) {
      this.winnerNameDisplay.style.fontSize = '2.4rem';
    }
    this.winnerModal.classList.add('active');

    // Auto remove if toggled
    if (this.removeWinnerToggle.checked) {
      setTimeout(() => {
        this.removeStudent(winner);
      }, 500);
    }
  }

  triggerConfetti() {
    if (typeof confetti === 'function') {
      try {
        const targetContainer = document.fullscreenElement || document.body;
        let confettiCanvas = document.getElementById('activeConfettiCanvas');
        if (!confettiCanvas) {
          confettiCanvas = document.createElement('canvas');
          confettiCanvas.id = 'activeConfettiCanvas';
          confettiCanvas.style.position = 'fixed';
          confettiCanvas.style.inset = '0';
          confettiCanvas.style.width = '100vw';
          confettiCanvas.style.height = '100vh';
          confettiCanvas.style.pointerEvents = 'none';
          confettiCanvas.style.zIndex = '10001';
        }

        if (confettiCanvas.parentElement !== targetContainer) {
          targetContainer.appendChild(confettiCanvas);
        }

        const customConfetti = confetti.create(confettiCanvas, { resize: true, useWorker: true });
        const count = 200;
        const defaults = { origin: { y: 0.7 } };

        const fire = (particleRatio, opts) => {
          customConfetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
          }));
        };

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      } catch (e) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  }

  renderHistory() {
    this.historyCountDisplay.textContent = this.history.length;
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<div class="empty-history">ยังไม่มีรายชื่อที่ถูกสุ่ม</div>';
      return;
    }

    this.historyList.innerHTML = this.history
      .map((item, idx) => `
        <div class="history-item">
          <span><span class="order">#${this.history.length - idx}</span> ${item.name}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${item.time}</span>
        </div>
      `)
      .join('');
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.wheelApp = new WheelApp();
});
