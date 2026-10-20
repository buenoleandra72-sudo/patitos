# 🦆 DuckStrike: Juego de Coordinación Óculo-Manual y Motricidad Gruesa

Un juego interactivo desarrollado con **HTML5 Canvas**, **Web Audio API** y **Visión por Computadora (WebRTC)**, diseñado específicamente para fortalecer la **coordinación óculo-manual**, los **reflejos** y la **motricidad gruesa** en niños, adultos y sesiones de estimulación motriz o terapia ocupacional.

---

## 🚀 Cómo Iniciar el Juego (¡Muy Importante para la Cámara!)

Por seguridad estándar de los navegadores modernos (Google Chrome, Microsoft Edge, Firefox), **el acceso a la cámara web requiere ejecutarse en un entorno seguro (`localhost`)** y se bloquea si se abre simplemente haciendo doble clic en un archivo HTML (`file://`).

Para solucionar esto de forma instantánea:

### ▶️ Método Recomendado (Con Cámara y Cuerpo Habilitados):
1. Ve a la carpeta del juego: `c:\Users\Aprendiz\Desktop\Juego de patos`.
2. Haz doble clic en el archivo **`JUGAR.bat`**.
3. Se abrirá una ventanita que inicia un servidor local seguro y abrirá automáticamente tu navegador en `http://localhost:8080/`.
4. El navegador te preguntará: *"¿Permitir que localhost use tu cámara?"* 👉 Haz clic en **Permitir**.
5. ¡Listo! La cámara y el reconocimiento de cuerpo funcionarán al 100%.

> *(Si solo deseas jugar con ratón o tocando la pantalla táctil, puedes abrir directamente `index.html`).*

---

## 📹 Tutorial Paso a Paso: Cómo Jugar con el Cuerpo y la Cámara

### 1. 📏 Posición y Distancia
* **Distancia:** Colócate a **1.5 a 2 metros de distancia** de la pantalla o cámara web.
* **Encuadre:** Asegúrate de que en la cámara se vean claramente tu **cabeza, torso y brazos extendidos**.
* **Espacio libre:** Despeja un área de aproximadamente 2 metros cuadrados a tu alrededor para poder mover los brazos y agacharte sin obstáculos.

### 2. 💡 Iluminación y Contraste
* La fuente de luz (foco, ventana) debe estar **delante de ti o en el techo**, iluminando tu cuerpo.
* **Evita contraluces fuertes:** No te coloques de espaldas a una ventana muy soleada o lámpara potente, ya que la cámara te verá como una silueta oscura.
* Ropa con contraste: Si la pared de fondo es blanca, usar una camiseta de color ayuda a que la detección de movimiento sea aún más nítida.

### 3. ✨ Cómo Funciona el Movimiento ("Auras de Impacto")
* Cuando te muevas frente a la pantalla, el sistema detecta la velocidad y desplazamiento de tus brazos.
* En la pantalla aparecerán **Auras luminosas (círculos de energía radiante)** siguiendo la posición de tus manos y brazos en tiempo real.
* **Para derribar a un pato:** Simplemente mueve tu brazo hacia la dirección en la que vuela el pato para que tu aura de impacto lo toque. ¡Escucharás un simpático *¡Cuac!*, verás plumas volar y sumarás puntos!

### 4. 🎓 Calibrador y Pato de Práctica
* Dentro del juego, haz clic en el botón azul **"📹 Ver Tutorial & Calibrar Cámara"** o **"🎓 Tutorial Cámara"**.
* Podrás verte en tiempo real y practicar derribando a un **pato de prueba**.
* Cuando muevas los brazos y lo toques, verás el mensaje verde: **"¡IMPACTO DETECTADO! 🎉"**, lo que te confirmará que tu cámara y tu cuerpo están calibrados.

---

## 🌟 Modos de Juego y Adaptabilidad

### 1. 📷 Modo Cámara (Motricidad Gruesa)
* Ejercita grandes grupos musculares (hombros, brazos, cintura y piernas mediante flexiones).
* **Fondo Espejo:** Te ves a ti mismo superpuesto con el paisaje de patos para mejorar la propiocepción.
* **Barra de Actividad en Vivo:** En la esquina inferior derecha verás un medidor porcentual que indica la intensidad de tu movimiento físico.

### 2. 👆 Modo Táctil / Ratón / Pizarra Digital (Coordinación Óculo-Manual)
* Perfecto para pizarras digitales interactivas (Smartboards) en colegios o tablets de gran tamaño.
* Fomenta el alcance directo y la puntería manual.

### 3. 🎯 Dificultades Adaptativas
* **🟢 Iniciación / Terapia:** Patos gigantes y de vuelo lento, ideal para rehabilitación motriz o principiantes.
* **🟡 Estándar:** Velocidad balanceada y divertida.
* **🔴 Desafío:** Patos veloces para desafiar la velocidad de reacción.

### 4. 🦆 Tipos de Patos
* **Pato Clásico (Amarillo):** Vuelo equilibrado (+100 puntos).
* **Pato Gigante (Rosa):** Blanco grande para facilitar el alcance (+80 puntos).
* **Pato Veloz (Verde):** Ágil y rápido (+200 puntos).
* **Pato Dorado Especial:** Desprende estrellas brillantes y otorga **+3 segundos de tiempo extra** (+350 puntos).

---

## 🏃‍♂️ Beneficios Terapéuticos y Motores

| Ejercicio | Beneficio Clínico y Pedagógico |
| :--- | :--- |
| **Alcance cruzado (Cruzar la línea media)** | Estimula la integración interhemisférica cerebral al mover la mano derecha hacia el lado izquierdo de la pantalla. |
| **Amplitud articular de hombro y codo** | El rango completo de elevación y abducción de brazos fortalece la motricidad gruesa. |
| **Coordinación óculo-manual** | Sincronización temporal y espacial entre el rastreo visual del pato y el gesto motor de intercepción. |
| **Control postural y equilibrio** | Mantener la postura erguida y balancearse para alcanzar patos en diferentes alturas. |

---

## 🛠️ Tecnologías Empleadas

* **HTML5 Canvas:** Renderizado vectorial a 60 FPS adaptable a cualquier pantalla (Full HD, 4K).
* **WebRTC (`getUserMedia`):** Captura de video en tiempo real.
* **Algoritmo de Frame Differencing & Hotspot Clustering:** Detección de movimiento corporal sin librerías pesadas.
* **Web Audio API:** Síntesis sonora procedural (sonidos generados por código, sin archivos de audio externos).
* **PowerShell HTTP Listener (`server.ps1` / `JUGAR.bat`):** Servidor local seguro sin necesidad de instalar NodeJS ni Python.
