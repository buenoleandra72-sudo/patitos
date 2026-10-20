/**
 * MotionDetector: Sistema Avanzado de Detección de Movimiento por Cámara Web
 * Diseñado para capturar gestos corporales de motricidad gruesa (brazos, manos, torso)
 * Convierte el movimiento físico en "Auras de Impacto" visibles en pantalla.
 */

class MotionDetector {
    constructor() {
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('autoplay', '');
        this.video.muted = true;

        // Resolución de muestreo para procesamiento en tiempo real (ultra rápido a 60 FPS)
        this.sampleWidth = 160;
        this.sampleHeight = 120;
        this.sampleCanvas = document.createElement('canvas');
        this.sampleCanvas.width = this.sampleWidth;
        this.sampleCanvas.height = this.sampleHeight;
        this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

        // Grilla espacial de detección (20 columnas x 15 filas)
        this.gridCols = 20;
        this.gridRows = 15;
        this.cellWidth = this.sampleWidth / this.gridCols;
        this.cellHeight = this.sampleHeight / this.gridRows;

        this.prevFrameData = null;
        this.stream = null;
        this.isActive = false;
        this.hasPermission = false;
        this.errorMessage = null;

        // Sensibilidad
        this.pixelDiffThreshold = 22;      // Umbral RGB para considerar que un pixel cambió
        this.cellMotionThreshold = 0.08;   // Porcentaje de píxeles activos para encender una celda
        this.globalActivityLevel = 0;      // 0 a 100% de movimiento corporal general

        // Hotspots (Auras de impacto generadas por el movimiento de brazos/manos)
        this.motionHotspots = [];
        this.recentMotionPoints = [];
        this.maxMotionPoints = 40;

        // Opciones de visualización
        this.showMirror = true;
    }

