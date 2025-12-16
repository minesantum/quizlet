
// DOM Elements
const screens = {
    import: document.getElementById('import-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    importText: document.getElementById('import-text'),
    btnStart: document.getElementById('btn-start'),
    btnImportNav: document.getElementById('btn-import-nav'),
    flashcard: document.getElementById('flashcard'),
    cardFrontText: document.getElementById('card-front-text'),
    cardBackText: document.getElementById('card-back-text'),
    currentCount: document.getElementById('current-count'),
    totalCount: document.getElementById('total-count'),
    progressBar: document.getElementById('progress-bar'),
    btnKnown: document.getElementById('btn-known'),
    btnUnknown: document.getElementById('btn-unknown'),
    statKnown: document.getElementById('stat-known'),
    statUnknown: document.getElementById('stat-unknown'),
    btnRestartUnknown: document.getElementById('btn-restart-unknown'),
    btnRestartAll: document.getElementById('btn-restart-all'),
    btnNewImport: document.getElementById('btn-new-import')
};

// State
let allCards = [];
let queue = [];
let nextRoundQueue = [];
let knownCount = 0;
let unknownCount = 0; // Cumulative for stats
let currentCard = null;
let isFlipped = false;

// Event Listeners
elements.btnStart.addEventListener('click', handleStart);
elements.flashcard.addEventListener('click', handleFlip);
elements.btnKnown.addEventListener('click', () => handleChoice(true));
elements.btnUnknown.addEventListener('click', () => handleChoice(false));
elements.btnRestartAll.addEventListener('click', () => restart('all'));
elements.btnRestartUnknown.addEventListener('click', () => restart('unknown'));
elements.btnNewImport.addEventListener('click', () => showScreen('import'));
elements.btnImportNav.addEventListener('click', () => showScreen('import'));

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (!screens.game.classList.contains('active')) return;

    // Space or Enter to flip
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); // Prevent scrolling
        handleFlip();
    }

    // Arrow Left: I don't know
    if (e.code === 'ArrowLeft') {
        handleChoice(false);
    }

    // Arrow Right: I know
    if (e.code === 'ArrowRight') {
        handleChoice(true);
    }
});

// Functions
function showScreen(screenName) {
    // Hide all
    Object.values(screens).forEach(s => s.classList.remove('active'));
    // Show target
    screens[screenName].classList.add('active');

    // Toggle nav button
    if (screenName === 'import') {
        elements.btnImportNav.hidden = true;
    } else {
        elements.btnImportNav.hidden = false;
    }
}

function handleStart() {
    const text = elements.importText.value.trim();
    if (!text) return alert('Por favor ingresa algunas fichas.');

    const lines = text.split('\n');
    allCards = lines.map((line, index) => {
        // Find first comma
        const commaIndex = line.indexOf(',');
        if (commaIndex === -1) return null;

        const term = line.substring(0, commaIndex).trim();
        const def = line.substring(commaIndex + 1).trim();

        if (!term || !def) return null;

        return {
            id: index,
            term: term,
            definition: def
        };
    }).filter(card => card !== null);

    if (allCards.length === 0) return alert('No se encontraron fichas válidas. Asegúrate de usar el formato "Palabra, Definición"');

    startSession(allCards);
}

function startSession(cardsToPlay) {
    queue = [...cardsToPlay];
    // Shuffle queue for randomness? Or keep order? User didn't specify. 
    // Usually random is better for practice, but let's keep order for now or simple shuffle.
    // Let's shuffle to make it a "game".
    // shuffleArray(queue); 

    nextRoundQueue = [];
    knownCount = 0; // Reset session stats?
    // Wait, if restarting with unknown, we shouldn't reset "known" stat completely if we want to show total progress.
    // But for simplicity, let's treat each session as a run.

    updateProgress();
    loadNextCard();
    showScreen('game');
}

