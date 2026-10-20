/**
 * Audio Engine para el Juego de Patos
 * Utiliza Web Audio API para generar efectos de sonido y melodías
 * sintetizadas en tiempo real sin requerir archivos externos de audio.
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.5;
        this.initialized = false;

        // Música de fondo desde la carpeta de música ("Do - Mi - Sol - Canasta.mp3")
        this.bgMusic = new Audio('musica/Do - Mi - Sol - Canasta.mp3');
        this.bgMusic.loop = true;
        this.bgMusicBaseVolume = 0.35; // Nivel ideal para que no tape los efectos ni la voz
        this.bgMusic.volume = this.bgMusicBaseVolume;
        this.isMusicPlaying = false;
    }

    init() {
        if (!this.initialized) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.bgMusic) {
            this.bgMusic.volume = this.bgMusicBaseVolume * this.volume * 2;
        }
    }

    toggleMute() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            if (this.bgMusic) {
                this.bgMusic.pause();
            }
        } else {
            if (this.bgMusic && this.isMusicPlaying) {
                this.bgMusic.play().catch(() => {});
            }
        }
        return this.enabled;
    }

    /**
     * Reproduce la canción de fondo en bucle
     */
    playBgMusic() {
        if (!this.enabled || !this.bgMusic) return;
        this.init();
        this.bgMusic.volume = this.bgMusicBaseVolume * (this.volume * 2);
        this.bgMusic.play().then(() => {
            this.isMusicPlaying = true;
        }).catch(err => {
            console.log('Autoplay de música en espera de interacción:', err);
        });
    }

    /**
     * Pausa la canción de fondo (al terminar la ronda o entrar a menús)
     */
    pauseBgMusic() {
        if (this.bgMusic) {
            this.bgMusic.pause();
        }
    }

    /**
     * Reanuda la canción de fondo
     */
    resumeBgMusic() {
        if (this.enabled && this.bgMusic && this.isMusicPlaying) {
            this.bgMusic.play().catch(() => {});
        }
    }

    /**
     * Detiene y reinicia la canción de fondo
     */
    stopBgMusic() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
            this.isMusicPlaying = false;
        }
    }

    /**
     * Atenúa temporalmente la música de fondo para que la voz se entienda con total nitidez
     */
    duckBgMusic(durationMs = 1300) {
        if (!this.bgMusic || !this.isMusicPlaying || !this.enabled) return;
        const targetVol = this.bgMusicBaseVolume * (this.volume * 2);
        this.bgMusic.volume = Math.max(0.06, targetVol * 0.25);

        setTimeout(() => {
            if (this.bgMusic && this.isMusicPlaying && this.enabled) {
                this.bgMusic.volume = targetVol;
            }
        }, durationMs);
    }

    /**
     * Sonido de Graznido simpático (¡Cuac!)
     */
    playQuack(pitchMultiplier = 1.0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const baseFreq = 280 * pitchMultiplier;

        // Oscilador con forma de diente de sierra para timbre nasal tipo pato
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc2.type = 'triangle';

        // Modulación rápida de frecuencia tipo graznido
        osc.frequency.setValueAtTime(baseFreq * 1.3, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.22);

        osc2.frequency.setValueAtTime(baseFreq * 1.8, now);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + 0.2);

        // Filtro pasa banda para resonancia nasal de pico
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, now);
        filter.frequency.linearRampToValueAtTime(650, now + 0.2);
        filter.Q.value = 3.5;

        // Envolvente de volumen (ataque rápido, caída suave)
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.4 * this.volume, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.25);
        osc2.stop(now + 0.25);
    }

    /**
     * Sonido de impacto / acierto satisfactorio (Pop alegre)
     */
    playHit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.5 * this.volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    /**
     * Sonido de aleteo suave
     */
    playFlap() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.07);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    /**
     * Sonido de chapoteo en el agua al caer
     */
    playSplash() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(300, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    /**
     * Pato Dorado / Bonificación de estrellas
     */
    playBonus() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do alto
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + idx * 0.06;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.35 * this.volume, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.26);
        });
    }

    /**
     * Cuenta atrás (3, 2, 1, ¡A Jugar!)
     */
    playCountdown(isHigh = false) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isHigh ? 880 : 440, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3 * this.volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * Fanfarria de victoria / fin de ronda
     */
    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const chord = [
            { f: 523.25, t: 0.00, d: 0.15 }, // C5
            { f: 659.25, t: 0.15, d: 0.15 }, // E5
            { f: 783.99, t: 0.30, d: 0.15 }, // G5
            { f: 1046.50, t: 0.45, d: 0.40 } // C6
        ];

        const now = this.ctx.currentTime;
        chord.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + item.t;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.f, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.35 * this.volume, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + item.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + item.d + 0.05);
        });
    }
}

// Exportar instancia global
window.gameSounds = new SoundEffects();
