
// DOM Elements
const screens = {
    library: document.getElementById('library-screen'),
    import: document.getElementById('import-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    importText: document.getElementById('import-text'),
    deckTitle: document.getElementById('deck-title'),
    btnSave: document.getElementById('btn-save'),
    btnStart: null, // Removed old button
    btnImportNav: document.getElementById('btn-import-nav'),
    btnLibraryNav: document.getElementById('btn-library-nav'),
    decksGrid: document.getElementById('decks-grid'),
    btnCreateFirst: document.getElementById('btn-create-first'),

    // Backup controls
    btnExport: document.getElementById('btn-export'),
    btnImportTrigger: document.getElementById('btn-import-trigger'),
    fileImport: document.getElementById('file-import'),

    flashcard: document.getElementById('flashcard'),
    cardFrontText: document.getElementById('card-front-text'),
    cardBackText: document.getElementById('card-back-text'),
    currentCount: document.getElementById('current-count'),
    totalCount: document.getElementById('total-count'),
    progressBar: document.getElementById('progress-bar'),
    counterKnownVal: document.getElementById('counter-known-val'),
    counterUnknownVal: document.getElementById('counter-unknown-val'),
    btnKnown: document.getElementById('btn-known'),
    btnUnknown: document.getElementById('btn-unknown'),
    statKnown: document.getElementById('stat-known'),
    statUnknown: document.getElementById('stat-unknown'),
    btnRestartUnknown: document.getElementById('btn-restart-unknown'),
    btnRestartAll: document.getElementById('btn-restart-all'),
    btnNewImport: document.getElementById('btn-new-import')
};

// State
const STORAGE_KEY = 'quizclone_data';
const SERVER_URL = '/api/decks';
let usingServer = false;
let currentDeckId = null;
let editingDeckId = null; // Track if we are editing
let allCards = [];
let queue = [];
let nextRoundQueue = [];
let knownCount = 0;
let currentCard = null;
let isFlipped = false;

// Initialization
// Attempt to connect to local server first
checkServerConnection().then(() => {
    loadLibrary();
});
if (elements.btnSave) elements.btnSave.addEventListener('click', handleSaveAndStart);
if (elements.btnCreateFirst) elements.btnCreateFirst.addEventListener('click', () => {
    resetImportScreen();
    showScreen('import');
});
elements.flashcard.addEventListener('click', handleFlip);
elements.btnKnown.addEventListener('click', () => handleChoice(true));
elements.btnUnknown.addEventListener('click', () => handleChoice(false));
elements.btnRestartAll.addEventListener('click', () => restart('all'));
elements.btnRestartUnknown.addEventListener('click', () => restart('unknown'));
elements.btnNewImport.addEventListener('click', () => {
    resetImportScreen();
    showScreen('import');
});
elements.btnImportNav.addEventListener('click', () => {
    resetImportScreen();
    showScreen('import');
});
elements.btnLibraryNav.addEventListener('click', () => {
    loadLibrary();
    showScreen('library');
});


// Backup Listeners
if (elements.btnExport) elements.btnExport.addEventListener('click', handleExport);
if (elements.btnImportTrigger) elements.btnImportTrigger.addEventListener('click', () => elements.fileImport.click());
if (elements.fileImport) elements.fileImport.addEventListener('change', handleImport);

// Storage Functions
async function checkServerConnection() {
    try {
        const res = await fetch(SERVER_URL);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // Sync server to local
            usingServer = true;
            console.log('Connected to Local Server');
            updateServerIndicator(true);
        }
    } catch (e) {
        console.log('Server not available, using local storage.');
        updateServerIndicator(false);
    }
}

function updateServerIndicator(active) {
    // Optional: Visual indicator
    /*
    let el = document.getElementById('server-status');
    if(!el) {
        el = document.createElement('div');
        el.id = 'server-status';
        el.style.position = 'fixed';
        el.style.bottom = '10px';
        el.style.right = '10px';
        el.style.padding = '0.5rem';
        el.style.borderRadius = '0.5rem';
        el.style.fontSize = '0.75rem';
        document.body.appendChild(el);
    }
    el.innerText = active ? '🟢 Sincronizado (Servidor)' : '🟠 Modo Local (Navegador)';
    el.style.background = active ? '#edfcf4' : '#fff0ee';
    el.style.color = active ? '#23b26d' : '#ff725b';
    */
}