    /**
     * Verifica compatibilidad y solicita acceso a la cámara
     */
    async start() {
        if (this.isActive) return true;

        // 1. Diagnóstico de contexto seguro (localhost o HTTPS)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            let msg = 'Tu navegador no permite acceso a la cámara en este modo.';
            if (window.location.protocol === 'file:') {
                msg = 'Por seguridad del navegador, la cámara requiere ejecutarse en localhost.\n\n👉 Por favor, haz doble clic en el archivo "JUGAR.bat" en la carpeta del juego para iniciar el servidor local automático.';
            }
            this.errorMessage = msg;
            this.isActive = false;
            return false;
        }

        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(resolve);
                };
            });

            this.isActive = true;
            this.hasPermission = true;
            this.errorMessage = null;
            return true;
        } catch (err) {
            console.error('Error al iniciar la cámara:', err);
            this.isActive = false;
            this.hasPermission = false;

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                this.errorMessage = 'Permiso denegado: Haz clic en el ícono de cámara/candado en la barra de direcciones de tu navegador y selecciona "Permitir".';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                this.errorMessage = 'No se encontró ninguna cámara conectada en tu equipo.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                this.errorMessage = 'La cámara está siendo usada por otra aplicación (Zoom, Teams, Meet). Ciérrala e intenta de nuevo.';
            } else {
                this.errorMessage = `Error al conectar la cámara: ${err.message || 'Desconocido'}`;
            }
            return false;
        }
    }

    /**
     * Detiene la cámara web
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isActive = false;
        this.prevFrameData = null;
        this.motionHotspots = [];
        this.recentMotionPoints = [];
        this.globalActivityLevel = 0;
    }

    /**
     * Ajuste de sensibilidad para diferentes condiciones de luz y movilidad
     */
    setSensitivity(level) {
        if (level === 'alta') {
            this.pixelDiffThreshold = 16;
            this.cellMotionThreshold = 0.05;
        } else if (level === 'baja') {
            this.pixelDiffThreshold = 30;
            this.cellMotionThreshold = 0.14;
        } else {
            // normal
            this.pixelDiffThreshold = 22;
            this.cellMotionThreshold = 0.08;
        }
    }

    /**
     * Procesa cada fotograma y calcula las zonas de movimiento activo
     */
    update() {
        if (!this.isActive || this.video.readyState < 2) return;

        // Dibujar fotograma reflejado (efecto espejo natural)
        this.sampleCtx.save();
        this.sampleCtx.translate(this.sampleWidth, 0);
        this.sampleCtx.scale(-1, 1);
        this.sampleCtx.drawImage(this.video, 0, 0, this.sampleWidth, this.sampleHeight);
        this.sampleCtx.restore();

        const currentFrame = this.sampleCtx.getImageData(0, 0, this.sampleWidth, this.sampleHeight);
        const currentData = currentFrame.data;

        this.recentMotionPoints = [];
        this.motionHotspots = [];

        if (this.prevFrameData) {
            const prevData = this.prevFrameData.data;

            // Matriz para acumular píxeles en movimiento por celda
            const gridCounts = new Int16Array(this.gridCols * this.gridRows);
            const totalPixelsPerCell = (this.cellWidth * this.cellHeight) / 4; // Muestreo de 2x2
            let totalActivePixels = 0;

            const step = 2; // muestreo rápido y nítido
            for (let y = 0; y < this.sampleHeight; y += step) {
                const cellY = Math.min(this.gridRows - 1, Math.floor(y / this.cellHeight));
                const rowOffset = cellY * this.gridCols;

                for (let x = 0; x < this.sampleWidth; x += step) {
                    const idx = (y * this.sampleWidth + x) * 4;

                    const rDiff = Math.abs(currentData[idx] - prevData[idx]);
                    const gDiff = Math.abs(currentData[idx + 1] - prevData[idx + 1]);
                    const bDiff = Math.abs(currentData[idx + 2] - prevData[idx + 2]);
                    const avgDiff = (rDiff + gDiff + bDiff) / 3;

                    if (avgDiff > this.pixelDiffThreshold) {
                        const cellX = Math.min(this.gridCols - 1, Math.floor(x / this.cellHeight ? x / this.cellWidth : 0));
                        gridCounts[rowOffset + cellX]++;
                        totalActivePixels++;

                        if (this.recentMotionPoints.length < this.maxMotionPoints && Math.random() < 0.18) {
                            this.recentMotionPoints.push({
                                x: x / this.sampleWidth,
                                y: y / this.sampleHeight,
                                intensity: avgDiff
                            });
                        }
                    }
                }
            }

            // Calcular nivel global de actividad (0 a 100%)
            const totalSampled = (this.sampleWidth * this.sampleHeight) / 4;
            this.globalActivityLevel = Math.min(100, Math.round((totalActivePixels / totalSampled) * 500));

            // Agrupar celdas con alto movimiento en "Hotspots de Impacto"
            for (let cy = 0; cy < this.gridRows; cy++) {
                for (let cx = 0; cx < this.gridCols; cx++) {
                    const count = gridCounts[cy * this.gridCols + cx];
                    const ratio = count / totalPixelsPerCell;

                    if (ratio >= this.cellMotionThreshold) {
                        // Posición normalizada en pantalla [0..1]
                        const normX = (cx + 0.5) / this.gridCols;
                        const normY = (cy + 0.5) / this.gridRows;

                        this.motionHotspots.push({
                            x: normX,
                            y: normY,
                            strength: Math.min(1, ratio * 2.5),
                            radiusNorm: 0.085 // Radio de alcance normalizado (generoso para motricidad)
                        });
                    }
                }
            }
        }

        this.prevFrameData = currentFrame;
    }

    /**
     * Comprueba si algún Hotspot de movimiento corporal está tocando al pato
     * @param {number} duckX Coordenada X del pato en píxeles
     * @param {number} duckY Coordenada Y del pato en píxeles
     * @param {number} duckRadius Radio del pato en píxeles
     * @param {number} screenWidth Ancho de la pantalla
     * @param {number} screenHeight Alto de la pantalla
     * @returns {boolean} True si hubo contacto
     */
    checkDuckHit(duckX, duckY, duckRadius, screenWidth, screenHeight) {
        if (!this.isActive || this.motionHotspots.length === 0) return false;

        const duckNormX = duckX / screenWidth;
        const duckNormY = duckY / screenHeight;
        const duckNormRadius = (duckRadius * 1.35) / Math.min(screenWidth, screenHeight); // Margen de tolerancia amigable

        for (const spot of this.motionHotspots) {
            const dx = (spot.x - duckNormX) * (screenWidth / screenHeight);
            const dy = spot.y - duckNormY;
            const dist = Math.hypot(dx, dy);

            if (dist <= duckNormRadius + spot.radiusNorm) {
                return true;
            }
        }

        return false;
    }
}

window.MotionDetector = MotionDetector;
