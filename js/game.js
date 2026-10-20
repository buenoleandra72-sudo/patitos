/**
 * DuckStrike: Juego interactivo para Coordinación Óculo-Manual y Motricidad Gruesa
 * Motor principal del juego con renderizado Canvas en tiempo real, física, partículas y modos adaptativos.
 */

class DuckGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Referencias a elementos del DOM
        this.overlayStart = document.getElementById('overlayStart');
        this.overlayGameOver = document.getElementById('overlayGameOver');
        this.btnStart = document.getElementById('btnStart');
        this.btnRestart = document.getElementById('btnRestart');
        this.btnFullscreen = document.getElementById('btnFullscreen');
        this.btnAudioToggle = document.getElementById('btnAudioToggle');
        this.cameraToggleContainer = document.getElementById('cameraToggleContainer');
        this.cameraFeedback = document.getElementById('cameraFeedback');
        this.webcamPreview = document.getElementById('webcamPreview');

        // HUD
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.ducksHitDisplay = document.getElementById('ducksHitDisplay');
        this.streakDisplay = document.getElementById('streakDisplay');

        // Banner de lateralidad (Izquierda / Derecha)
        this.lateralBanner = document.getElementById('lateralBanner');
        this.lateralEmoji = document.getElementById('lateralEmoji');
        this.lateralSide = document.getElementById('lateralSide');
        this.lateralMessage = document.getElementById('lateralMessage');
        this.lateralTimeout = null;

        // Configuración y estado
        this.controlMode = 'camera'; // 'camera' o 'touch'
        this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
        this.gameDuration = 30; // 30 segundos predefinidos
        this.mirrorBackground = true;

        this.isPlaying = false;
        this.score = 0;
        this.ducksHit = 0;
        this.shotsAttempted = 0;
        this.currentStreak = 0;
        this.maxStreak = 0;
        this.timeLeft = 30;
        this.timerInterval = null;
        this.motionEventsCount = 0;

        // Entidades
        this.ducks = [];
        this.particles = [];
        this.floatingTexts = [];
        this.clouds = [];
        this.waterRipples = [];

        // Temporizador de generación de patos
        this.lastSpawnTime = 0;
        this.spawnInterval = 1400; // ms

        // Instancia de detección de movimiento
        this.motionDetector = new MotionDetector();

        // Control de tiempo para requestAnimationFrame
        this.lastTime = 0;

        // Tutorial y Calibración interactiva
        this.tutorialModal = document.getElementById('modalTutorial');
        this.practiceCanvas = document.getElementById('practiceCanvas');
        this.practiceCtx = this.practiceCanvas ? this.practiceCanvas.getContext('2d') : null;
        this.isTutorialOpen = false;
        this.practiceDuck = {
            x: 240,
            y: 110,
            radius: 46,
            hit: false,
            color: '#FFD700',
            wingPhase: 0,
            resetTime: 0
        };

        this.initEventListeners();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initClouds();

        // Ciclo de animación
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Ajusta el tamaño del canvas al contenedor real
     */
    resize() {
        this.width = this.canvas.parentElement.clientWidth;
        this.height = this.canvas.parentElement.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    /**
     * Inicializa nubes del cielo de fondo
     */
    initClouds() {
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * (this.width || 800),
                y: 30 + Math.random() * 160,
                speed: 10 + Math.random() * 20,
                scale: 0.6 + Math.random() * 0.8
            });
        }
    }

    /**
     * Configuración de eventos de UI y clics/toques
     */
    initEventListeners() {
        // Selector de Modo de Control
        document.querySelectorAll('input[name="controlMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.controlMode = e.target.value;
                this.updateControlModeUI();
            });
        });

        // Selector de Dificultad
        document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.difficulty = e.target.value;
                this.applyDifficultySettings();
            });
        });

        // Selector de Tiempo
        document.querySelectorAll('input[name="duration"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gameDuration = parseInt(e.target.value, 10);
            });
        });

        // Selector de Sensibilidad de cámara
        const sensitivitySelect = document.getElementById('cameraSensitivity');
        if (sensitivitySelect) {
            sensitivitySelect.addEventListener('change', (e) => {
                this.motionDetector.setSensitivity(e.target.value);
            });
        }

        // Toggle espejo en fondo
        const mirrorToggle = document.getElementById('toggleMirrorBg');
        if (mirrorToggle) {
            mirrorToggle.addEventListener('change', (e) => {
                this.mirrorBackground = e.target.checked;
            });
        }

        // Botón Iniciar
        this.btnStart.addEventListener('click', () => {
            window.gameSounds.init();
            this.startGame();
        });

        // Botón Reiniciar
        this.btnRestart.addEventListener('click', () => {
            this.overlayGameOver.classList.add('hidden');
            this.overlayStart.classList.remove('hidden');
        });

        // Pantalla completa
        this.btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        // Audio Mute/Unmute
        this.btnAudioToggle.addEventListener('click', () => {
            const isEnabled = window.gameSounds.toggleMute();
            this.btnAudioToggle.innerHTML = isEnabled ? '🔊 Sonido' : '🔇 Silencio';
            this.btnAudioToggle.classList.toggle('muted', !isEnabled);
        });

        // Eventos de puntero / toque para Modo Táctil / Ratón
        const handlePointer = (e) => {
            if (!this.isPlaying) return;
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            this.handleDirectHit(x, y);
        };

        this.canvas.addEventListener('pointerdown', handlePointer);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handlePointer(e);
        }, { passive: false });

        // Verificación de protocolo file:// para advertir sobre la cámara
        if (window.location.protocol === 'file:') {
            const fileAlert = document.getElementById('fileProtocolAlert');
            if (fileAlert) fileAlert.classList.remove('hidden');
        }

        // Botones de Tutorial y Calibración
        const btnOpenTutorial = document.getElementById('btnOpenTutorial');
        const btnTutorialHud = document.getElementById('btnTutorialHud');
        const btnCloseTutorial = document.getElementById('btnCloseTutorial');
        const btnStartFromTutorial = document.getElementById('btnStartFromTutorial');

        if (btnOpenTutorial) btnOpenTutorial.addEventListener('click', () => this.openTutorial());
        if (btnTutorialHud) btnTutorialHud.addEventListener('click', () => this.openTutorial());
        if (btnCloseTutorial) btnCloseTutorial.addEventListener('click', () => this.closeTutorial());
        if (btnStartFromTutorial) btnStartFromTutorial.addEventListener('click', () => {
            this.closeTutorial();
            this.startGame();
        });
    }

    /**
     * Aplica parámetros según la dificultad elegida
     */
    applyDifficultySettings() {
        if (this.difficulty === 'easy') {
            this.spawnInterval = 1700;
        } else if (this.difficulty === 'hard') {
            this.spawnInterval = 1000;
        } else {
            this.spawnInterval = 1350;
        }
    }

    /**
     * Actualiza la UI según el modo de control (Cámara vs Táctil)
     */
    updateControlModeUI() {
        const cameraOptions = document.getElementById('cameraSettingsGroup');
        if (this.controlMode === 'camera') {
            if (cameraOptions) cameraOptions.classList.remove('hidden');
            if (this.cameraFeedback) this.cameraFeedback.classList.remove('hidden');
        } else {
            if (cameraOptions) cameraOptions.classList.add('hidden');
            if (this.cameraFeedback) this.cameraFeedback.classList.add('hidden');
        }
    }

    /**
     * Inicia una nueva partida
     */
    async startGame() {
        this.applyDifficultySettings();
        this.overlayStart.classList.add('hidden');
        this.overlayGameOver.classList.add('hidden');

        // Si se seleccionó modo cámara, iniciamos captura de video
        if (this.controlMode === 'camera') {
            const success = await this.motionDetector.start();
            if (!success) {
                alert(this.motionDetector.errorMessage || 'No se pudo acceder a la cámara. Jugando en Modo Táctil / Ratón.');
                this.controlMode = 'touch';
                const touchRadio = document.querySelector('input[name="controlMode"][value="touch"]');
                if (touchRadio) touchRadio.checked = true;
                this.updateControlModeUI();
            } else {
                if (this.webcamPreview) {
                    this.webcamPreview.srcObject = this.motionDetector.stream;
                    this.webcamPreview.play();
                }
            }
        } else {
            this.motionDetector.stop();
        }

        this.score = 0;
        this.ducksHit = 0;
        this.shotsAttempted = 0;
        this.currentStreak = 0;
        this.maxStreak = 0;
        this.motionEventsCount = 0;
        this.ducks = [];
        this.particles = [];
        this.floatingTexts = [];
        this.waterRipples = [];
        this.timeLeft = this.gameDuration;

        this.updateHUD();

        // Cuenta atrás auditiva
        window.gameSounds.playCountdown(false);
        setTimeout(() => window.gameSounds.playCountdown(false), 300);
        setTimeout(() => window.gameSounds.playCountdown(true), 600);

        this.isPlaying = true;
        this.lastSpawnTime = performance.now();

        // Temporizador de partida
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.gameDuration > 0) {
            this.timerInterval = setInterval(() => {
                if (!this.isPlaying) return;
                this.timeLeft--;
                this.updateHUD();

                if (this.timeLeft <= 5 && this.timeLeft > 0) {
                    window.gameSounds.playCountdown(false);
                }

                if (this.timeLeft <= 0) {
                    this.endGame();
                }
            }, 1000);
        }
    }

    /**
     * Finaliza la partida y muestra estadísticas adaptadas
     */
    endGame() {
        this.isPlaying = false;
        if (this.timerInterval) clearInterval(this.timerInterval);

        window.gameSounds.playVictory();

        // Calcular estadísticas
        const total = this.ducksHit;
        const accuracy = this.shotsAttempted > 0 ? Math.min(100, Math.round((total / this.shotsAttempted) * 100)) : 100;

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalDucks').textContent = this.ducksHit;
        document.getElementById('finalStreak').textContent = this.maxStreak;
        document.getElementById('finalAccuracy').textContent = `${accuracy}%`;

        // Medalla o felicitación adaptada a motricidad
        const feedbackMsg = document.getElementById('finalFeedback');
        if (this.ducksHit >= 20) {
            feedbackMsg.textContent = '🌟 ¡Excelente alcance y coordinación óculo-manual!';
        } else if (this.ducksHit >= 10) {
            feedbackMsg.textContent = '👏 ¡Gran trabajo motriz! Sigue ejercitando tus brazos y reflejos.';
        } else {
            feedbackMsg.textContent = '💪 ¡Buen esfuerzo! Cada intento fortalece tu control corporal.';
        }

        this.overlayGameOver.classList.remove('hidden');
    }

    /**
     * Actualiza los marcadores en pantalla
     */
    updateHUD() {
        this.scoreDisplay.textContent = this.score;
        this.ducksHitDisplay.textContent = this.ducksHit;
        this.streakDisplay.textContent = this.currentStreak;

        if (this.gameDuration > 0) {
            this.timerDisplay.textContent = `${this.timeLeft}s`;
            if (this.timeLeft <= 10) {
                this.timerDisplay.classList.add('urgent');
            } else {
                this.timerDisplay.classList.remove('urgent');
            }
        } else {
            this.timerDisplay.textContent = '∞ Libre';
            this.timerDisplay.classList.remove('urgent');
        }
    }

    /**
     * Genera un nuevo pato con propiedades basadas en dificultad
     */
    spawnDuck() {
        if (!this.isPlaying) return;

        // Limitar número máximo de patos simultáneos en pantalla
        const maxSimultaneous = this.difficulty === 'easy' ? 3 : (this.difficulty === 'hard' ? 6 : 4);
        const aliveDucks = this.ducks.filter(d => !d.hit).length;
        if (aliveDucks >= maxSimultaneous) return;

        const isLeft = Math.random() > 0.5;
        const types = ['normal', 'normal', 'fast', 'giant', 'golden'];
        
        // En modo fácil aumentamos probabilidad de patos gigantes
        let randType = types[Math.floor(Math.random() * types.length)];
        if (this.difficulty === 'easy') {
            randType = Math.random() > 0.4 ? 'giant' : 'normal';
        }

        let radius = 42;
        let speed = 2.2;
        let points = 100;
        let color = '#FFD700'; // Amarillo normal

        if (randType === 'giant') {
            radius = 64; // Gran objetivo para motricidad gruesa
            speed = 1.3;
            points = 80;
            color = '#FF8DA1'; // Rosa simpático
        } else if (randType === 'fast') {
            radius = 34;
            speed = 3.6;
            points = 200;
            color = '#4EBA6F'; // Verde ágil
        } else if (randType === 'golden') {
            radius = 38;
            speed = 2.8;
            points = 350;
            color = '#FFB300'; // Dorado especial
        }

        // Si dificultad es fácil reducimos velocidad general
        if (this.difficulty === 'easy') speed *= 0.75;
        if (this.difficulty === 'hard') speed *= 1.25;

        const startY = 80 + Math.random() * (this.height * 0.45);
        const startX = isLeft ? -radius * 2 : this.width + radius * 2;
        const vx = isLeft ? speed : -speed;

        this.ducks.push({
            id: Math.random().toString(),
            type: randType,
            x: startX,
            y: startY,
            initialY: startY,
            radius: radius,
            vx: vx,
            vy: (Math.random() - 0.5) * 0.8,
            facingRight: isLeft,
            color: color,
            points: points,
            hit: false,
            fallVy: 0,
            rotation: 0,
            wingPhase: Math.random() * Math.PI * 2,
            sineOffset: Math.random() * Math.PI * 2,
            aliveTime: 0
        });

        // Sonido de aleteo suave
        window.gameSounds.playFlap();
    }

    /**
     * Maneja el impacto por toque o clic de ratón
     */
    handleDirectHit(x, y) {
        this.shotsAttempted++;

        // Crear efecto de onda de agua o impacto en la posición tocada
        this.addClickRipple(x, y);

        let hitAny = false;
        // Comprobar colisión de adelante hacia atrás
        for (let i = this.ducks.length - 1; i >= 0; i--) {
            const duck = this.ducks[i];
            if (duck.hit) continue;

            const dist = Math.hypot(duck.x - x, duck.y - y);
            // Área de tolerancia generosa para favorecer la motricidad
            const hitZone = duck.radius * (this.difficulty === 'easy' ? 1.4 : 1.15);

            if (dist <= hitZone) {
                this.hitDuck(duck, x, y);
                hitAny = true;
                break; // Un impacto por toque
            }
        }

        if (!hitAny) {
            this.currentStreak = 0;
            this.updateHUD();
        }
    }

    /**
     * Maneja la detección de movimiento corporal sobre los patos
     */
    checkCameraMotionHits() {
        if (!this.isPlaying || this.controlMode !== 'camera' || !this.motionDetector.isActive) return;

        // Actualizar barra de actividad motriz en el HUD en tiempo real
        const actFill = document.getElementById('cameraActivityFill');
        const actLabel = document.getElementById('cameraActivityLabel');
        if (actFill && actLabel) {
            const level = this.motionDetector.globalActivityLevel;
            actFill.style.width = `${level}%`;
            actLabel.textContent = `Movimiento: ${level}%`;
        }

        for (const duck of this.ducks) {
            if (duck.hit) continue;

            const hasHit = this.motionDetector.checkDuckHit(duck.x, duck.y, duck.radius, this.width, this.height);
            if (hasHit) {
                this.motionEventsCount++;
                this.shotsAttempted++;
                this.hitDuck(duck, duck.x, duck.y);
            }
        }
    }

    /**
     * Ejecuta el derribo de un pato
     */
    hitDuck(duck, hitX, hitY) {
        duck.hit = true;
        duck.fallVy = -3; // Pequeño salto antes de caer
        this.ducksHit++;
        this.currentStreak++;
        if (this.currentStreak > this.maxStreak) {
            this.maxStreak = this.currentStreak;
        }

        let bonusPoints = duck.points;
        if (this.currentStreak >= 3) {
            bonusPoints += Math.floor(duck.points * (this.currentStreak * 0.2));
        }
        this.score += bonusPoints;

        // Sonidos
        window.gameSounds.playHit();
        window.gameSounds.playQuack(duck.type === 'giant' ? 0.8 : (duck.type === 'fast' ? 1.3 : 1.0));

        // Determinar posición en pantalla: Izquierda o Derecha
        const isLeft = duck.x < (this.width / 2);
        const sideText = isLeft ? 'Izquierda' : 'Derecha';
        const sideEmoji = isLeft ? '👈' : '👉';

        // Reproducir voz: "Izquierda / Derecha, ¡bien hecho!"
        this.speakFeedback(sideText);

        // Mostrar cartel visual de refuerzo de lateralidad y motivación
        this.showLateralFeedback(sideText, sideEmoji, isLeft);

        if (duck.type === 'golden') {
            window.gameSounds.playBonus();
            if (this.gameDuration > 0) {
                this.timeLeft += 3; // +3 segundos extra
                this.addFloatingText('+3s TIEMPO!', duck.x, duck.y - 40, '#FFD700');
            }
        }

        // Crear plumas y partículas
        this.spawnFeathers(duck.x, duck.y, duck.color);

        // Textos flotantes: dirección, felicitación y puntos
        this.addFloatingText(`${sideEmoji} ¡${sideText.toUpperCase()}!`, duck.x, duck.y - 25, isLeft ? '#38BDF8' : '#4ADE80');
        this.addFloatingText('¡BIEN HECHO! ⭐', duck.x, duck.y - 52, '#FDE047');

        let textMsg = `+${bonusPoints}`;
        if (this.currentStreak >= 5) {
            textMsg += ' ¡RACHA!';
        }
        this.addFloatingText(textMsg, duck.x, duck.y + 15, duck.type === 'golden' ? '#FFD700' : '#FFFFFF');

        this.updateHUD();
    }

    /**
     * Voz con síntesis de audio para decir Izquierda / Derecha y ¡Bien hecho!
     */
    speakFeedback(sideText) {
        if (!('speechSynthesis' in window) || !window.gameSounds.enabled) return;

        try {
            window.speechSynthesis.cancel(); // Cancelar locución previa para responder rápido
            const phrase = `${sideText}, ¡bien hecho!`;
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.lang = 'es-ES';
            utterance.rate = 1.25; // Ritmo ágil para juego interactivo
            utterance.pitch = 1.2; // Tono alegre y motivacional para estimulación motriz

            // Seleccionar voz en español si está disponible
            const voices = window.speechSynthesis.getVoices();
            const esVoice = voices.find(v => v.lang && (v.lang.startsWith('es') || v.lang.startsWith('ES')));
            if (esVoice) {
                utterance.voice = esVoice;
            }

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('SpeechSynthesis error:', e);
        }
    }

    /**
     * Muestra el cartel visual animado de lateralidad en pantalla
     */
    showLateralFeedback(sideText, sideEmoji, isLeft) {
        if (!this.lateralBanner) return;
        if (this.lateralTimeout) clearTimeout(this.lateralTimeout);

        if (this.lateralEmoji) this.lateralEmoji.textContent = sideEmoji;
        if (this.lateralSide) this.lateralSide.textContent = `¡${sideText.toUpperCase()}!`;
        if (this.lateralMessage) this.lateralMessage.textContent = '¡BIEN HECHO!';

        this.lateralBanner.className = `lateral-banner visible ${isLeft ? 'left-side' : 'right-side'}`;

        this.lateralTimeout = setTimeout(() => {
            if (this.lateralBanner) {
                this.lateralBanner.classList.remove('visible');
            }
        }, 1300);
    }

    /**
     * Genera partículas de plumas y destellos
     */
    spawnFeathers(x, y, color) {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                color: Math.random() > 0.3 ? color : '#FFFFFF',
                size: 6 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.2,
                alpha: 1,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.02
            });
        }
    }

    /**
     * Agrega texto flotante animado
     */
    addFloatingText(text, x, y, color = '#FFFFFF') {
        this.floatingTexts.push({
            text: text,
            x: x,
            y: y,
            alpha: 1.0,
            vy: -1.8,
            color: color
        });
    }

    /**
     * Onda visual de impacto
     */
    addClickRipple(x, y) {
        this.waterRipples.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: 40,
            alpha: 0.8
        });
    }

    /**
     * Bucle principal del juego (requestAnimationFrame)
     */
    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        // 1. Procesar detección de movimiento
        if (this.controlMode === 'camera' && this.motionDetector.isActive) {
            this.motionDetector.update();
            this.checkCameraMotionHits();
        }

        // 2. Generación automática de patos
        if (this.isPlaying && timestamp - this.lastSpawnTime > this.spawnInterval) {
            this.spawnDuck();
            this.lastSpawnTime = timestamp;
        }

        // 3. Actualizar físicas y estados
        this.updateEntities(dt, timestamp);

        // 4. Renderizar escena completa
        this.renderScene(timestamp);

        // 5. Si el tutorial está abierto, actualizar y renderizar el área de práctica
        if (this.isTutorialOpen) {
            this.updateAndRenderTutorial(timestamp);
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Abre el modal de Tutorial y Calibración
     */
    async openTutorial() {
        this.isTutorialOpen = true;
        if (this.tutorialModal) this.tutorialModal.classList.remove('hidden');
        window.gameSounds.init();

        const hint = document.getElementById('practiceHint');
        const badge = document.getElementById('practiceStatusBadge');

        // Intentar iniciar la cámara si no está encendida
        if (!this.motionDetector.isActive) {
            if (badge) {
                badge.className = 'status-badge waiting';
                badge.textContent = 'Iniciando cámara...';
            }
            const ok = await this.motionDetector.start();
            if (!ok) {
                if (hint) {
                    hint.innerHTML = '⚠️ No se pudo acceder a la cámara. Si abriste el archivo con doble clic, ejecuta <strong>JUGAR.bat</strong>.';
                }
                if (badge) {
                    badge.className = 'status-badge waiting';
                    badge.textContent = 'Cámara bloqueada';
                }
            } else {
                if (this.webcamPreview) {
                    this.webcamPreview.srcObject = this.motionDetector.stream;
                    this.webcamPreview.play();
                }
                if (badge) {
                    badge.className = 'status-badge waiting';
                    badge.textContent = 'Esperando movimiento...';
                }
            }
        }
    }

    /**
     * Cierra el modal de tutorial
     */
    closeTutorial() {
        this.isTutorialOpen = false;
        if (this.tutorialModal) this.tutorialModal.classList.add('hidden');
    }

    /**
     * Actualiza y renderiza el lienzo de calibración interactiva
     */
    updateAndRenderTutorial(timestamp) {
        if (!this.practiceCtx || !this.practiceCanvas) return;
        const pWidth = this.practiceCanvas.width;
        const pHeight = this.practiceCanvas.height;

        // Actualizar detector si está activo
        if (this.motionDetector.isActive) {
            this.motionDetector.update();
        }

        this.practiceCtx.clearRect(0, 0, pWidth, pHeight);

        // Fondo espejo de la cámara
        const video = this.motionDetector.video;
        if (this.motionDetector.isActive && video.readyState >= 2) {
            this.practiceCtx.save();
            this.practiceCtx.translate(pWidth, 0);
            this.practiceCtx.scale(-1, 1);
            this.practiceCtx.globalAlpha = 0.65;
            this.practiceCtx.drawImage(video, 0, 0, pWidth, pHeight);
            this.practiceCtx.restore();

            // Tinte de juego azulado
            this.practiceCtx.fillStyle = 'rgba(2, 132, 199, 0.25)';
            this.practiceCtx.fillRect(0, 0, pWidth, pHeight);
        } else {
            this.practiceCtx.fillStyle = '#1E293B';
            this.practiceCtx.fillRect(0, 0, pWidth, pHeight);
            this.practiceCtx.fillStyle = '#94A3B8';
            this.practiceCtx.font = '14px sans-serif';
            this.practiceCtx.textAlign = 'center';
            this.practiceCtx.fillText('Cámara apagada. Haz clic en "JUGAR.bat" o permite acceso.', pWidth / 2, pHeight / 2);
        }

        // Auras de movimiento en el canvas de práctica
        if (this.motionDetector.motionHotspots) {
            for (const spot of this.motionDetector.motionHotspots) {
                const spotX = spot.x * pWidth;
                const spotY = spot.y * pHeight;
                const spotRadius = spot.radiusNorm * Math.min(pWidth, pHeight);

                this.practiceCtx.save();
                const grad = this.practiceCtx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
                grad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
                grad.addColorStop(0.6, 'rgba(250, 204, 21, 0.45)');
                grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
                this.practiceCtx.fillStyle = grad;
                this.practiceCtx.beginPath();
                this.practiceCtx.arc(spotX, spotY, spotRadius, 0, Math.PI * 2);
                this.practiceCtx.fill();
                this.practiceCtx.restore();
            }
        }

        // Pato de práctica
        const duck = this.practiceDuck;
        duck.wingPhase += 0.12;

        if (!duck.hit && this.motionDetector.isActive) {
            for (const spot of this.motionDetector.motionHotspots) {
                const spotX = spot.x * pWidth;
                const spotY = spot.y * pHeight;
                const spotR = spot.radiusNorm * Math.min(pWidth, pHeight);
                const dist = Math.hypot(spotX - duck.x, spotY - duck.y);

                if (dist <= duck.radius + spotR) {
                    duck.hit = true;
                    duck.resetTime = timestamp + 1800;
                    window.gameSounds.playHit();
                    window.gameSounds.playQuack(1.0);

                    const isLeftPractice = duck.x < (pWidth / 2);
                    this.speakFeedback(isLeftPractice ? 'Izquierda' : 'Derecha');

                    const badge = document.getElementById('practiceStatusBadge');
                    if (badge) {
                        badge.className = 'status-badge success';
                        badge.textContent = '¡IMPACTO DETECTADO! 🎉';
                    }
                    const hint = document.getElementById('practiceHint');
                    if (hint) {
                        hint.innerHTML = '🌟 <strong>¡Excelente alcance!</strong> Tu movimiento fue detectado correctamente.';
                    }
                    break;
                }
            }
        } else if (duck.hit && timestamp > duck.resetTime) {
            duck.hit = false;
            const badge = document.getElementById('practiceStatusBadge');
            if (badge) {
                badge.className = 'status-badge waiting';
                badge.textContent = 'Esperando movimiento...';
            }
            const hint = document.getElementById('practiceHint');
            if (hint) {
                hint.innerHTML = '🎯 Mueve tus brazos para tocar al patito de prueba:';
            }
        }

        // Renderizar Pato en el centro de la práctica
        this.renderPracticeDuck(this.practiceCtx, duck.x, duck.y, duck.radius, duck.color, duck.hit, duck.wingPhase);
    }

    /**
     * Dibuja el pato de prueba para calibración
     */
    renderPracticeDuck(ctx, x, y, r, color, isHit, wingPhase) {
        ctx.save();
        ctx.translate(x, y);

        // Cuerpo
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(-r * 0.15, r * 0.1, r * 0.75, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Cabeza
        ctx.beginPath();
        ctx.arc(r * 0.45, -r * 0.35, r * 0.46, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pico
        ctx.fillStyle = '#FF7043';
        ctx.beginPath();
        ctx.moveTo(r * 0.8, -r * 0.42);
        ctx.lineTo(r * 1.35, -r * 0.3);
        ctx.lineTo(r * 0.8, -r * 0.18);
        ctx.closePath();
        ctx.fill();

        // Ojos
        if (!isHit) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(r * 0.55, -r * 0.45, r * 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.arc(r * 0.6, -r * 0.45, r * 0.08, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 3;
            const ex = r * 0.55;
            const ey = -r * 0.45;
            const s = r * 0.12;
            ctx.beginPath();
            ctx.moveTo(ex - s, ey - s);
            ctx.lineTo(ex + s, ey + s);
            ctx.moveTo(ex + s, ey - s);
            ctx.lineTo(ex - s, ey + s);
            ctx.stroke();
        }

        // Ala
        const wingFlap = Math.sin(wingPhase);
        const wingYOffset = isHit ? 0 : wingFlap * (r * 0.35);
        ctx.fillStyle = '#FBC02D';
        ctx.beginPath();
        ctx.ellipse(-r * 0.15, r * 0.05 + wingYOffset, r * 0.45, r * 0.28, (wingFlap * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Actualiza posiciones de patos, nubes y partículas
     */
    updateEntities(dt, timestamp) {
        // Nubes
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed * dt;
            if (cloud.x > this.width + 120) {
                cloud.x = -120;
                cloud.y = 30 + Math.random() * 150;
            }
        }

        // Patos
        for (let i = this.ducks.length - 1; i >= 0; i--) {
            const duck = this.ducks[i];
            duck.aliveTime += dt;
            duck.wingPhase += dt * 14;

            if (!duck.hit) {
                duck.x += duck.vx;
                // Movimiento senoidal natural en vuelo
                duck.y = duck.initialY + Math.sin(duck.aliveTime * 3.5 + duck.sineOffset) * 25;

                // Eliminar si sale de los márgenes de la pantalla
                const isOutOfScreen = (duck.vx > 0 && duck.x > this.width + duck.radius * 2) ||
                                      (duck.vx < 0 && duck.x < -duck.radius * 2);
                if (isOutOfScreen) {
                    this.ducks.splice(i, 1);
                }
            } else {
                // Pato derribado cayendo con gravedad
                duck.fallVy += 16 * dt;
                duck.y += duck.fallVy * 35 * dt;
                duck.rotation += 0.12 * (duck.vx > 0 ? 1 : -1);

                // Si cae al agua/suelo
                const waterLine = this.height * 0.82;
                if (duck.y >= waterLine) {
                    window.gameSounds.playSplash();
                    this.addClickRipple(duck.x, waterLine);
                    this.ducks.splice(i, 1);
                }
            }
        }

        // Partículas (plumas)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 2.5 * dt; // Gravedad suave
            p.vx *= 0.98; // Resistencia del aire
            p.rotation += p.vRot;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Textos flotantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Ondas de agua
        for (let i = this.waterRipples.length - 1; i >= 0; i--) {
            const r = this.waterRipples[i];
            r.radius += 1.8;
            r.alpha -= 0.035;
            if (r.alpha <= 0 || r.radius >= r.maxRadius) {
                this.waterRipples.splice(i, 1);
            }
        }
    }

    /**
     * Dibuja todo en el Canvas
     */
    renderScene(timestamp) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Si está en Modo Cámara con Espejo activo, dibujar el video reflejado en el fondo
        if (this.controlMode === 'camera' && this.motionDetector.isActive && this.mirrorBackground) {
            this.renderCameraBackground();
        } else {
            this.renderCartoonBackground();
        }

        // 2. Ondas de agua
        this.renderRipples();

        // 3. Patos
        for (const duck of this.ducks) {
            this.renderDuck(duck);
        }

        // 4. Juncos y vegetación en primer plano
        this.renderForegroundReeds();

        // 5. Destellos y partículas de plumas
        this.renderParticles();

        // 6. Efecto visual de movimiento corporal (chispas donde el jugador se mueve)
        if (this.controlMode === 'camera' && this.motionDetector.isActive) {
            this.renderMotionSparks();
        }

        // 7. Textos flotantes (+100, etc.)
        this.renderFloatingTexts();
    }

    /**
     * Dibuja el fondo de la cámara como espejo interactivo con filtro cálido y estético
     */
    renderCameraBackground() {
        const video = this.motionDetector.video;
        if (video.readyState >= 2) {
            this.ctx.save();
            // Invertir horizontalmente para efecto espejo natural
            this.ctx.translate(this.width, 0);
            this.ctx.scale(-1, 1);
            this.ctx.globalAlpha = 0.55; // Semi-transparente para que el cielo y juego resalten
            this.ctx.drawImage(video, 0, 0, this.width, this.height);
            this.ctx.restore();

            // Capa suave de color para dar estética de juego infantil
            const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
            grad.addColorStop(0, 'rgba(80, 180, 255, 0.45)');
            grad.addColorStop(0.7, 'rgba(120, 220, 255, 0.3)');
            grad.addColorStop(1, 'rgba(40, 160, 220, 0.5)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            this.renderCartoonBackground();
        }
    }

    /**
     * Dibuja el fondo animado estilo caricatura (cielo, colinas, estanque)
     */
    renderCartoonBackground() {
        // Cielo degradado
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.75);
        skyGrad.addColorStop(0, '#56CCF2');
        skyGrad.addColorStop(1, '#D9F5FF');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Sol brillante
        this.ctx.save();
        this.ctx.fillStyle = '#FFE066';
        this.ctx.beginPath();
        this.ctx.arc(this.width * 0.85, 90, 52, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255, 224, 102, 0.25)';
        this.ctx.beginPath();
        this.ctx.arc(this.width * 0.85, 90, 75, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Nubes
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        for (const cloud of this.clouds) {
            this.drawCloud(cloud.x, cloud.y, cloud.scale);
        }

        // Colinas de fondo
        this.ctx.fillStyle = '#7AC142';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height * 0.78);
        this.ctx.quadraticCurveTo(this.width * 0.25, this.height * 0.65, this.width * 0.5, this.height * 0.78);
        this.ctx.quadraticCurveTo(this.width * 0.75, this.height * 0.68, this.width, this.height * 0.76);
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.fill();

        // Estanque de agua en la base
        const waterGrad = this.ctx.createLinearGradient(0, this.height * 0.8, 0, this.height);
        waterGrad.addColorStop(0, '#29B6F6');
        waterGrad.addColorStop(1, '#0288D1');
        this.ctx.fillStyle = waterGrad;
        this.ctx.fillRect(0, this.height * 0.8, this.width, this.height * 0.2);
    }

    /**
     * Dibuja una nube estilizada
     */
    drawCloud(x, y, scale) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
        this.ctx.arc(28, -10, 32, 0, Math.PI * 2);
        this.ctx.arc(60, 0, 24, 0, Math.PI * 2);
        this.ctx.arc(30, 10, 26, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Dibuja los juncos y plantas acuáticas de feria
     */
    renderForegroundReeds() {
        const waterY = this.height * 0.82;
        this.ctx.save();
        this.ctx.strokeStyle = '#388E3C';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        // Grupo de juncos a la izquierda
        const leftPositions = [20, 38, 55, 75, 95];
        leftPositions.forEach((rx, idx) => {
            const h = 50 + (idx % 3) * 20;
            this.ctx.beginPath();
            this.ctx.moveTo(rx, this.height);
            this.ctx.quadraticCurveTo(rx + 6, this.height - h * 0.6, rx + (idx % 2 === 0 ? 12 : -6), this.height - h);
            this.ctx.stroke();

            // Espiga marrón en la punta
            this.ctx.fillStyle = '#6D4C41';
            this.ctx.fillRect(rx + (idx % 2 === 0 ? 10 : -8), this.height - h - 16, 6, 18);
        });

        // Grupo de juncos a la derecha
        const rightPositions = [this.width - 25, this.width - 45, this.width - 68, this.width - 92];
        rightPositions.forEach((rx, idx) => {
            const h = 45 + (idx % 2) * 25;
            this.ctx.beginPath();
            this.ctx.moveTo(rx, this.height);
            this.ctx.quadraticCurveTo(rx - 8, this.height - h * 0.6, rx - (idx % 2 === 0 ? 10 : -5), this.height - h);
            this.ctx.stroke();

            this.ctx.fillStyle = '#6D4C41';
            this.ctx.fillRect(rx - (idx % 2 === 0 ? 12 : -3), this.height - h - 16, 6, 18);
        });

        this.ctx.restore();
    }

    /**
     * Dibuja un pato simpático con alas aleteando, ojos animados y pico
     */
    renderDuck(duck) {
        this.ctx.save();
        this.ctx.translate(duck.x, duck.y);
        this.ctx.rotate(duck.rotation);

        // Orientación izquierda/derecha
        const scaleX = duck.facingRight ? 1 : -1;
        this.ctx.scale(scaleX, 1);

        const r = duck.radius;

        // Aura especial para pato dorado
        if (duck.type === 'golden') {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 1. Cola de pato
        this.ctx.fillStyle = duck.color;
        this.ctx.beginPath();
        this.ctx.moveTo(-r * 0.7, 0);
        this.ctx.lineTo(-r * 1.15, -r * 0.3);
        this.ctx.lineTo(-r * 0.8, r * 0.2);
        this.ctx.closePath();
        this.ctx.fill();

        // 2. Cuerpo del pato (óvalo)
        this.ctx.beginPath();
        this.ctx.ellipse(-r * 0.15, r * 0.1, r * 0.75, r * 0.55, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        // 3. Cabeza
        this.ctx.beginPath();
        this.ctx.arc(r * 0.45, -r * 0.35, r * 0.46, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // 4. Pico naranja
        this.ctx.fillStyle = '#FF7043';
        this.ctx.beginPath();
        this.ctx.moveTo(r * 0.8, -r * 0.42);
        this.ctx.lineTo(r * 1.35, -r * 0.3);
        this.ctx.lineTo(r * 0.8, -r * 0.18);
        this.ctx.closePath();
        this.ctx.fill();

        // 5. Ojos
        if (!duck.hit) {
            // Ojo simpático despierto
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(r * 0.55, -r * 0.45, r * 0.15, 0, Math.PI * 2);
            this.ctx.fill();

            // Pupila negra
            this.ctx.fillStyle = '#111111';
            this.ctx.beginPath();
            this.ctx.arc(r * 0.6, -r * 0.45, r * 0.08, 0, Math.PI * 2);
            this.ctx.fill();

            // Brillo blanco en la pupila
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(r * 0.63, -r * 0.48, r * 0.03, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Ojo mareado en cruz "X" por haber sido derribado
            this.ctx.strokeStyle = '#222222';
            this.ctx.lineWidth = 3;
            const ex = r * 0.55;
            const ey = -r * 0.45;
            const s = r * 0.12;

            this.ctx.beginPath();
            this.ctx.moveTo(ex - s, ey - s);
            this.ctx.lineTo(ex + s, ey + s);
            this.ctx.moveTo(ex + s, ey - s);
            this.ctx.lineTo(ex - s, ey + s);
            this.ctx.stroke();
        }

        // 6. Ala animada
        const wingFlap = Math.sin(duck.wingPhase);
        const wingYOffset = duck.hit ? 0 : wingFlap * (r * 0.35);

        this.ctx.fillStyle = duck.type === 'golden' ? '#FFE082' : (duck.type === 'giant' ? '#FF6B8B' : '#FBC02D');
        this.ctx.beginPath();
        this.ctx.ellipse(-r * 0.15, r * 0.05 + wingYOffset, r * 0.45, r * 0.28, (wingFlap * 0.3), 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Dibuja partículas de plumas
     */
    renderParticles() {
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;

            // Forma alargada de pluma
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, p.size, p.size * 0.35, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    /**
     * Dibuja Auras de Impacto luminosas y chispas en las zonas donde la persona mueve los brazos
     */
    renderMotionSparks() {
        this.ctx.save();

        // 1. Auras de impacto luminosas en los puntos de movimiento del cuerpo/manos
        if (this.motionDetector.motionHotspots && this.motionDetector.motionHotspots.length > 0) {
            for (const spot of this.motionDetector.motionHotspots) {
                const screenX = spot.x * this.width;
                const screenY = spot.y * this.height;
                const auraRadius = spot.radiusNorm * Math.min(this.width, this.height);

                // Halo de energía radiante
                const auraGrad = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, auraRadius);
                auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
                auraGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.35)');
                auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');

                this.ctx.fillStyle = auraGrad;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, auraRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Anillo exterior brillante tipo onda expansiva
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, auraRadius * 0.75, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        // 2. Chispas de retroalimentación en movimiento fino
        const points = this.motionDetector.recentMotionPoints;
        if (points && points.length > 0) {
            for (const pt of points) {
                const screenX = pt.x * this.width;
                const screenY = pt.y * this.height;

                this.ctx.fillStyle = 'rgba(255, 235, 59, 0.85)';
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 6 + Math.random() * 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.restore();
    }

    /**
     * Dibuja ondas circulares de agua
     */
    renderRipples() {
        for (const r of this.waterRipples) {
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.4, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    /**
     * Dibuja los textos flotantes de puntuación
     */
    renderFloatingTexts() {
        this.ctx.save();
        this.ctx.font = 'bold 24px "Segoe UI", Fredoka, sans-serif';
        this.ctx.textAlign = 'center';

        for (const ft of this.floatingTexts) {
            this.ctx.globalAlpha = ft.alpha;
            this.ctx.fillStyle = ft.color;
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            this.ctx.shadowBlur = 6;
            this.ctx.fillText(ft.text, ft.x, ft.y);
        }
        this.ctx.restore();
    }
}

// Inicializar el juego cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    window.game = new DuckGame();
});
