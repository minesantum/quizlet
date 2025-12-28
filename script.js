
// DOM Elements
const screens = {
    library: document.getElementById('library-screen'),
    subject: document.getElementById('subject-screen'),
    import: document.getElementById('import-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen'),
    setup: document.getElementById('setup-screen')
};

const elements = {
    importText: document.getElementById('import-text'),
    deckTitle: document.getElementById('deck-title'),
    deckSubject: document.getElementById('deck-subject'),
    deckTopic: document.getElementById('deck-topic'),
    btnSave: document.getElementById('btn-save'),
    btnImportNav: document.getElementById('btn-import-nav'),
    btnLibraryNav: document.getElementById('btn-library-nav'),
    libraryContent: document.getElementById('library-content'),
    subjectsGrid: document.getElementById('subjects-grid'),

    // Subject Detail Elements
    subjectContent: document.getElementById('subject-content'),
    subjectHeroTitle: document.getElementById('subject-hero-title'),
    subjectHeroIcon: document.getElementById('subject-hero-icon'),
    btnBackLibrary: document.getElementById('btn-back-library'),

    btnCreateFirst: document.getElementById('btn-create-first'),
    btnCreateFirstDynamic: document.getElementById('btn-create-first-dynamic'),
    btnManageCategories: document.getElementById('btn-manage-categories'),

    // Setup Elements
    newSubjectName: document.getElementById('new-subject-name'),
    btnAddSubject: document.getElementById('btn-add-subject'),
    subjectsList: document.getElementById('subjects-list'),
    btnFinishSetup: document.getElementById('btn-finish-setup'),

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
    explanationBox: document.getElementById('explanation-box'),
    controls: document.querySelector('.controls'),
    flashcardContainer: document.querySelector('.flashcard-container'),

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
let editingDeckId = null;
let currentViewingSubjectId = null; // Track which subject is open

// Data State
let decks = [];
let subjects = [];
let topics = [];

let allCards = [];
let builderCards = []; // Test Builder Data
let visualFlashcards = []; // Visual Flashcard Builder Data
let activeFlashcardTab = 'text';

let queue = [];
let nextRoundQueue = [];
let knownCount = 0;
let currentCard = null;
let isFlipped = false;

// Initialization
checkServerConnection().then(() => {
    // Load data into state
    const data = getData();
    decks = data.decks;
    subjects = data.subjects;
    topics = data.topics;

    // Check First Run
    if (subjects.length === 0 && decks.length === 0) {
        // Only show setup first if TRULY empty (no decks either)
        renderSubjectsManager();
        showScreen('setup');
    } else {
        loadLibrary();
    }
});

// Event Listeners
if (elements.btnSave) elements.btnSave.addEventListener('click', handleSaveAndStart);

if (elements.btnCreateFirst) elements.btnCreateFirst.addEventListener('click', navigateToImport);
if (elements.btnCreateFirstDynamic) elements.btnCreateFirstDynamic.addEventListener('click', navigateToImport);
if (elements.btnBackLibrary) elements.btnBackLibrary.addEventListener('click', () => {
    loadLibrary();
    showScreen('library');
});


elements.flashcard.addEventListener('click', handleFlip);
elements.btnKnown.addEventListener('click', () => handleChoice(true));
elements.btnUnknown.addEventListener('click', () => handleChoice(false));
elements.btnRestartAll.addEventListener('click', () => restart('all'));

elements.btnImportNav.addEventListener('click', navigateToImport);

if (elements.btnLibraryNav) {
    elements.btnLibraryNav.addEventListener('click', () => {
        loadLibrary();
        showScreen('library');
    });
}

// Setup & Categories Listeners
if (elements.btnAddSubject) elements.btnAddSubject.addEventListener('click', addNewSubject);
if (elements.btnFinishSetup) elements.btnFinishSetup.addEventListener('click', () => {
    loadLibrary();
    showScreen('library');
});
if (elements.btnManageCategories) elements.btnManageCategories.addEventListener('click', () => {
    renderSubjectsManager();
    showScreen('setup');
});

// Import Screen Category Logic
if (elements.deckSubject) elements.deckSubject.addEventListener('change', (e) => {
    populateTopicsSelect(e.target.value);
});


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

// Utility Functions
function navigateToImport() {
    resetImportScreen();
    showScreen('import');
}

// Storage Functions
async function checkServerConnection() {
    try {
        const res = await fetch(SERVER_URL);
        if (res.ok) {
            const data = await res.json();
            // Expected format check? Assumed sync
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    // Optional indicator logic
}

function getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { decks: [], subjects: [], topics: [] };

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
        // Migration from legacy array
        return { decks: parsed, subjects: [], topics: [] };
    }
    return parsed;
}

async function saveData() {
    const data = { decks, subjects, topics };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (usingServer || await isServerUp()) {
        try {
            await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            usingServer = true;
        } catch (e) {
            usingServer = false;
        }
    }
}

async function isServerUp() {
    try {
        await fetch(SERVER_URL, { method: 'HEAD' });
        return true;
    } catch { return false; }
}

// Category Management Functions
async function addNewSubject() {
    const name = elements.newSubjectName.value.trim();
    const color = '#4255ff'; // Default since selector removed

    if (!name) return alert('El nombre de la asignatura es obligatorio');

    const newSubject = {
        id: 'sub_' + Date.now(),
        name: name,
        color: color
    };

    subjects.push(newSubject);
    await saveData();

    elements.newSubjectName.value = '';
    renderSubjectsManager();
}

async function removeSubject(id) {
    if (!confirm('¿Eliminar esta asignatura? Los mazos asociados perderán la categoría.')) return;

    subjects = subjects.filter(s => s.id !== id);
    // Also remove associated topics
    topics = topics.filter(t => t.subjectId !== id);

    // Clear associations in decks
    decks.forEach(d => {
        if (d.subjectId === id) {
            d.subjectId = null;
            d.topicId = null;
        }
    });

    await saveData();
    renderSubjectsManager();
}

async function addNewTopic(subjectId) {
    const name = prompt('Nombre del Tema:');
    if (!name || !name.trim()) return;

    const newTopic = {
        id: 'top_' + Date.now(),
        subjectId: subjectId,
        name: name.trim()
    };

    topics.push(newTopic);
    await saveData();
    renderSubjectsManager();
}

async function removeTopic(id) {
    if (!confirm('¿Eliminar este tema?')) return;
    topics = topics.filter(t => t.id !== id);
    decks.forEach(d => {
        if (d.topicId === id) d.topicId = null;
    });
    await saveData();
    renderSubjectsManager();
}

function renderSubjectsManager() {
    elements.subjectsList.innerHTML = '';

    if (subjects.length === 0) {
        elements.subjectsList.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:1rem;">No hay asignaturas creadas.</p>';
        return;
    }

    subjects.forEach(subject => {
        const item = document.createElement('div');
        item.className = 'subject-item';

        // Filter topics for this subject
        const subTopics = topics.filter(t => t.subjectId === subject.id);

        item.innerHTML = `
            <div class="subject-header">
                <div class="subject-info">
                    <div class="subject-color-dot" style="background-color: ${subject.color}"></div>
                    <span>${subject.name}</span>
                </div>
                <div class="subject-actions">
                    <button class="btn-sm btn-secondary" onclick="window.requestAddTopic('${subject.id}')">+ Tema</button>
                    <button class="btn-icon delete" onclick="window.requestDeleteSubject('${subject.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="topics-container">
                ${subTopics.map(topic => `
                    <div class="topic-item">
                        <span>${topic.name}</span>
                        <button class="btn-icon delete" onclick="window.requestDeleteTopic('${topic.id}')">×</button>
                    </div>
                `).join('')}
                ${subTopics.length === 0 ? '<div style="color:var(--text-secondary); font-size:0.8rem; padding:0.5rem 0;">Sin temas</div>' : ''}
            </div>
        `;
        elements.subjectsList.appendChild(item);
    });
}

// Global exposes for string onclicks
window.requestAddTopic = addNewTopic;
window.requestDeleteSubject = removeSubject;
window.requestDeleteTopic = removeTopic;


// Main Logic & Library
function loadLibrary() {
    const data = getData();
    decks = data.decks;
    subjects = data.subjects;
    topics = data.topics;

    const grid = elements.subjectsGrid;
    grid.innerHTML = '';

    if (decks.length === 0 && subjects.length === 0) {
        document.getElementById('empty-library-state').hidden = false;
        elements.libraryContent.hidden = true;
        return;
    } else {
        document.getElementById('empty-library-state').hidden = true;
        elements.libraryContent.hidden = false;
    }

    // Render Subjects as Cards
    subjects.forEach(subject => {
        const deckCount = decks.filter(d => d.subjectId === subject.id).length;

        const card = document.createElement('div');
        card.className = 'subject-card-btn';
        card.innerHTML = `
            <div class="subject-icon-large" style="color: ${subject.color}">📘</div>
            <div class="subject-name-large">${subject.name}</div>
            <div class="subject-deck-count">${deckCount} mazos</div>
        `;

        card.addEventListener('click', () => {
            loadSubjectDetail(subject.id);
        });

        grid.appendChild(card);
    });

    // Handle Uncategorized Decks
    const uncategorizedDecks = decks.filter(d => !d.subjectId);
    if (uncategorizedDecks.length > 0) {
        const card = document.createElement('div');
        card.className = 'subject-card-btn';
        card.innerHTML = `
            <div class="subject-icon-large" style="color: var(--text-secondary)">📂</div>
            <div class="subject-name-large">General</div>
            <div class="subject-deck-count">${uncategorizedDecks.length} mazos</div>
        `;

        card.addEventListener('click', () => {
            loadSubjectDetail(null); // null means General
        });

        grid.appendChild(card);
    }
}

function loadSubjectDetail(subjectId) {
    currentViewingSubjectId = subjectId;
    const container = elements.subjectContent;
    container.innerHTML = '';

    let subject = null;
    let relevantDecks = [];
    let relevantTopics = [];

    if (subjectId) {
        subject = subjects.find(s => s.id === subjectId);
        relevantDecks = decks.filter(d => d.subjectId === subjectId);
        relevantTopics = topics.filter(t => t.subjectId === subjectId);

        elements.subjectHeroTitle.innerText = subject.name;
        // elements.subjectHeroIcon.style.color = subject.color; // Optional
    } else {
        elements.subjectHeroTitle.innerText = "General / Sin Categoría";
        relevantDecks = decks.filter(d => !d.subjectId);
        // No topics likely for general, unless floating topics allowed. Assuming strict hierarchy.
    }

    if (relevantDecks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay mazos en esta asignatura.</p></div>';
    }

    // Reuse logic to render sections (Topic -> Decks) or (Direct Decks)

    // 1. Group by Topic (only if real subject)
    const usedDeckIds = new Set();

    if (relevantTopics.length > 0) {
        relevantTopics.forEach(topic => {
            const topicDecks = relevantDecks.filter(d => d.topicId === topic.id);
            if (topicDecks.length > 0) {
                topicDecks.forEach(d => usedDeckIds.add(d.id));

                const topicSection = document.createElement('div');
                topicSection.className = 'section-topic';
                topicSection.style.marginLeft = '0'; // Reset margin as it is main view now
                topicSection.innerHTML = `<div class="topic-title" style="font-size:1.2rem; border-bottom:1px solid #ffffff1a; padding-bottom:0.5rem; margin-bottom:1rem;">${topic.name}</div>`;

                const grid = document.createElement('div');
                grid.className = 'decks-grid';
                topicDecks.forEach(d => grid.appendChild(createDeckCard(d)));

                topicSection.appendChild(grid);
                container.appendChild(topicSection);
            }
        });
    }

    // 2. Direct Decks (No Topic within Subject OR All General Decks)
    const directDecks = relevantDecks.filter(d => !usedDeckIds.has(d.id));
    if (directDecks.length > 0) {
        const section = document.createElement('div');
        section.className = 'section-topic';
        section.style.marginLeft = '0';
        // Only show header if we have mixed content (Topics + Direct), otherwise just grid
        if (relevantTopics.length > 0 && subjectId) {
            section.innerHTML = `<div class="topic-title" style="font-size:1.2rem; border-bottom:1px solid #ffffff1a; padding-bottom:0.5rem; margin-bottom:1rem;">Otros</div>`;
        }

        const grid = document.createElement('div');
        grid.className = 'decks-grid';
        directDecks.forEach(d => grid.appendChild(createDeckCard(d)));
        section.appendChild(grid);
        container.appendChild(section);
    }

    showScreen('subject');
}

function createDeckCard(deck) {
    const card = document.createElement('div');
    card.className = 'deck-card';

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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="btn-icon delete" title="Eliminar" data-id="${deck.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
        <div class="deck-progress-wrapper">
            <div class="deck-progress-fill" style="width: ${percent}%"></div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon')) return;
        startSession(deck);
    });

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

    return card;
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');

    elements.btnLibraryNav.hidden = (screenName === 'library' || screenName === 'subject');
    elements.btnImportNav.hidden = (screenName === 'import');

    // Auto-update setup if shown
    if (screenName === 'setup') {
        renderSubjectsManager();
    }
}

