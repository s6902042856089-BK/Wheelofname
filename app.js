/* =========================================================
   Classroom Wheel of Names - Core Engine & Logic
   ========================================================= */

// Color Palette for Slices
const SLICE_COLORS = [
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#a855f7'  // Purple
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

    // Modals & Controls
    this.winnerModal = document.getElementById('winnerModal');
    this.winnerNameDisplay = document.getElementById('winnerNameDisplay');
    this.addClassModal = document.getElementById('addClassModal');
    this.newClassNameInput = document.getElementById('newClassNameInput');
    this.classSelect = document.getElementById('classSelect');

    // Audio & State
    this.soundEnabled = true;
    this.audioCtx = null;
    this.isSpinning = false;
    this.currentAngle = 0; // In radians
    this.names = [];
    this.history = [];
    this.currentWinner = null;
    this.lastTickIndex = -1;

    // Load data from LocalStorage
    this.loadState();
    this.initAudio();
    this.bindEvents();
    this.resizeCanvas();
    this.updateNamesFromTextarea();
    this.render();
  }

  // Initialize Web Audio API for synthetic, zero-dependency sound effects
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

  playTickSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      this.resumeAudio();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);

      // Animate pointer on tick
      this.pointer.classList.remove('tick');
      void this.pointer.offsetWidth; // Trigger reflow
      this.pointer.classList.add('tick');
    } catch (e) {
      // Ignore audio errors
    }
  }

  playCelebrationSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      this.resumeAudio();
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major Arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + idx * 0.09);

        const startTime = this.audioCtx.currentTime + idx * 0.09;
        const duration = 0.45;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      // Ignore audio errors
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

    // Fullscreen toggle
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    });

    // Resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  closeModals() {
    this.winnerModal.classList.remove('active');
    this.addClassModal.classList.remove('active');
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
      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.fill();
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = '#cbd5e1';
      this.ctx.stroke();

      this.ctx.fillStyle = '#64748b';
      this.ctx.font = 'bold 18px Prompt, sans-serif';
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
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.stroke();

      // Text on Slice
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(sliceStartAngle + arc / 2);

      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = this.getOptimalFontSize(numSlices, radius);
      this.ctx.textBaseline = 'middle';

      // Trim long text with ellipsis
      let text = this.names[i];
      const maxTextWidth = radius - 60;
      if (this.ctx.measureText(text).width > maxTextWidth) {
        while (this.ctx.measureText(text + '...').width > maxTextWidth && text.length > 1) {
          text = text.substring(0, text.length - 1);
        }
        text += '...';
      }

      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(text, radius - 20, 0);
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
    if (count <= 6) return 'bold 19px Prompt, sans-serif';
    if (count <= 12) return 'bold 16px Prompt, sans-serif';
    if (count <= 24) return 'bold 14px Prompt, sans-serif';
    if (count <= 40) return 'bold 12px Prompt, sans-serif';
    return 'bold 10px Prompt, sans-serif';
  }

  spin() {
    if (this.isSpinning) return;
    if (this.names.length === 0) {
      alert('กรุณาเพิ่มรายชื่อนักเรียนก่อนเริ่มหมุน!');
      return;
    }

    this.isSpinning = true;
    this.resumeAudio();

    const durationSeconds = parseFloat(this.durationInput.value) || 6;
    const durationMs = durationSeconds * 1000;

    // Pick random winner index
    const winningIndex = Math.floor(Math.random() * this.names.length);
    const numSlices = this.names.length;
    const arc = (2 * Math.PI) / numSlices;

    // Pointer is at angle 0 (3 o'clock / right side).
    // Slices are drawn with slice 0 starting at currentAngle.
    // Winning slice center should end at angle 0.
    // (targetAngle + winningIndex * arc + arc/2) % 2PI == 0 (or multiple of 2PI)
    const extraRotations = 6 + Math.floor(Math.random() * 4); // 6 to 9 full spins
    const targetSliceOffset = (winningIndex * arc) + (arc * (0.2 + Math.random() * 0.6)); // landing inside the slice
    const totalRotation = (extraRotations * 2 * Math.PI) + (2 * Math.PI - targetSliceOffset) - (this.currentAngle % (2 * Math.PI));

    const startAngle = this.currentAngle;
    const finalAngle = startAngle + totalRotation;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Custom smooth deceleration cubic-bezier curve
      const easeOut = this.easeOutCubic(progress);
      this.currentAngle = startAngle + totalRotation * easeOut;

      // Calculate current slice under pointer for tick sound
      const normalizedAngle = (2 * Math.PI - (this.currentAngle % (2 * Math.PI))) % (2 * Math.PI);
      const currentPointerIndex = Math.floor(normalizedAngle / arc);

      if (currentPointerIndex !== this.lastTickIndex) {
        this.playTickSound();
        this.lastTickIndex = currentPointerIndex;
      }

      this.render();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.currentAngle = finalAngle;
        this.render();
        this.isSpinning = false;
        this.onSpinComplete(this.names[winningIndex]);
      }
    };

    requestAnimationFrame(animate);
  }

  // Smooth deceleration easing function
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  onSpinComplete(winner) {
    this.currentWinner = winner;

    // Play celebration sound & trigger confetti
    this.playCelebrationSound();
    this.triggerConfetti();

    // Add to history
    this.history.unshift({
      name: winner,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });
    this.saveHistory();
    this.renderHistory();

    // Show winner celebration modal
    this.winnerNameDisplay.textContent = winner;
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
      // Fire confetti bursts from both sides
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      const fire = (particleRatio, opts) => {
        confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio)
        }));
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
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
