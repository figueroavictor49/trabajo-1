/**
 * ESTADO ÚNICO Y CENTRALIZADO (Fuente de verdad)
 */
const state = {
    cartas: [
        { id: 0, emoji: '🍎', encontrada: false, volteada: false },
        { id: 1, emoji: '🍌', encontrada: false, volteada: false },
        // ... el resto de las cartas estructuradas
    ],
    indicesSeleccionados: [], // Reemplaza al arreglo 'volteadas'
    tableroBloqueado: false,   // Bloqueo explícito en el estado
    nombreJugador: "Usuario<script>alert('XSS')</script>" // Ejemplo de input malicioso
};

// Nodo contenedor del tablero en el DOM
const nodoTablero = document.getElementById('tablero');
const nodoVictoria = document.getElementById('mensaje-victoria');

/**
 * MANEJADOR DE EVENTOS (Usa DELEGACIÓN de eventos en el contenedor padre)
 */
nodoTablero.addEventListener('click', (event) => {
    // Buscar la carta más cercana al click mediante delegación
    const tarjetaElemento = event.target.closest('.carta');
    
    // Si el click no fue en una carta, o el tablero está bloqueado, ignorar
    if (!tarjetaElemento || state.tableroBloqueado) return;

    const indice = Number(tarjetaElemento.dataset.indice);
    procesarIntentoVolteo(indice);
});

/**
 * LÓGICA DE NEGOCIO Y MUTACIONES DE ESTADO
 */
function procesarIntentoVolteo(indice) {
    const cartaSeleccionada = state.cartas[indice];

    // --- CLÁUSULAS DE GUARDA (Solución al Bug Funcional) ---
    // 1. Previene que se vuelva a clickear una carta ya resuelta o ya volteada
    if (cartaSeleccionada.encontrada || cartaSeleccionada.volteada) return;
    
    // 2. Previene que la misma carta haga pareja consigo misma si se hace click rápido
    if (state.indicesSeleccionados.includes(indice)) return;

    // Mutación legítima del estado
    cartaSeleccionada.volteada = true;
    state.indicesSeleccionados.push(indice);
    
    // Sincronizar la UI inmediatamente tras voltear la primera o segunda carta
    render();

    // Evaluar si se ha completado un par
    if (state.indicesSeleccionados.length === 2) {
        evaluarPareja();
    }
}

function evaluarPareja() {
    const [idxA, idxB] = state.indicesSeleccionados;
    const cartaA = state.cartas[idxA];
    const cartaB = state.cartas[idxB];

    // SOLUCIÓN ARQUITECTURA: Compara usando el ESTADO, nunca leyendo el DOM
    if (cartaA.emoji === cartaB.emoji) {
        // Coincidencia: actualizar estado de inmediato
        cartaA.encontrada = true;
        cartaB.encontrada = true;
        state.indicesSeleccionados = [];
        verificarCondicionVictoria();
        render();
    } else {
        // No coinciden: activar bloqueo atómico desde el ESTADO
        state.tableroBloqueado = true;

        setTimeout(() => {
            // Revertir estados tras el delay
            cartaA.volteada = false;
            cartaB.volteada = false;
            state.indicesSeleccionados = [];
            state.tableroBloqueado = false; // Desbloqueo seguro controlado
            render();
        }, 800);
    }
}

function verificarCondicionVictoria() {
    const todasEncontradas = state.cartas.every(c => c.encontrada);
    if (todasEncontradas) {
        // SOLUCIÓN SEGURIDAD: Evitar innerHTML. Usar textContent y asignación segura.
        nodoVictoria.textContent = `¡Felicidades ${state.nombreJugador}! Has ganado el juego.`;
        nodoVictoria.classList.remove('oculto');
    }
}

/**
 * FUNCIÓN RENDER (La interfaz es un espejo puro del estado)
 */
function render() {
    // Usamos DocumentFragment por rendimiento, evitando mutar el DOM repetidamente en bucles
    const fragmento = document.createDocumentFragment();

    state.cartas.forEach((carta, i) => {
        const divCarta = document.createElement('div');
        divCarta.classList.add('carta');
        divCarta.dataset.indice = i; // Necesario para la delegación de eventos

        // Decidir qué mostrar basándose ESTRICTAMENTE en el estado
        if (carta.volteada || carta.encontrada) {
            divCarta.textContent = carta.emoji; // Seguro contra XSS
            divCarta.classList.add('revelada');
        } else {
            divCarta.textContent = '❓';
        }

        if (carta.encontrada) {
            divCarta.classList.add('pareja-encontrada');
        }

        fragmento.appendChild(divCarta);
    });

    // Limpieza atómica y renderizado limpio
    nodoTablero.textContent = '';
    nodoTablero.appendChild(fragmento);
}