function toggleImportMode(type) {
    if (type === 'test') {
        if (elements.simpleImportGroup) elements.simpleImportGroup.hidden = true;
        if (elements.flashcardSection) elements.flashcardSection.hidden = true;

        elements.testBuilderContainer.hidden = false;
        if (builderCards.length === 0) addBuilderQuestion();
    } else {
        if (elements.flashcardSection) elements.flashcardSection.hidden = false;
        if (elements.simpleImportGroup) elements.simpleImportGroup.hidden = true;
        elements.testBuilderContainer.hidden = true;
        if (visualFlashcards.length === 0) addVisualFlashcard();
    }
}

function populateSubjectsSelect(selectedId = null) {
    const sel = elements.deckSubject;
    sel.innerHTML = '<option value="">Selecciona una asignatura...</option>';

    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.innerText = sub.name;
        sel.appendChild(opt);
    });

    if (selectedId) {
        sel.value = selectedId;
        populateTopicsSelect(selectedId);
    } else {
        // Reset topic
        populateTopicsSelect(null);
    }
}

function populateTopicsSelect(subjectId, selectedTopicId = null) {
    const selTopic = elements.deckTopic;
    selTopic.innerHTML = '<option value="">Tema (Opcional)</option>';

    if (!subjectId) {
        selTopic.disabled = true;
        return;
    }

    const subTopics = topics.filter(t => t.subjectId === subjectId);
    if (subTopics.length === 0) {
        selTopic.disabled = true;
        return;
    }

    selTopic.disabled = false;
    subTopics.forEach(top => {
        const opt = document.createElement('option');
        opt.value = top.id;
        opt.innerText = top.name;
        selTopic.appendChild(opt);
    });

    if (selectedTopicId) selTopic.value = selectedTopicId;
}