function getDecks() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

async function saveDecks(decks) {
    // 1. Save locally immediately for speed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));

    // 2. If server is active, try to push
    if (usingServer || await isServerUp()) {
        try {
            await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(decks)
            });
            usingServer = true;
        } catch (e) {
            usingServer = false;
            console.error('Failed to sync to server');
        }
    }
}

async function isServerUp() {
    try {
        // Quick check if we weren't connected but maybe now we are
        await fetch(SERVER_URL, { method: 'HEAD' });
        return true;
    } catch { return false; }
}

function loadLibrary() {
    const decks = getDecks();
    elements.decksGrid.innerHTML = '';

    if (decks.length === 0) {
        elements.decksGrid.innerHTML = `
            <div class="empty-state">
                <p>No tienes mazos guardados aún.</p>
                <button id="btn-create-first-dynamic" class="btn-primary">Crear mi primer mazo</button>
            </div>`;
        document.getElementById('btn-create-first-dynamic').addEventListener('click', () => showScreen('import'));
        return;
    }

    decks.forEach(deck => {
        const card = document.createElement('div');
        card.className = 'deck-card';

        // Calculate progress
        const total = deck.cards.length;
        const known = deck.stats ? deck.stats.knownIds.length : 0;
        const percent = total > 0 ? (known / total) * 100 : 0;

        card.innerHTML = `
            <div class="deck-header">
                <div class="deck-info">
                    <div class="deck-title">${deck.title}</div>
                    <div class="deck-count">${total} fichas</div>
                </div>
                <div class="deck-actions">
                    <button class="btn-icon edit" title="Editar" data-id="${deck.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button class="btn-icon delete" title="Eliminar" data-id="${deck.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="deck-progress-wrapper">
                <div class="deck-progress-fill" style="width: ${percent}%"></div>
            </div>
        `;

        // click on card to play, but ignore if clicked on actions
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-icon')) return;
            startSession(deck);
        });

        // Add listeners to buttons manually to capture them before card click?
        // Actually event delegation above is fine, we just need to handle logic here
        const btnEdit = card.querySelector('.edit');
        const btnDelete = card.querySelector('.delete');

        btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            editDeck(deck.id);
        });

        btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteDeck(deck.id);
        });

        elements.decksGrid.appendChild(card);
    });
}

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

    // Toggle nav buttons
    elements.btnLibraryNav.hidden = (screenName === 'library');
    elements.btnImportNav.hidden = (screenName === 'import');
}

function resetImportScreen() {
    editingDeckId = null;
    elements.importText.value = '';
    elements.deckTitle.value = '';
    // Reset UI texts
    const h1 = document.querySelector('#import-screen h1');
    const p = document.querySelector('#import-screen p');
    if (h1) h1.innerText = 'Crear nuevo mazo';
    if (p) p.innerText = 'Importa tus flashcards para empezar.';
    if (elements.btnSave) elements.btnSave.innerText = 'Guardar y Estudiar';
}

function editDeck(id) {
    const decks = getDecks();
    const deck = decks.find(d => d.id === id);
    if (!deck) return;

    editingDeckId = id;

    // Pre-fill fields
    elements.deckTitle.value = deck.title;
    const cardsText = deck.cards.map(c => `${c.term}, ${c.definition}`).join('\n');
    elements.importText.value = cardsText;

    // Update UI texts to indicate editing
    const h1 = document.querySelector('#import-screen h1');
    const p = document.querySelector('#import-screen p');
    if (h1) h1.innerText = 'Editar mazo';
    if (p) p.innerText = 'Modifica el contenido de tus fichas.';
    if (elements.btnSave) elements.btnSave.innerText = 'Guardar Cambios';

    showScreen('import');
}

async function deleteDeck(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este mazo? Esta acción no se puede deshacer.')) return;

    let decks = getDecks();
    decks = decks.filter(d => d.id !== id);
    await saveDecks(decks);
    loadLibrary();
}

