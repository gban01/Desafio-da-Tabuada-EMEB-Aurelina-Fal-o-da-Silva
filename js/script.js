document.addEventListener('DOMContentLoaded', () => {

    const gameState = {
        selectedTables: [],
        questions: [],
        currentQuestion: null,
        totalQuestions: 0,
        completedCount: 0,
        errorCount: 0,
        isSpinning: false,
        audioEnabled: true
    };

    const audioManager = {
        sounds: {
            roleta: new Audio('assets/audio/roleta.mp3'),
            acerto: new Audio('assets/audio/acerto.mp3'),
            erro: new Audio('assets/audio/erro.mp3'),
            vitoria: new Audio('assets/audio/vitoria.mp3')
        },
        play(soundKey, loop = false) {
            if (!gameState.audioEnabled) return;
            const sound = this.sounds[soundKey];
            if (sound) {
                sound.loop = loop;
                sound.currentTime = 0;
                sound.play().catch(() => {});
            }
        },
        stop(soundKey) {
            const sound = this.sounds[soundKey];
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        }
    };

    const screens = {
        home: document.getElementById('screen-home'),
        game: document.getElementById('screen-game'),
        victory: document.getElementById('screen-victory')
    };

    const DOM = {
        tablesGrid: document.getElementById('tables-grid'),
        btnSelectAll: document.getElementById('btn-select-all'),
        btnClearAll: document.getElementById('btn-clear-all'),
        btnStart: document.getElementById('btn-start'),
        msgWarning: document.getElementById('msg-warning'),
        
        infoTables: document.getElementById('info-tables'),
        infoQuestions: document.getElementById('info-questions'),
        infoHits: document.getElementById('info-hits'),
        btnAudioToggle: document.getElementById('btn-audio-toggle'),
        btnCloseGame: document.getElementById('btn-close-game'),

        wheel3D: document.getElementById('wheel-3d'),
        btnSpin: document.getElementById('btn-spin'),

        questionBox: document.getElementById('question-box'),
        badgeTabuada: document.getElementById('badge-tabuada'),
        questionText: document.getElementById('question-text'),
        formAnswer: document.getElementById('form-answer'),
        inputAnswer: document.getElementById('input-answer'),
        feedbackMsg: document.getElementById('feedback-message'),

        statCompleted: document.getElementById('stat-completed'),
        statErrors: document.getElementById('stat-errors'),
        statAccuracy: document.getElementById('stat-accuracy'),
        btnRestart: document.getElementById('btn-restart'),
        btnHome: document.getElementById('btn-home'),
        modalConfirm: document.getElementById('modal-confirm'),
        btnModalCancel: document.getElementById('btn-modal-cancel'),
        btnModalConfirm: document.getElementById('btn-modal-confirm')
    };

    function initApp() {
        renderTableCards();
        setupEventListeners();
    }

    function renderTableCards() {
        DOM.tablesGrid.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const card = document.createElement('div');
            card.className = 'table-card';
            card.dataset.table = i;
            card.innerHTML = `
                <span class="card-check">✓</span>
                <span class="card-val">× ${i}</span>
            `;
            card.addEventListener('click', () => toggleTableSelection(i, card));
            DOM.tablesGrid.appendChild(card);
        }
    }

    function toggleTableSelection(tableNum, cardElement) {
        const index = gameState.selectedTables.indexOf(tableNum);
        if (index > -1) {
            gameState.selectedTables.splice(index, 1);
            cardElement.classList.remove('selected');
        } else {
            gameState.selectedTables.push(tableNum);
            cardElement.classList.add('selected');
        }
        DOM.msgWarning.classList.add('hidden');
    }

    function generateQuestions() {
        gameState.questions = [];
        gameState.selectedTables.sort((a, b) => a - b);

        gameState.selectedTables.forEach(table => {
            for (let mult = 1; mult <= 10; mult++) {
                gameState.questions.push({
                    tabuada: table,
                    multiplicador: mult,
                    resposta: table * mult,
                    respondida: false
                });
            }
        });

        gameState.totalQuestions = gameState.questions.length;
        gameState.completedCount = 0;
        gameState.errorCount = 0;
    }

    function startGame() {
        if (gameState.selectedTables.length === 0) {
            DOM.msgWarning.classList.remove('hidden');
            return;
        }

        generateQuestions();
        updateDashboard();
        build3DWheel();

        switchScreen('game');
        resetRoundState();
    }

    function updateDashboard() {
        DOM.infoTables.textContent = gameState.selectedTables.join(', ');
        DOM.infoQuestions.textContent = `${gameState.completedCount}/${gameState.totalQuestions}`;
        DOM.infoHits.textContent = gameState.completedCount;
    }

    function resetRoundState() {
        DOM.questionBox.classList.add('hidden');
        DOM.btnSpin.disabled = false;
        DOM.feedbackMsg.className = 'feedback-message hidden';
        DOM.inputAnswer.value = '';
    }

    function build3DWheel() {
        DOM.wheel3D.innerHTML = '';
        const items = gameState.selectedTables;
        const totalFaces = items.length;
        const angleStep = 360 / totalFaces;
        const radius = Math.max(120, Math.round((60 / Math.tan(Math.PI / totalFaces))));

        items.forEach((num, idx) => {
            const face = document.createElement('div');
            face.className = 'wheel-face';
            face.textContent = num;
            const currentAngle = angleStep * idx;
            face.style.transform = `rotateY(${currentAngle}deg) translateZ(${radius}px)`;
            DOM.wheel3D.appendChild(face);
        });
    }

    function spinWheel() {
    if (gameState.isSpinning) return;

    gameState.isSpinning = true;
    DOM.btnSpin.disabled = true;
    DOM.questionBox.classList.add('hidden');

    // Sorteia uma das tabuadas que AINDA tem questões pendentes
    const pendingQuestions = gameState.questions.filter(q => !q.respondida);
    const availableTables = [...new Set(pendingQuestions.map(q => q.tabuada))];
    const selectedTable = availableTables[Math.floor(Math.random() * availableTables.length)];

    // Duração do giro
    const spinDuration = Math.floor(Math.random() * 10000) + 10000;

    audioManager.play('roleta', true);

    // Cálculos matemáticos de precisão para parar no número correto
    const totalFaces = gameState.selectedTables.length;
    const angleStep = 360 / totalFaces;
    const selectedIndex = gameState.selectedTables.indexOf(selectedTable);

    // O ângulo alvo compensa a rotação para alinhar a face sorteada exatamente com o ponteiro frontal
    const targetAngle = (360 - (selectedIndex * angleStep)) % 360;
    const totalRotations = 360 * 10; // Dál 10 voltas completas para o efeito visual
    const finalRotationAngle = totalRotations + targetAngle;

    let startTime = null;

    function animateSpin(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Curva de desaceleração (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = easeOut * finalRotationAngle;

        DOM.wheel3D.style.transform = `rotateY(${currentRotation}deg)`;

        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            // Finaliza o giro travando no ângulo exato do número sorteado
            gameState.isSpinning = false;
            DOM.wheel3D.style.transform = `rotateY(${finalRotationAngle}deg)`;
            audioManager.stop('roleta');
            audioManager.play('acerto');
            showQuestionForTable(selectedTable);
        }
    }

    requestAnimationFrame(animateSpin);
}

    function showQuestionForTable(tableNum) {
        const available = gameState.questions.filter(q => q.tabuada === tableNum && !q.respondida);
        const questionObj = available[Math.floor(Math.random() * available.length)];

        gameState.currentQuestion = questionObj;

        DOM.badgeTabuada.textContent = `TABUADA DO ${tableNum}`;
        DOM.questionText.textContent = `${questionObj.tabuada} × ${questionObj.multiplicador} = ?`;
        DOM.questionBox.classList.remove('hidden');
        DOM.inputAnswer.focus();
    }

    function handleAnswerSubmit(e) {
        e.preventDefault();
        const userAns = parseInt(DOM.inputAnswer.value, 10);
        if (isNaN(userAns)) return;

        if (userAns === gameState.currentQuestion.resposta) {
            audioManager.play('acerto');
            showFeedback("🎉 MUITO BEM! Resposta correta!", "correct");
            
            gameState.currentQuestion.respondida = true;
            gameState.completedCount++;
            updateDashboard();

            setTimeout(() => {
                if (gameState.completedCount >= gameState.totalQuestions) {
                    finishGame();
                } else {
                    resetRoundState();
                }
            }, 1800);

        } else {
            audioManager.play('erro');
            gameState.errorCount++;
            showFeedback("❌ OPS! TENTE NOVAMENTE!", "wrong");
            DOM.inputAnswer.value = '';
            DOM.inputAnswer.focus();
        }
    }

    function showFeedback(text, type) {
        DOM.feedbackMsg.textContent = text;
        DOM.feedbackMsg.className = `feedback-message ${type}`;
    }

    function launchConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        
        container.innerHTML = '';
        const colors = ['#ffc107', '#4caf50', '#2196f3', '#e91e63', '#9c27b0'];

        for (let i = 0; i < 80; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + 'vw';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay = (Math.random() * 2) + 's';
            
            if (Math.random() > 0.5) {
                piece.style.borderRadius = '50%';
            }
            
            container.appendChild(piece);
        }
    }

    function finishGame() {
        audioManager.play('vitoria');
        
        DOM.statCompleted.textContent = gameState.completedCount;
        DOM.statErrors.textContent = gameState.errorCount;
        
        const totalAttempts = gameState.completedCount + gameState.errorCount;
        const accuracy = Math.round((gameState.completedCount / totalAttempts) * 100);
        DOM.statAccuracy.textContent = `${accuracy}%`;

        launchConfetti();
        switchScreen('victory');
    }

    function switchScreen(targetScreenKey) {
        Object.keys(screens).forEach(key => {
            if (key === targetScreenKey) {
                screens[key].classList.remove('hidden');
            } else {
                screens[key].classList.add('hidden');
            }
        });
    }

    function setupEventListeners() {
        DOM.btnSelectAll.addEventListener('click', () => {
            gameState.selectedTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            document.querySelectorAll('.table-card').forEach(c => c.classList.add('selected'));
            DOM.msgWarning.classList.add('hidden');
        });

        DOM.btnClearAll.addEventListener('click', () => {
            gameState.selectedTables = [];
            document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
        });

        DOM.btnStart.addEventListener('click', startGame);
        DOM.btnSpin.addEventListener('click', spinWheel);
        DOM.formAnswer.addEventListener('submit', handleAnswerSubmit);

        DOM.btnAudioToggle.addEventListener('click', () => {
            gameState.audioEnabled = !gameState.audioEnabled;
            DOM.btnAudioToggle.textContent = gameState.audioEnabled ? '🔊 Som' : '🔇 Mudo';
        });

        DOM.btnCloseGame.addEventListener('click', () => DOM.modalConfirm.classList.remove('hidden'));
        DOM.btnModalCancel.addEventListener('click', () => DOM.modalConfirm.classList.add('hidden'));
        DOM.btnModalConfirm.addEventListener('click', () => {
            DOM.modalConfirm.classList.add('hidden');
            audioManager.stop('roleta');
            switchScreen('home');
        });

        DOM.btnRestart.addEventListener('click', startGame);
        DOM.btnHome.addEventListener('click', () => switchScreen('home'));
    }

    initApp();
});
