/**
 * UIManager.js
 * * Manages all direct interactions with the DOM for the sorting game.
 */

export class UIManager {
    constructor() {
        // Cache all necessary DOM elements
        this.deckContainer = document.getElementById('deckContainer');
        this.leftDropZone = document.getElementById('leftDropZone');
        this.rightDropZone = document.getElementById('rightDropZone');
        this.leftCounter = document.getElementById('leftCounter');
        this.rightCounter = document.getElementById('rightCounter');
        this.instructions = document.querySelector('#instructionsContainer h1');
        this.eyesContainer = document.querySelector('.eyes-container');

        // Modal elements
        this.nameEntryModal = document.getElementById('nameEntryModal');
        this.participantIdInput = document.getElementById('participantIdInput');
        this.submitNameButton = document.getElementById('submitNameButton');
        this.nameError = document.getElementById('nameError');

        this.roundModal = document.getElementById('roundModal');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalButton = document.getElementById('modalButton');
        this.testSessionButton = document.getElementById('testSessionButton');

        this.draggedCard = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    // --- ÄNDERUNG HIER ---
    /**
     * Attaches a single mousedown event listener to handle both revealing and dragging.
     * @param {HTMLElement} cardEl - The card element.
     * @param {Function} onReveal - Callback function when the card is first clicked.
     * @param {Function} onDrop - Callback function when the card is dropped.
     */
    addCardEventListeners(cardEl, onReveal, onDrop) {
        cardEl.addEventListener('mousedown', (e) => {
            // If the card isn't revealed yet, call the reveal logic first.
            if (!cardEl.classList.contains('revealed')) {
                onReveal(cardEl);
            }
            // Immediately start the drag process.
            this.onDragStart(e, cardEl, onDrop);
        });
    }

    onDragStart(event, cardEl, onDrop) {
        // This check is now redundant because the reveal happens before, but we keep it for safety.
        if (!cardEl.classList.contains('revealed')) return;
        
        this.draggedCard = cardEl;
        
        const rect = cardEl.getBoundingClientRect();
        this.dragOffsetX = event.clientX - rect.left;
        this.dragOffsetY = event.clientY - rect.top;

        document.body.appendChild(this.draggedCard);
        this.draggedCard.style.position = 'absolute';
        this.draggedCard.style.zIndex = 2000;

        this.dragMoveHandler = (e) => this.onDragMove(e);
        this.dragEndHandler = (e) => this.onDragEnd(e, onDrop);

        window.addEventListener('mousemove', this.dragMoveHandler);
        window.addEventListener('mouseup', this.dragEndHandler, { once: true });
    }

    onDragMove(event) {
        if (!this.draggedCard) return;
        event.preventDefault();
        
        const cardRect = this.draggedCard.getBoundingClientRect();
        let x = event.clientX - this.dragOffsetX;
        let y = event.clientY - this.dragOffsetY;

        x = Math.max(0, Math.min(x, window.innerWidth - cardRect.width));
        y = Math.max(0, Math.min(y, window.innerHeight - cardRect.height));

        this.draggedCard.style.left = `${x}px`;
        this.draggedCard.style.top = `${y}px`;

        this.leftDropZone.classList.toggle('highlight', this.isOver(this.draggedCard, this.leftDropZone));
        this.rightDropZone.classList.toggle('highlight', this.isOver(this.draggedCard, this.rightDropZone));
    }

    onDragEnd(event, onDrop) {
        if (!this.draggedCard) return;

        window.removeEventListener('mousemove', this.dragMoveHandler);
        
        let droppedSide = null;
        if (this.isOver(this.draggedCard, this.leftDropZone)) {
            droppedSide = 'left';
        } else if (this.isOver(this.draggedCard, this.rightDropZone)) {
            droppedSide = 'right';
        }

        this.leftDropZone.classList.remove('highlight');
        this.rightDropZone.classList.remove('highlight');

        if (droppedSide) {
            onDrop(droppedSide);
            this.draggedCard.remove();
        } else {
            this.draggedCard.style.position = 'absolute';
            this.draggedCard.style.left = '';
            this.draggedCard.style.top = '';
            this.draggedCard.style.zIndex = this.deckContainer.children.length;
            this.deckContainer.appendChild(this.draggedCard);
        }

        this.draggedCard = null;
    }
    
    // (The rest of the UIManager methods remain unchanged)
    showNameEntryModal(onSubmit) {
        this.nameEntryModal.style.display = 'flex';
        this.submitNameButton.onclick = () => {
            const participantId = this.participantIdInput.value.trim();
            if (participantId) {
                this.nameError.textContent = '';
                this.hideModal(this.nameEntryModal);
                onSubmit(participantId);
            } else {
                this.nameError.textContent = 'Please enter a valid ID.';
            }
        };
    }
    showStartModal({ onStartGame, onStartPractice }) {
        this.roundModal.style.display = 'flex';
        this.modalButton.onclick = () => {
            this.hideModal(this.roundModal);
            onStartGame();
        };
        if (onStartPractice) {
            this.testSessionButton.style.display = 'block';
            this.testSessionButton.onclick = () => {
                this.hideModal(this.roundModal);
                onStartPractice();
            };
        } else {
            this.testSessionButton.style.display = 'none';
        }
    }
    hideModal(modalEl) {
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }
    createDeck(count) {
        this.deckContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const cardEl = document.createElement('div');
            cardEl.classList.add('card');
            cardEl.dataset.cardId = i;
            cardEl.style.transform = `translate(${i * 2}px, ${i * 2}px)`;
            cardEl.style.zIndex = i;
            this.deckContainer.appendChild(cardEl);
        }
    }
    updateCounters(left, right) {
        this.leftCounter.textContent = left;
        this.rightCounter.textContent = right;
    }
    updateInstructions(text) {
        this.instructions.textContent = text;
    }
    updateRobotName(name) {
        const headline = document.getElementById('robotNameHeadline');
        if (headline) {
            headline.textContent = name;
        }
    }
    updateRobotPicture(imageUrl) {
        const gcsContainer = document.getElementById('gcs-container');
        if (gcsContainer && imageUrl) {
            gcsContainer.style.backgroundImage = `url('${imageUrl}')`;
        } else if (gcsContainer) {
            gcsContainer.style.backgroundImage = 'none';
        }
    }
    updateEyeAppearance(config) {
        if (!this.eyesContainer || !config) return;
        this.eyesContainer.style.top = config.container_top;
        this.eyesContainer.style.marginTop = config.container_margin_top;
        this.eyesContainer.style.gap = config.gap;
        const eyes = this.eyesContainer.querySelectorAll('.eye');
        eyes.forEach(eye => {
            eye.style.width = config.eye_width;
            eye.style.height = config.eye_height;
        });
        const pupils = this.eyesContainer.querySelectorAll('.pupil');
        const pupilW = parseFloat(config.pupil_width);
        const pupilH = parseFloat(config.pupil_height);
        pupils.forEach(pupil => {
            pupil.style.width = config.pupil_width;
            pupil.style.height = config.pupil_height;
            pupil.style.top = `calc(50% - ${pupilH / 2}px)`;
            pupil.style.left = `calc(50% - ${pupilW / 2}px)`;
        });
    }
    revealCard(cardEl, questionText) {
        cardEl.innerHTML = `<span>${questionText}</span>`;
        cardEl.classList.add('revealed');
        cardEl.style.zIndex = 1000;
    }
    isOver(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }
}