function loadNextCard() {
    if (queue.length === 0) {
        handleRoundEnd();
        return;
    }

    currentCard = queue.shift();
    isFlipped = false;
    elements.flashcard.classList.remove('flipped');

    // Slight delay to allow flip animation reset if needed, but here we just swap content
    elements.cardFrontText.innerText = currentCard.term;
    elements.cardBackText.innerText = currentCard.definition;

    updateProgress();
}

function handleFlip() {
    isFlipped = !isFlipped;
    if (isFlipped) {
        elements.flashcard.classList.add('flipped');
    } else {
        elements.flashcard.classList.remove('flipped');
    }
}

function handleChoice(known) {
    if (!currentCard || elements.flashcard.classList.contains('animating')) return;

    // Mark as animating to prevent double clicks
    elements.flashcard.classList.add('animating');

    // Add Slide Animation
    const animationClass = known ? 'slide-right' : 'slide-left';
    elements.flashcard.classList.add(animationClass);

    setTimeout(() => {
        elements.flashcard.classList.remove('animating', animationClass, 'flipped');
        isFlipped = false; // Reset flip state

        if (known) {
            knownCount++;
            // Do not add to next round
        } else {
            // unknownCount++; // This is effectively tracked by nextRoundQueue length
            nextRoundQueue.push(currentCard);
        }

        loadNextCard();
    }, 300); // Wait for CSS animation
}

function handleRoundEnd() {
    if (nextRoundQueue.length > 0) {
        // If there are unknown cards, do we restart immediately or ask?
        // User said: "se vuelve a preguntar al final".
        // This validates the "Round 2" logic.
        // Let's automatically start the next round with unknown cards?
        // OR show a notification?
        // Strict interpretation: "It asks again at the end".
        // It implies continuous play.
        queue = [...nextRoundQueue];
        nextRoundQueue = [];
        // Optional: Shuffle the unknowns
        // shuffleArray(queue);

        // Use a toast or small indicator that we are reviewing missed words?
        // For now, just continue silently or maybe flash a message.
        // Let's Continue.
        loadNextCard();
    } else {
        // Truly finished
        showResults();
    }
}

function showResults() {
    elements.statKnown.innerText = allCards.length; // If finished, you theoretically know them all eventually? 
    // Or should it show the stats of the FIRST round?
    // Simpler: Show total cards vs missed count (from the last round? or cumulative?)
    // Let's just show "Finished".
    // The stats box in HTML implies "Known" and "Unknown".
    // If we finished, Unknown is 0.

    elements.statKnown.innerText = allCards.length;
    elements.statUnknown.innerText = 0;

    showScreen('result');
}

function restart(mode) {
    if (mode === 'all') {
        startSession(allCards);
    } else if (mode === 'unknown') {
        // This button usually appears if we "gave up" or if we want to re-practice specific ones? 
        // But our logic forces you to finish.
        // Let's change the logic:
        // Result screen appears only when EVERYTHING IS CLEARED.
        // So this function is mainly for "Restart All".
        startSession(allCards);
    }
}

function updateProgress() {
    // Current count is: Total Initial - (Queue + NextRound) ? 
    // Or just simple 1/10 stepping?
    // Let's show Remaining.
    const remaining = queue.length + (currentCard ? 1 : 0);
    // This is tricky with loops.
    // Let's just show size of THIS round.
    // Actually typically: "Card X of Y".
    const totalInRound = queue.length + (currentCard ? 1 : 0) + nextRoundQueue.length + (knownCount - (allCards.length - (queue.length + nextRoundQueue.length + (currentCard ? 1 : 0))));
    // Allow it to depend on the queue size at start of round?
    // Simplify: Just show queue length.
    elements.currentCount.innerText = allCards.length - (queue.length + nextRoundQueue.length);
    elements.totalCount.innerText = allCards.length;

    // Update Bar
    const total = allCards.length;
    const completed = total - (queue.length + nextRoundQueue.length);
    const percent = total > 0 ? (completed / total) * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;
}

// Utils
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
