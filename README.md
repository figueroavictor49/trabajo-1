1.  **Falta de control de estado asíncrono:** La IA pretendía bloquear el tablero usando clases del DOM (ej. `board.classList.add('blocked')`) o variables booleanas sueltas. Esto permitía que clicks ultra rápidos durante el `setTimeout` corrompieran el arreglo de cartas volteadas, rompiendo el juego. Se corrigió centralizando `isBlocked` en el **estado único**.
2.  **Lectura de UI como Fuente de Verdad:** Para comparar si dos cartas eran iguales, la IA generó un `if (cardA.textContent === cardB.textContent)`. Esto acoplaba la lógica de negocio al DOM. Lo corregimos obligando a la app a comparar los datos puros del estado (`cardA.value === cardB.value`).
3.  **Vulnerabilidad XSS:** La IA utilizó alegremente `innerHTML` para renderizar dinámicamente las cartas y los mensajes de victoria, abriendo la puerta a inyecciones de código. Se reemplazó por completo con `createElement` y `textContent`.

---

## 2. Justificación de Decisiones de Diseño

### Decisión 1: Delegación de Eventos en el Contenedor Padre (`#game-board`)
En lugar de asentar un *listener* por cada una de las 16 o 24 cartas creadas, se implementó un único escuchador de eventos en el tablero contenedor. 
* **Por qué:** Al cambiar de dificultad, el tablero se borra y se regenera. Si tuviéramos *listeners* individuales, cada reinicio exigiría remover explícitamente los escuchadores viejos para evitar **fugas de memoria (*memory leaks*)**. 
* **Impacto:** Reducimos drásticamente el consumo de memoria en el navegador y simplificamos el ciclo de vida de la app. El contenedor padre intercepta el click, evalúa si proviene de una `.card` mediante `.closest()`, y extrae el índice de forma limpia.

### Decisión 2: Inmutabilidad del DOM y uso estricto de `textContent`
Se prohibió el uso de `innerHTML` tanto en la creación de las cartas como en el despliegue del mensaje de victoria (donde se inyecta el nombre del usuario o estadísticas).
* **Por qué:** `innerHTML` obliga al navegador a pausar la ejecución, parsear la cadena de texto como HTML y reconstruir el árbol del DOM, lo cual es ineficiente y peligroso. Si un atacante inyecta un string malicioso (ej. un tag `<img>` con un callback `onerror`), puede ejecutar scripts arbitrarios (XSS).
* **Impacto:** Al usar `document.createElement()` combinado con `textContent`, el navegador interpreta el contenido estrictamente como texto plano. Si un usuario intenta registrarse con código malicioso, este se imprimirá literalmente en pantalla en lugar de ejecutarse, garantizando seguridad absoluta.

---

## 3. Próximos Pasos: Mejoras con más tiempo

Si dispusiera de más tiempo para escalar el proyecto, la prioridad número uno sería la **Transición a un DOM Virtual o Renderizado por Diferencias (Diffing)**.

Actualmente, la función `render()` borra todo el contenido del tablero (`board.textContent = ''`) y reinserta un `DocumentFragment` completo cada vez que el estado cambia. Aunque es eficiente para 16 cartas, en tableros masivos esto genera un re-renderizado costoso de elementos que no han cambiado (como las cartas que ya estaban emparejadas). 

Implementaría un algoritmo de *diffing* simple para comparar el estado anterior con el nuevo, aplicando clases de CSS (`.flipped`, `.matched`) **únicamente** a los nodos del DOM que sufrieron mutaciones, optimizando al máximo el rendimiento de repintado (*repaint/reflow*) del navegador.