function resetImportScreen() {
    editingDeckId = null;
    elements.importText.value = '';
    elements.deckTitle.value = '';

    // Populate Selects
    populateSubjectsSelect();

    const radios = document.getElementsByName('deck-type');
    if (radios.length > 0) radios[0].checked = true;

    toggleImportMode('flashcard');

    visualFlashcards = [];
    activeFlashcardTab = 'text';
    switchFlashcardTab('text');
    renderFlashcardBuilder();

    builderCards = [];
    renderBuilder();

    const h1 = document.querySelector('#import-screen h1');
    const p = document.querySelector('#import-screen p');
    if (h1) h1.innerText = 'Crear nuevo mazo';
    if (p) p.innerText = 'Importa tus flashcards para empezar';
    if (elements.btnSave) elements.btnSave.innerText = 'Guardar y Estudiar';
}

function editDeck(id) {
    const data = getData();
    const deck = data.decks.find(d => d.id === id);
    if (!deck) return;

    editingDeckId = id;
    elements.deckTitle.value = deck.title;

    // Init Subjects/Topics
    populateSubjectsSelect(deck.subjectId);
    // Wait for populateSubjects to trigger populateTopics if dependent, but we called it manually above
    if (deck.subjectId && deck.topicId) {
        populateTopicsSelect(deck.subjectId, deck.topicId);
    }

    const type = deck.type || 'flashcard';
    const radios = document.getElementsByName('deck-type');
    for (const r of radios) {
        if (r.value === type) r.checked = true;
    }
    toggleImportMode(type);

    if (type === 'flashcard') {
        elements.importText.value = '';
        visualFlashcards = deck.cards.map(c => ({
            id: c.id,
            term: c.term,
            definition: c.definition
        }));
        renderFlashcardBuilder();
        syncFlashcardState('visual');
        switchFlashcardTab('visual');
    } else {
        builderCards = deck.cards.map(c => {
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

    const h1 = document.querySelector('#import-screen h1');
    const p = document.querySelector('#import-screen p');
    if (h1) h1.innerText = 'Editar mazo';
    if (p) p.innerText = 'Modifica el contenido de tus fichas';
    if (elements.btnSave) elements.btnSave.innerText = 'Guardar Cambios';

    showScreen('import');
}

async function deleteDeck(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este mazo?')) return;
    decks = decks.filter(d => d.id !== id);
    await saveData();

    // Refresh current view if needed
    if (screens.subject.classList.contains('active')) {
        loadSubjectDetail(currentViewingSubjectId);
    } else {
        loadLibrary();
    }
}

async function handleSaveAndStart() {
    const title = elements.deckTitle.value.trim() || 'Sin Título';
    const type = document.querySelector('input[name="deck-type"]:checked').value;
    const subjectId = elements.deckSubject.value;
    const topicId = !elements.deckTopic.disabled ? elements.deckTopic.value : null;

    let newCards = [];

    if (type === 'flashcard') {
        if (activeFlashcardTab === 'text') syncFlashcardState('text');
        else syncFlashcardState('visual');

        newCards = visualFlashcards
            .filter(c => c.term.trim() !== '' && c.definition.trim() !== '')
            .map((c, index) => ({
                id: c.id || (Date.now() + index),
                term: c.term,
                definition: c.definition
            }));
        if (newCards.length === 0) return alert('Por favor ingresa algunas fichas válidas.');
    } else {
        const validCards = builderCards.filter(c => c.term.trim() !== '');
        if (validCards.length === 0) return alert('Por favor añade al menos una pregunta.');

        newCards = validCards.map((c, index) => {
            const validOptions = c.options.filter(o => o.text.trim() !== '');
            if (!validOptions.some(o => o.isCorrect)) {
                if (validOptions.length > 0) validOptions[0].isCorrect = true;
            }
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

    if (editingDeckId) {
        const deckIndex = decks.findIndex(d => d.id === editingDeckId);
        if (deckIndex > -1) {
            decks[deckIndex].title = title;
            decks[deckIndex].type = type;
            decks[deckIndex].cards = newCards;
            decks[deckIndex].subjectId = subjectId;
            decks[deckIndex].topicId = topicId;
            decks[deckIndex].stats = { knownIds: [], unknownIds: [] };
        }
    } else {
        const newDeck = {
            id: Date.now(),
            title: title,
            type: type,
            cards: newCards,
            subjectId: subjectId,
            topicId: topicId,
            stats: {
                knownIds: [],
                unknownIds: []
            }
        };
        decks.push(newDeck);
    }

    await saveData();
    resetImportScreen();

    // Find doc to play
    const deckToPlay = editingDeckId ? decks.find(d => d.id === editingDeckId) : decks[decks.length - 1];
    startSession(deckToPlay);
}

function startSession(deck) {
    currentDeckId = deck.id;
    currentDeckType = deck.type || 'flashcard';
    allCards = deck.cards;

    if (currentDeckType === 'test') {
        elements.flashcardContainer.hidden = true;
        elements.controls.hidden = true;
        elements.testContainer.hidden = false;
        elements.testContainer.style.display = 'flex';
    } else {
        elements.flashcardContainer.hidden = false;
        elements.controls.hidden = false;
        elements.testContainer.hidden = true;
        elements.testContainer.style.display = 'none';
    }

    const knownIds = deck.stats ? deck.stats.knownIds : [];
    const unknownCards = allCards.filter(c => !knownIds.includes(c.id));

    if (unknownCards.length === 0 && allCards.length > 0) {
        if (confirm('¡Felicidades! Has dominado este mazo. ¿Quieres repasar todas las fichas de nuevo?')) {
            resetDeckProgress(deck.id);
            queue = [...allCards];
        } else {
            // Return to where we came from? 
            // For simplicity, return to Subject View if possible, else Library
            if (currentViewingSubjectId !== undefined) {
                loadSubjectDetail(currentViewingSubjectId);
            } else {
                loadLibrary();
                showScreen('library');
            }
            return;
        }
    } else {
        queue = [...unknownCards];
    }

    knownCount = knownIds.length;
    shuffleArray(queue);
    nextRoundQueue = [];
    updateProgress();
    loadNextCard();
    showScreen('game');
}

async function resetDeckProgress(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
        deck.stats = { knownIds: [], unknownIds: [] };
        await saveData();
        knownCount = 0;
    }
}

async function saveProgress(cardId, isKnown) {
    if (!currentDeckId) return;
    const deck = decks.find(d => d.id === currentDeckId);
    if (!deck) return;

    if (!deck.stats) deck.stats = { knownIds: [], unknownIds: [] };

    if (isKnown) {
        if (!deck.stats.knownIds.includes(cardId)) deck.stats.knownIds.push(cardId);
        const uIndex = deck.stats.unknownIds.indexOf(cardId);
        if (uIndex > -1) deck.stats.unknownIds.splice(uIndex, 1);
    } else {
        if (!deck.stats.unknownIds.includes(cardId)) deck.stats.unknownIds.push(cardId);
        const kIndex = deck.stats.knownIds.indexOf(cardId);
        if (kIndex > -1) deck.stats.knownIds.splice(kIndex, 1);
    }
    await saveData();
}

function loadNextCard() {
    if (queue.length === 0) {
        handleRoundEnd();
        return;
    }
    currentCard = queue.shift();
    isFlipped = false;

    if (currentDeckType === 'test') renderTestCard();
    else {
        elements.flashcard.classList.remove('flipped');
        elements.cardFrontText.innerText = currentCard.term;
        elements.cardBackText.innerText = currentCard.definition;
    }
    updateProgress();
}

function renderTestCard() {
    elements.testQuestion.innerText = currentCard.term;
    elements.testOptions.innerHTML = '';
    if (elements.explanationBox) {
        elements.explanationBox.hidden = true;
        elements.explanationBox.innerText = '';
    }

    let options = [];
    if (currentCard.options && currentCard.options.length > 0) {
        options = currentCard.options.map(o => ({ ...o }));
    } else {
        const potentialDistractors = allCards.filter(c => c.id !== currentCard.id);
        shuffleArray(potentialDistractors);
        const distractors = potentialDistractors.slice(0, 3);
        options = [
            { text: currentCard.definition, isCorrect: true },
            ...distractors.map(d => ({ text: d.definition, isCorrect: false }))
        ];
    }
    shuffleArray(options);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.text;
        btn.addEventListener('click', () => {
            const allBtns = elements.testOptions.querySelectorAll('button');
            allBtns.forEach(b => b.disabled = true);

            if (opt.isCorrect) {
                btn.classList.add('correct');
                let delay = 600;
                if (currentCard.explanation && currentCard.explanation.trim() !== '') {
                    if (elements.explanationBox) {
                        elements.explanationBox.innerText = currentCard.explanation;
                        elements.explanationBox.hidden = false;
                        delay = 1500 + (currentCard.explanation.length * 40);
                    }
                }
                setTimeout(() => handleChoice(true), delay);
            } else {
                btn.classList.add('wrong');
                // Fallback attempt to find correct btn
                if (currentCard.options) {
                    const realCorrect = currentCard.options.find(o => o.isCorrect);
                    if (realCorrect) {
                        const realBtn = Array.from(allBtns).find(b => b.innerText === realCorrect.text);
                        if (realBtn) realBtn.classList.add('correct');
                    }
                } else {
                    const correctBtn = Array.from(allBtns).find(b => b.innerText === currentCard.definition);
                    if (correctBtn) correctBtn.classList.add('correct');
                }
                setTimeout(() => handleChoice(false), 1500);
            }
        });
        elements.testOptions.appendChild(btn);
    });
}

function handleFlip() {
    isFlipped = !isFlipped;
    if (isFlipped) elements.flashcard.classList.add('flipped');
    else elements.flashcard.classList.remove('flipped');
}

async function handleChoice(known) {
    if (!currentCard || elements.flashcard.classList.contains('animating')) return;
    elements.flashcard.classList.add('animating');

    async function proceed() {
        if (known) {
            knownCount++;
            await saveProgress(currentCard.id, true);
        } else {
            await saveProgress(currentCard.id, false);
            nextRoundQueue.push(currentCard);
        }
        loadNextCard();
    }

    if (currentDeckType !== 'test') {
        const animationClass = known ? 'slide-right' : 'slide-left';
        elements.flashcard.classList.add(animationClass);
        setTimeout(async () => {
            elements.flashcard.classList.remove('animating', animationClass, 'flipped');
            isFlipped = false;
            await proceed();
        }, 300);
    } else {
        elements.flashcard.classList.remove('animating');
        await proceed();
    }
}

function handleRoundEnd() {
    if (nextRoundQueue.length > 0) {
        queue = [...nextRoundQueue];
        nextRoundQueue = [];
        shuffleArray(queue);
        loadNextCard();
    } else {
        showResults();
    }
}

function showResults() {
    elements.statKnown.innerText = allCards.length;
    elements.statUnknown.innerText = 0;
    showScreen('result');
}

function restart(mode) {
    if (!currentDeckId) return;
    const deck = decks.find(d => d.id === currentDeckId);
    if (!deck) return;

    if (mode === 'all') {
        resetDeckProgress(currentDeckId);
        startSession(deck);
    }
}

function updateProgress() {
    if (!currentDeckId) return;
    const deck = decks.find(d => d.id === currentDeckId);
    if (!deck) return;

    const kCount = deck.stats && deck.stats.knownIds ? deck.stats.knownIds.length : 0;
    const uCount = deck.stats && deck.stats.unknownIds ? deck.stats.unknownIds.length : 0;

    elements.counterKnownVal.innerText = kCount;
    elements.counterUnknownVal.innerText = uCount;

    elements.currentCount.innerText = allCards.length - (queue.length + nextRoundQueue.length);
    elements.totalCount.innerText = allCards.length;

    const total = allCards.length;
    const percent = total > 0 ? (kCount / total) * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;
}

// Backup Logic (Keep Export/Import as is mostly)
function handleExport() {
    const data = getData();
    const dataStr = JSON.stringify(data, null, 2);
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
            let data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                // Migrate
                data = { decks: data, subjects: [], topics: [] };
            }
            if (confirm('Esto reemplazará tu biblioteca actual. ¿Estás seguro?')) {
                decks = data.decks || [];
                subjects = data.subjects || [];
                topics = data.topics || [];
                await saveData();

                // Reload
                if (subjects.length === 0) {
                    renderSubjectsManager();
                    showScreen('setup');
                } else {
                    loadLibrary();
                }
                alert('¡Biblioteca importada con éxito!');
            }
        } catch (err) {
            alert('Error al leer el archivo. Asegúrate de que sea un JSON válido.');
        }
        elements.fileImport.value = '';
    };
    reader.readAsText(file);
}