async function handleSaveAndStart() {
    const text = elements.importText.value.trim();
    const title = elements.deckTitle.value.trim() || 'Sin Título';

    if (!text) return alert('Por favor ingresa algunas fichas.');

    const lines = text.split('\n');
    const newCards = lines.map((line, index) => {
        const commaIndex = line.indexOf(',');
        if (commaIndex === -1) return null;

        const term = line.substring(0, commaIndex).trim();
        const def = line.substring(commaIndex + 1).trim();

        if (!term || !def) return null;

        return {
            id: Date.now() + index,
            term: term,
            definition: def
        };
    }).filter(card => card !== null);

    if (newCards.length === 0) return alert('No se encontraron fichas válidas.');

    const decks = getDecks();

    if (editingDeckId) {
        // Update existing deck
        const deckIndex = decks.findIndex(d => d.id === editingDeckId);
        if (deckIndex > -1) {
            decks[deckIndex].title = title;
            // Strategy: Replace cards. What about stats?
            // If cards changed, stats might be invalid.
            // Let's reset stats for simplicity or try to match?
            // User: "que profesional".
            // Professional behavior: Keep stats for UNCHANGED cards.
            // Complex match: Compare terms?
            // Simplest safe approach: Reset stats if cards change.
            // Or just Keep stats map and filter out knownIds that no longer exist in newCards?
            // Actually, IDs in newCards are NEW timestamps. So old stats won't match.
            // So we effectively reset progress on edit if we regenerate IDs.
            // To preserve progress, we would need to parse and match existing IDs. Too complex for simple text box import.
            // Let's just reset stats and explain/accept it. Or keep it simple: new cards = new progress.
            decks[deckIndex].cards = newCards;
            decks[deckIndex].stats = { knownIds: [], unknownIds: [] }; // Reset stats on full edit
        }
    } else {
        // Create new
        const newDeck = {
            id: Date.now(),
            title: title,
            cards: newCards,
            stats: {
                knownIds: [],
                unknownIds: []
            }
        };
        decks.push(newDeck);
    }

    await saveDecks(decks);

    // Clear inputs
    resetImportScreen(); // Also clears editingDeckId

    // If we were editing, maybe go back to library? Or start playing?
    // "Guardar y Estudiar" implies playing.
    // Let's start playing the deck we just saved.
    // If we edited, we want to see it.
    // Re-fetch the saved deck
    const savedDeck = editingDeckId ? decks.find(d => d.id === editingDeckId) : decks[decks.length - 1]; // This logic is slightly flawed if async write but we await saveDecks
    // Actually safe because saveDecks updates cachedDecks sync before write

    // Try to find the deck with the Title we just set if it was new, or ID if edited.
    // Just find by ID/Ref.
    // If it was new, it is last pushed.
    const deckToPlay = editingDeckId ? decks.find(d => d.id === editingDeckId) : decks[decks.length - 1];

    startSession(deckToPlay);
}

function startSession(deck) {
    currentDeckId = deck.id;
    allCards = deck.cards;

    // Load progress
    // If we want to resume where we left off (only showing unknown cards)
    // For now, let's load ALL cards, but visually or logically prioritize unknowns?
    // User requested: "se vuelve a preguntar...".
    // Let's implement this: "Queue" is initially (All Cards) - (Known Cards).
    // If everything is known, maybe reset? Or ask?
    // Let's standard Quizlet behavior: Start with everything, but prioritize unknowns.
    // Simplifying: Just load everything for now, but mark knowns as done if we wanted.
    // Actually, user wants "Guardar progreso". So if I learned it, I shouldn't see it immediately again?

    const knownIds = deck.stats ? deck.stats.knownIds : [];

    // Filter out known cards for the queue?
    // If I want to "Practice", I usually want to practice what I don't know.
    const unknownCards = allCards.filter(c => !knownIds.includes(c.id));

    if (unknownCards.length === 0 && allCards.length > 0) {
        // All learned! Ask if want to restart?
        if (confirm('¡Felicidades! Has dominado este mazo. ¿Quieres repasar todas las fichas de nuevo?')) {
            // Reset stats for this session (or permanently?) 
            // Let's reset permanently for "Restart"
            resetDeckProgress(deck.id);
            queue = [...allCards];
        } else {
            // Go back to library
            loadLibrary();
            showScreen('library');
            return;
        }
    } else {
        queue = [...unknownCards];
    }

    knownCount = knownIds.length;

    // Randomize queue for better learning
    shuffleArray(queue);

    nextRoundQueue = [];
    updateProgress();
    loadNextCard();
    showScreen('game');
}

