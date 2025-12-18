
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
    btnRestartAll: document.getElementById('btn-restart-all'),

    // Test Mode Elements
    testContainer: document.getElementById('test-container'),
    testQuestion: document.getElementById('test-question'),
    testOptions: document.getElementById('test-options'),
    controls: document.querySelector('.controls'),
    flashcardContainer: document.querySelector('.flashcard-container'), // Need to select class if no ID

    // Builder Elements
    simpleImportGroup: document.getElementById('simple-import-group'),
    testBuilderContainer: document.getElementById('test-builder-container'),
    builderList: document.getElementById('builder-questions-list'),
    btnAddQuestion: document.getElementById('btn-add-question'),

    // Flashcard Visual Builder Elements
    flashcardSection: document.getElementById('flashcard-section'),
    flashcardTextContainer: document.getElementById('flashcard-text-container'),
    flashcardVisualContainer: document.getElementById('flashcard-visual-container'),
    flashcardList: document.getElementById('flashcard-list'),
    tabText: document.getElementById('tab-text'),
    tabVisual: document.getElementById('tab-visual')
};

// State
const STORAGE_KEY = 'quizclone_data';
const SERVER_URL = '/api/decks';
let usingServer = false;
let currentDeckId = null;
let currentDeckType = 'flashcard';
let editingDeckId = null; // Track if we are editing
let allCards = [];
let builderCards = []; // Test Builder Data
let visualFlashcards = []; // Visual Flashcard Builder Data
let activeFlashcardTab = 'text'; // 'text' or 'visual'

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

elements.btnImportNav.addEventListener('click', () => {
    resetImportScreen();
    showScreen('import');
});

if (elements.btnLibraryNav) {
    elements.btnLibraryNav.addEventListener('click', () => {
        loadLibrary(); // Reload to ensure freshness
        showScreen('library');
    });
}


// Builder Listeners
if (elements.btnAddQuestion) elements.btnAddQuestion.addEventListener('click', () => {
    addBuilderQuestion();
});

