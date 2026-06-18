/**
 * FUENTE ÚNICA DE VERDAD (ESTADO)
 */
const state = {
    pairsCount: 8,
    cards: [],        // Arreglo de objetos { id, value, isFlipped, isMatched }
    selectedCards: [], // Índices de las cartas seleccionadas en el turno actual
    moves: 0,
    isBlocked: false,
    isVictory: false,
    bestScore: localStorage.getItem('best_score') ? parseInt(localStorage.getItem('best_score')) : null
};

// Banco de datos (emojis para el contenido visual)
const EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍒', '🍓', '🍍', '🥥', '🥑', '🍋', '🍑', '🥝'];

/**
 * ELEMENTOS DEL DOM
 */
const nodes = {
    board: document.getElementById('game-board'),
    movesCounter: document.getElementById('moves-counter'),
    bestScore: document.getElementById('best-score'),
    difficulty: document.getElementById('difficulty'),
    resetBtn: document.getElementById('reset-btn'),
    victoryMessage: document.getElementById('victory-message'),
    finalMoves: document.getElementById('final-moves')
};

/**
 * MUTACIONES DEL ESTADO Y LÓGICA DE NEGOCIO
 */
function initGame() {
    state.pairsCount = parseInt(nodes.difficulty.value);
    state.moves = 0;
    state.isBlocked = false;
    state.isVictory = false;
    state.selectedCards = [];
    
    // Seleccionar subconjunto de emojis y duplicarlos para crear parejas
    const selectedEmojis = EMOJIS.slice(0, state.pairsCount);
    const pool = [...selectedEmojis, ...selectedEmojis];
    
    // Barajado Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    // Mapear al estado estructurado
    state.cards = pool.map((value, index) => ({
        id: index,
        value: value,
        isFlipped: false,
        isMatched: false
    }));

    render();
}

function handleCardSelection(cardIndex) {
    const card = state.cards[cardIndex];

    // GURDIAS/BLINDAJE: Rompe la ejecución inmediatamente si la acción es inválida
    if (state.isBlocked) return; 
    if (card.isFlipped || card.isMatched) return;
    if (state.selectedCards.includes(cardIndex)) return; 

    // Mutación: Voltear carta elegida
    card.isFlipped = true;
    state.selectedCards.push(cardIndex);
    render();

    // Si hay dos cartas seleccionadas, evaluar la pareja
    if (state.selectedCards.length === 2) {
        evaluateTurn();
    }
}

function evaluateTurn() {
    state.moves++;
    const [index1, index2] = state.selectedCards;
    const card1 = state.cards[index1];
    const card2 = state.cards[index2];

    if (card1.value === card2.value) {
        // Coincidencia: mutación inmediata en el estado
        card1.isMatched = true;
        card2.isMatched = true;
        state.selectedCards = [];
        checkVictoryCondition();
        render();
    } else {
        // Discordancia: se activa el estado de bloqueo en la fuente de verdad
        state.isBlocked = true;
        render();

        setTimeout(() => {
            // Pasado el retardo, revertimos estado y desbloqueamos
            card1.isFlipped = false;
            card2.isFlipped = false;
            state.selectedCards = [];
            state.isBlocked = false; // Desbloqueo seguro controlado por el estado
            render();
        }, 1000);
    }
}

function checkVictoryCondition() {
    const allMatched = state.cards.every(card => card.isMatched);
    if (allMatched) {
        state.isVictory = true;
        if (!state.bestScore || state.moves < state.bestScore) {
            state.bestScore = state.moves;
            localStorage.setItem('best_score', state.bestScore);
        }
    }
}

/**
 * RENDERIZADO SÍNCRONO (La UI es un espejo del estado)
 */
function render() {
    // 1. Renderizar estadísticas fijas
    nodes.movesCounter.textContent = state.moves;
    nodes.bestScore.textContent = state.bestScore ? state.bestScore : '-';
    
    // 2. Renderizar Mensaje de Victoria
    if (state.isVictory) {
        nodes.finalMoves.textContent = state.moves;
        nodes.victoryMessage.classList.remove('hidden');
    } else {
        nodes.victoryMessage.classList.add('hidden');
    }

    // 3. Renderizar el Tablero (Sin innerHTML reactivo destructivo)
    // Para optimizar el rendimiento, usamos un DocumentFragment
    const fragment = document.createDocumentFragment();
    
    // Ajustar columnas de la Grid según la dificultad de forma dinámica
    const columns = state.pairsCount <= 4 ? 4 : (state.pairsCount === 8 ? 4 : 6);
    nodes.board.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    state.cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.index = index; // Para la delegación de eventos

        // Aplicar clases basadas estrictamente en las propiedades del estado
        if (card.isFlipped) cardElement.classList.add('flipped');
        if (card.isMatched) cardElement.classList.add('matched');

        // Cara trasera
        const backFace = document.createElement('div');
        backFace.classList.add('card-face', 'card-back');
        backFace.textContent = '❓';

        // Cara delantera (Segura contra XSS usando textContent)
        const frontFace = document.createElement('div');
        frontFace.classList.add('card-face', 'card-front');
        frontFace.textContent = card.value;

        cardElement.appendChild(backFace);
        cardElement.appendChild(frontFace);
        fragment.appendChild(cardElement);
    });

    // Limpieza segura del nodo padre e inserción atómica
    nodes.board.textContent = '';
    nodes.board.appendChild(fragment);
}

/**
 * SISTEMA DE EVENTOS Y DELEGACIÓN
 */

// 1. Delegación de eventos en el Tablero (Un único listener para n cartas)
nodes.board.addEventListener('click', (event) => {
    // Buscamos si el click ocurrió dentro de un elemento con la clase .card
    const cardTarget = event.target.closest('.card');
    
    // Si el click no fue en una carta o el contenedor está vacío, ignorar
    if (!cardTarget) return;

    const cardIndex = parseInt(cardTarget.dataset.index, 10);
    handleCardSelection(cardIndex);
});

// 2. Evento 'change' para Selector de Dificultad
nodes.difficulty.addEventListener('change', () => {
    initGame();
});

// 3. Evento 'click' en botón de reinicio
nodes.resetBtn.addEventListener('click', () => {
    initGame();
});

// 4. Evento de teclado (keydown) para accesibilidad/reinicio rápido con la tecla 'R'
window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
        initGame();
    }
});

// Inicialización de la primera partida en la carga del script
initGame();