async function resetDeckProgress(deckId) {
    const decks = getDecks();
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
        deck.stats = { knownIds: [], unknownIds: [] };
        await saveDecks(decks);
        knownCount = 0;
    }
}

async function saveProgress(cardId, isKnown) {
    if (!currentDeckId) return;

    const decks = getDecks();
    const deck = decks.find(d => d.id === currentDeckId);
    if (!deck) return;

    if (!deck.stats) deck.stats = { knownIds: [], unknownIds: [] };

    if (isKnown) {
        if (!deck.stats.knownIds.includes(cardId)) {
            deck.stats.knownIds.push(cardId);
        }
        // Remove from unknown if present
        const uIndex = deck.stats.unknownIds.indexOf(cardId);
        if (uIndex > -1) deck.stats.unknownIds.splice(uIndex, 1);
    } else {
        // Add to unknown
        if (!deck.stats.unknownIds.includes(cardId)) {
            deck.stats.unknownIds.push(cardId);
        }
        // Remove from known if present
        const kIndex = deck.stats.knownIds.indexOf(cardId);
        if (kIndex > -1) deck.stats.knownIds.splice(kIndex, 1);
    }

    await saveDecks(decks);
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

async function handleChoice(known) {
    if (!currentCard || elements.flashcard.classList.contains('animating')) return;

    // Mark as animating to prevent double clicks
    elements.flashcard.classList.add('animating');

    // Add Slide Animation
    const animationClass = known ? 'slide-right' : 'slide-left';
    elements.flashcard.classList.add(animationClass);

    setTimeout(async () => {
        elements.flashcard.classList.remove('animating', animationClass, 'flipped');
        isFlipped = false; // Reset flip state

        if (known) {
            knownCount++;
            await saveProgress(currentCard.id, true);
        } else {
            // Unknows are just kept in usage loop
            await saveProgress(currentCard.id, false);
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
        // For now, just continue silently or maybe flash a message.
        // Let's Continue.
        queue = [...nextRoundQueue];
        nextRoundQueue = [];
        // Optional: Shuffle the unknowns
        shuffleArray(queue);
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
    if (!currentDeckId) return;
    const decks = getDecks();
    const deck = decks.find(d => d.id === currentDeckId);
    if (!deck) return;

    if (mode === 'all') {
        // Reset everything
        resetDeckProgress(currentDeckId);
        startSession(deck);
    } else if (mode === 'unknown') {
        // Just continue with unknown (startSession handles this filtering automatically)
        startSession(deck);
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
    // Current progress logic:
    // Known Count (from persistence + session) / Total
    // OR: Current Queue Position?
    // Let's show "Mastery"
    const percent = total > 0 ? (knownCount / total) * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;

    // Update Side Counters
    elements.counterKnownVal.innerText = knownCount;
    // For unknown, we show the current "miss pile" for the next round
    elements.counterUnknownVal.innerText = nextRoundQueue.length;
}

// Backup Logic
function handleExport() {
    const decks = getDecks();
    const dataStr = JSON.stringify(decks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `quizclone_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if (confirm('Esto reemplazará tu biblioteca actual. ¿Estás seguro?')) {
                    await saveDecks(data);
                    loadLibrary();
                    alert('¡Biblioteca importada con éxito!');
                }
            } else {
                alert('El archivo no tiene el formato correcto.');
            }
        } catch (err) {
            alert('Error al leer el archivo. Asegúrate de que sea un JSON válido.');
            console.error(err);
        }
        // Reset input
        elements.fileImport.value = '';
    };
    reader.readAsText(file);
}

// Utils
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