document.addEventListener('change', (e) => {
    if (e.target.name === 'deck-type') {
        const type = e.target.value;
        toggleImportMode(type);
    }
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
                <p>No tienes mazos guardados aún</p>
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
        const knownCards = deck.stats && deck.stats.knownIds ? deck.stats.knownIds.length : 0;
        const unknownCards = deck.stats && deck.stats.unknownIds ? deck.stats.unknownIds.length : 0;
        const percent = total > 0 ? (knownCards / total) * 100 : 0;

        card.innerHTML = `
            <div class="deck-header">
                <div class="deck-info">
                    <div class="deck-title">${deck.title}</div>
                    <div class="deck-count">${total} fichas</div>
                </div>
                
                <div class="deck-stats">
                    <div class="stat-badge known" title="Dominadas">
                        <span>✔ ${knownCards}</span>
                    </div>
                    <div class="stat-badge unknown" title="Por aprender">
                        <span>✖ ${unknownCards}</span>
                    </div>
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

function toggleImportMode(type) {
    if (type === 'test') {
        if (elements.simpleImportGroup) elements.simpleImportGroup.hidden = true;
        if (elements.flashcardSection) elements.flashcardSection.hidden = true;

        elements.testBuilderContainer.hidden = false;
        // Init builder if empty
        if (builderCards.length === 0) {
            addBuilderQuestion(); // Add one default
        }
    } else {
        // Flashcard Mode
        if (elements.flashcardSection) elements.flashcardSection.hidden = false;
        if (elements.simpleImportGroup) elements.simpleImportGroup.hidden = true;
        elements.testBuilderContainer.hidden = true;

        // Init visual builder if empty
        if (visualFlashcards.length === 0) {
            addVisualFlashcard();
        }
    }
}

function resetImportScreen() {
    editingDeckId = null;
    elements.importText.value = '';
    elements.deckTitle.value = '';

    // Reset Radio to default
    const radios = document.getElementsByName('deck-type');
    if (radios.length > 0) radios[0].checked = true;

    toggleImportMode('flashcard');

    // Reset Visual Flashcards
    visualFlashcards = [];
    activeFlashcardTab = 'text';
    switchFlashcardTab('text');
    renderFlashcardBuilder();

    builderCards = [];
    renderBuilder();

    // Reset UI texts
    const h1 = document.querySelector('#import-screen h1');
    const p = document.querySelector('#import-screen p');
    if (h1) h1.innerText = 'Crear nuevo mazo';
    if (p) p.innerText = 'Importa tus flashcards para empezar';
    if (elements.btnSave) elements.btnSave.innerText = 'Guardar y Estudiar';
}

function editDeck(id) {
    const decks = getDecks();
    const deck = decks.find(d => d.id === id);
    if (!deck) return;

    editingDeckId = id;

    // Pre-fill Title
    elements.deckTitle.value = deck.title;

    // Set Radio
    const type = deck.type || 'flashcard';
    const radios = document.getElementsByName('deck-type');
    for (const r of radios) {
        if (r.value === type) r.checked = true;
    }
    toggleImportMode(type);

    if (type === 'flashcard') {
        // Clear Text Area to avoid duplication on save
        elements.importText.value = '';

        // Populate Visual Builder
        // Ensure deep copy to avoid reference issues
        visualFlashcards = deck.cards.map(c => ({
            id: c.id,
            term: c.term,
            definition: c.definition
        }));

        renderFlashcardBuilder();

        // Populate text area from visual so both are full
        syncFlashcardState('visual');

        // Switch to Visual Tab so user sees the data immediately
        switchFlashcardTab('visual');

    } else {
        // Test Builder Mode
        // Populate Builder Cards
        builderCards = deck.cards.map(c => {
            // Deep copy of options
            const opts = c.options ? c.options.map(o => ({ ...o })) : [];
            return {
                id: c.id,
                term: c.term,
                explanation: c.explanation || '',
                options: opts
            };
        });
        renderBuilder();
    }

    // Update UI texts to indicate editing
    const h1 = document.querySelector('#import-screen h1');
    const p = document.querySelector('#import-screen p');
    if (h1) h1.innerText = 'Editar mazo';
    if (p) p.innerText = 'Modifica el contenido de tus fichas';
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
    const title = elements.deckTitle.value.trim() || 'Sin Título';
    const type = document.querySelector('input[name="deck-type"]:checked').value;

    let newCards = [];

    if (type === 'flashcard') {
        // Sync before saving based on active tab to ensure consistency
        if (activeFlashcardTab === 'text') {
            syncFlashcardState('text');
        } else {
            syncFlashcardState('visual');
        }

        // Use visualFlashcards as the single source of truth (since it's now synced)
        // Filter empty
        newCards = visualFlashcards
            .filter(c => c.term.trim() !== '' && c.definition.trim() !== '')
            .map((c, index) => ({
                id: c.id || (Date.now() + index),
                term: c.term,
                definition: c.definition
            }));

        if (newCards.length === 0) return alert('Por favor ingresa algunas fichas válidas.');
    } else {
        // Builder Mode
        // Validate
        const validCards = builderCards.filter(c => c.term.trim() !== '');
        if (validCards.length === 0) return alert('Por favor añade al menos una pregunta.');

        // Construct cards
        newCards = validCards.map((c, index) => {
            // Filter empty options
            const validOptions = c.options.filter(o => o.text.trim() !== '');
            // Check if correct is set
            if (!validOptions.some(o => o.isCorrect)) {
                // If unset, maybe set first as correct? Or alert?
                // Let's set first as correct for safety if exists
                if (validOptions.length > 0) validOptions[0].isCorrect = true;
            }

            // Definition is technically the correct answer for legacy compt
            const correctOpt = validOptions.find(o => o.isCorrect);
            const def = correctOpt ? correctOpt.text : '???';

            return {
                id: c.id || (Date.now() + index),
                term: c.term,
                definition: def,
                explanation: c.explanation,
                options: validOptions
            };
        });
    }

    if (newCards.length === 0) return alert('No se encontraron fichas válidas.');

    const decks = getDecks();

    if (editingDeckId) {
        // Update existing deck
        const deckIndex = decks.findIndex(d => d.id === editingDeckId);
        if (deckIndex > -1) {
            decks[deckIndex].title = title;
            decks[deckIndex].type = type;
            decks[deckIndex].cards = newCards;
            decks[deckIndex].stats = { knownIds: [], unknownIds: [] }; // Reset stats on full edit
        }
    } else {
        // Create new
        const newDeck = {
            id: Date.now(),
            title: title,
            type: type,
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
    currentDeckType = deck.type || 'flashcard';
    allCards = deck.cards;

    // Toggle UI based on type
    if (currentDeckType === 'test') {
        elements.flashcardContainer.hidden = true;
        elements.controls.hidden = true;
        elements.testContainer.hidden = false;
        elements.testContainer.style.display = 'flex'; // Ensure flex
    } else {
        elements.flashcardContainer.hidden = false;
        elements.controls.hidden = false;
        elements.testContainer.hidden = true;
        elements.testContainer.style.display = 'none';
    }

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

    knownCount = knownIds.length;

    // Shuffle cards initially
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

    if (currentDeckType === 'test') {
        renderTestCard();
    } else {
        elements.flashcard.classList.remove('flipped');
        elements.cardFrontText.innerText = currentCard.term;
        elements.cardBackText.innerText = currentCard.definition;
    }

    updateProgress();
}

function renderTestCard() {
    // 1. Set Question
    elements.testQuestion.innerText = currentCard.term;

    // 2. Clear Options
    elements.testOptions.innerHTML = '';

    let options = [];

    // Check if card has custom options (Builder created)
    if (currentCard.options && currentCard.options.length > 0) {
        options = currentCard.options.map(o => ({ ...o })); // Deep copy options
    } else {
        // Legacy/Flashcard Mode: Generate Distractors
        const potentialDistractors = allCards.filter(c => c.id !== currentCard.id);
        shuffleArray(potentialDistractors);
        const distractors = potentialDistractors.slice(0, 3);

        options = [
            { text: currentCard.definition, isCorrect: true },
            ...distractors.map(d => ({ text: d.definition, isCorrect: false }))
        ];
    }

    // 5. Shuffle options so correct isn't always first
    shuffleArray(options);

    // 6. Render Buttons
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.text;

        btn.addEventListener('click', () => {
            // Disable all buttons to prevent double click
            const allBtns = elements.testOptions.querySelectorAll('button');
            allBtns.forEach(b => b.disabled = true);

            if (opt.isCorrect) {
                btn.classList.add('correct');
                setTimeout(() => handleChoice(true), 600);
            } else {
                btn.classList.add('wrong');
                // Highlight correct one?
                const correctBtn = Array.from(allBtns).find(b => b.innerText === currentCard.definition);
                if (correctBtn) correctBtn.classList.add('correct');

                setTimeout(() => handleChoice(false), 1000); // Longer wait to see correction
            }
        });

        elements.testOptions.appendChild(btn);
    });
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

    async function proceed() {
        if (known) {
            knownCount++;
            await saveProgress(currentCard.id, true);
        } else {
            // Unknows are just kept in usage loop
            await saveProgress(currentCard.id, false);
            nextRoundQueue.push(currentCard);
        }

        loadNextCard();
    }

    // Only animate flashcard if visible (Deck Type check)
    if (currentDeckType !== 'test') {
        const animationClass = known ? 'slide-right' : 'slide-left';
        elements.flashcard.classList.add(animationClass);

        setTimeout(async () => {
            elements.flashcard.classList.remove('animating', animationClass, 'flipped');
            isFlipped = false; // Reset flip state
            await proceed();
        }, 300);
    } else {
        // Immediate (or already delayed by button click handler)
        elements.flashcard.classList.remove('animating');
        await proceed();
    }
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
    if (!currentDeckId) return;
    const decks = getDecks();
    const deck = decks.find(d => d.id === currentDeckId);
    if (!deck) return;

    const kCount = deck.stats && deck.stats.knownIds ? deck.stats.knownIds.length : 0;
    const uCount = deck.stats && deck.stats.unknownIds ? deck.stats.unknownIds.length : 0;

    // Update Side Counters with persistent data
    elements.counterKnownVal.innerText = kCount;
    elements.counterUnknownVal.innerText = uCount;

    // Remaining in session
    elements.currentCount.innerText = allCards.length - (queue.length + nextRoundQueue.length);
    elements.totalCount.innerText = allCards.length;

    // Update Bar (Global Mastery)
    const total = allCards.length;
    const percent = total > 0 ? (kCount / total) * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;
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

// Builder Logic
function renderBuilder() {
    elements.builderList.innerHTML = '';

    builderCards.forEach((card, qIndex) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'question-card';
        cardEl.innerHTML = `
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-number">Pregunta ${qIndex + 1}</span>
                    <button class="btn-delete-q" title="Eliminar pregunta" onclick="removeBuilderQuestion(${qIndex})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <input type="text" class="question-input-title" value="${card.term}" placeholder="Escribe tu pregunta..." onchange="updateBuilderCard(${qIndex}, 'term', this.value)">
            </div>
            
            <div class="options-list">
                ${card.options.map((opt, oIndex) => `
                    <div class="option-row">
                        <input type="radio" name="q-${qIndex}-correct" class="correct-radio" ${opt.isCorrect ? 'checked' : ''} onchange="updateBuilderOption(${qIndex}, ${oIndex}, 'isCorrect', true)" title="Marcar como respuesta correcta">
                        <input type="text" class="option-input" value="${opt.text}" placeholder="Opción ${oIndex + 1}" onchange="updateBuilderOption(${qIndex}, ${oIndex}, 'text', this.value)">
                        <button class="btn-delete-opt" title="Eliminar opción" onclick="removeBuilderOption(${qIndex}, ${oIndex})">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                `).join('')}
                <button class="btn-add-opt" onclick="addBuilderOption(${qIndex})">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                   Agregar opción
                </button>
            </div>
            
            <div class="explanation-field">
                <textarea class="explanation-input" placeholder="Explicación de la respuesta (opcional)" onchange="updateBuilderCard(${qIndex}, 'explanation', this.value)">${card.explanation || ''}</textarea>
            </div>
        `;
        elements.builderList.appendChild(cardEl);
    });
}

function addBuilderQuestion() {
    builderCards.push({
        id: Date.now(),
        term: '',
        explanation: '',
        options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false }
        ]
    });
    renderBuilder();
}

function removeBuilderQuestion(index) {
    if (confirm('¿Eliminar pregunta?')) {
        builderCards.splice(index, 1);
        renderBuilder();
    }
}

function updateBuilderCard(index, field, value) {
    builderCards[index][field] = value;
}

function addBuilderOption(qIndex) {
    builderCards[qIndex].options.push({ text: '', isCorrect: false });
    renderBuilder();
}

function removeBuilderOption(qIndex, oIndex) {
    if (builderCards[qIndex].options.length <= 1) return; // Prevent empty list

    // Confirmation
    if (!confirm('¿Seguro que quieres borrar esta opción?')) return;

    builderCards[qIndex].options.splice(oIndex, 1);

    // Ensure one is correct
    if (!builderCards[qIndex].options.some(o => o.isCorrect)) {
        builderCards[qIndex].options[0].isCorrect = true;
    }

    renderBuilder();
}

function updateBuilderOption(qIndex, oIndex, field, value) {
    if (field === 'isCorrect') {
        // Unset others
        builderCards[qIndex].options.forEach(o => o.isCorrect = false);
        builderCards[qIndex].options[oIndex].isCorrect = true;
    } else {
        builderCards[qIndex].options[oIndex][field] = value;
    }
    // Re-render only if needed, but changing text uses onchange so no full re-render needed to keep focus.
    // However, radio change might need visual update? 
    // Actually, native radio behavior handles the check visual, we just updated state. 
    // BUT we need to sync state correctly.
}
// Expose to window for onclick handlers in HTML string
window.removeBuilderQuestion = removeBuilderQuestion;
window.updateBuilderCard = updateBuilderCard;
window.addBuilderOption = addBuilderOption;
window.removeBuilderOption = removeBuilderOption;
window.updateBuilderOption = updateBuilderOption;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Visual Flashcard Builder Functions
function syncFlashcardState(fromMode) {
    if (fromMode === 'text') {
        const text = elements.importText.value.trim();
        if (!text) {
            // Only clear if empty, but be careful not to wipe if user just cleared text to start over?
            // Yes, syncing means mirroring.
            visualFlashcards = [];
        } else {
            const lines = text.split('\n');
            visualFlashcards = lines.map((line, index) => {
                const commaIndex = line.indexOf(',');
                let term = line;
                let def = '';
                if (commaIndex > -1) {
                    term = line.substring(0, commaIndex).trim();
                    def = line.substring(commaIndex + 1).trim();
                }
                // Determine ID: try to keep existing if possible? Hard with text parsing.
                // Just new IDs or temp IDs.
                return {
                    id: Date.now() + index,
                    term: term,
                    definition: def
                };
            }).filter(c => c.term || c.definition);
        }
        renderFlashcardBuilder();
    } else {
        // From Visual to Text
        const text = visualFlashcards
            .filter(c => c.term || c.definition)
            .map(c => `${c.term}, ${c.definition}`)
            .join('\n');
        elements.importText.value = text;
    }
}

function switchFlashcardTab(tab) {
    // Sync before switching
    if (activeFlashcardTab === 'text' && tab === 'visual') {
        syncFlashcardState('text');
    } else if (activeFlashcardTab === 'visual' && tab === 'text') {
        syncFlashcardState('visual');
    }

    activeFlashcardTab = tab;
    // Update Tabs UI

    if (tab === 'text') {
        elements.tabText.classList.add('active');
        elements.tabVisual.classList.remove('active');
        elements.flashcardTextContainer.hidden = false;
        elements.flashcardTextContainer.classList.add('active');
        elements.flashcardVisualContainer.hidden = true;
        elements.flashcardVisualContainer.classList.remove('active');
    } else {
        elements.tabText.classList.remove('active');
        elements.tabVisual.classList.add('active');
        elements.flashcardTextContainer.hidden = true;
        elements.flashcardTextContainer.classList.remove('active');
        elements.flashcardVisualContainer.hidden = false;
        elements.flashcardVisualContainer.classList.add('active');

        // Init if empty
        if (visualFlashcards.length === 0) addVisualFlashcard();
    }
}

function renderFlashcardBuilder() {
    elements.flashcardList.innerHTML = '';

    visualFlashcards.forEach((card, index) => {
        const row = document.createElement('div');
        row.className = 'flashcard-row';
        row.innerHTML = `
            <div class="flashcard-row-number">${index + 1}</div>
            
            <div class="flashcard-input-group">
                <input type="text" class="flashcard-input" placeholder="Término" value="${card.term}" onchange="updateVisualFlashcard(${index}, 'term', this.value)">
                <span class="flashcard-input-label">TÉRMINO</span>
            </div>
            
            <div class="flashcard-input-group">
                <input type="text" class="flashcard-input" placeholder="Definición" value="${card.definition}" onchange="updateVisualFlashcard(${index}, 'definition', this.value)">
                <span class="flashcard-input-label">DEFINICIÓN</span>
            </div>

            <button class="btn-delete-row" title="Eliminar ficha" onclick="removeVisualFlashcard(${index})">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        `;
        elements.flashcardList.appendChild(row);
    });
}

function addVisualFlashcard() {
    visualFlashcards.push({
        id: Date.now(),
        term: '',
        definition: ''
    });
    renderFlashcardBuilder();
}

function removeVisualFlashcard(index) {
    // If it's the only card and it's completely empty, just reset/ignore
    if (visualFlashcards.length === 1 && !visualFlashcards[0].term.trim() && !visualFlashcards[0].definition.trim()) {
        return;
    }

    // Always confirm deletion for safety
    if (!confirm('¿Seguro que quieres borrar esta ficha?')) return;

    visualFlashcards.splice(index, 1);

    // If we deleted the last one, add a new empty one immediately
    if (visualFlashcards.length === 0) {
        addVisualFlashcard();
    } else {
        renderFlashcardBuilder();
    }
}

function updateVisualFlashcard(index, field, value) {
    visualFlashcards[index][field] = value;
}

// Window exports
window.switchFlashcardTab = switchFlashcardTab;
window.addVisualFlashcard = addVisualFlashcard;
window.removeVisualFlashcard = removeVisualFlashcard;
window.updateVisualFlashcard = updateVisualFlashcard;