// Builder Helpers
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
    builderCards.push({ id: Date.now(), term: '', explanation: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] });
    renderBuilder();
}
function removeBuilderQuestion(index) {
    if (confirm('¿Eliminar pregunta?')) { builderCards.splice(index, 1); renderBuilder(); }
}
function updateBuilderCard(index, field, value) { builderCards[index][field] = value; }
function addBuilderOption(qIndex) { builderCards[qIndex].options.push({ text: '', isCorrect: false }); renderBuilder(); }
function removeBuilderOption(qIndex, oIndex) {
    if (builderCards[qIndex].options.length <= 1) return;
    if (!confirm('¿Seguro que quieres borrar esta opción?')) return;
    builderCards[qIndex].options.splice(oIndex, 1);
    if (!builderCards[qIndex].options.some(o => o.isCorrect)) builderCards[qIndex].options[0].isCorrect = true;
    renderBuilder();
}
function updateBuilderOption(qIndex, oIndex, field, value) {
    if (field === 'isCorrect') {
        builderCards[qIndex].options.forEach(o => o.isCorrect = false);
        builderCards[qIndex].options[oIndex].isCorrect = true;
    } else {
        builderCards[qIndex].options[oIndex][field] = value;
    }
}
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

function syncFlashcardState(fromMode) {
    if (fromMode === 'text') {
        const text = elements.importText.value.trim();
        if (!text) {
            visualFlashcards = [];
        } else {
            const lines = text.split('\n');
            visualFlashcards = lines.map((lines, index) => {
                const commaIndex = lines.indexOf(',');
                let term = lines;
                let def = '';
                if (commaIndex > -1) {
                    term = lines.substring(0, commaIndex).trim();
                    def = lines.substring(commaIndex + 1).trim();
                }
                return { id: Date.now() + index, term: term, definition: def };
            }).filter(c => c.term || c.definition);
        }
        renderFlashcardBuilder();
    } else {
        const text = visualFlashcards.filter(c => c.term || c.definition).map(c => `${c.term}, ${c.definition}`).join('\n');
        elements.importText.value = text;
    }
}

function switchFlashcardTab(tab) {
    if (activeFlashcardTab === 'text' && tab === 'visual') syncFlashcardState('text');
    else if (activeFlashcardTab === 'visual' && tab === 'text') syncFlashcardState('visual');
    activeFlashcardTab = tab;
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
function addVisualFlashcard() { visualFlashcards.push({ id: Date.now(), term: '', definition: '' }); renderFlashcardBuilder(); }
function removeVisualFlashcard(index) {
    if (visualFlashcards.length === 1 && !visualFlashcards[0].term.trim() && !visualFlashcards[0].definition.trim()) return;
    if (!confirm('¿Seguro que quieres borrar esta ficha?')) return;
    visualFlashcards.splice(index, 1);
    if (visualFlashcards.length === 0) addVisualFlashcard();
    else renderFlashcardBuilder();
}
function updateVisualFlashcard(index, field, value) { visualFlashcards[index][field] = value; }
window.switchFlashcardTab = switchFlashcardTab;
window.addVisualFlashcard = addVisualFlashcard;
window.removeVisualFlashcard = removeVisualFlashcard;
window.updateVisualFlashcard = updateVisualFlashcard;
