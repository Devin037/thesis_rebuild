/**
 * GameController.js
 * * This version centralizes all gaze logic and handles final logging requirements.
 */

import { DataManager } from './DataManager.js';
import { UIManager } from './UIManager.js';
import { REVEAL_DELAY_MS } from './config.js';
import { logger } from '../shared/Logger.js';
import { ConditionManager } from '../gcs/ConditionManager.js';

export class GameController {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager();
        this.conditionManager = new ConditionManager();

        this.gameState = 'INIT';
        this.participantId = null;
        this.currentCondition = null;
        this.deck = [];
        this.currentCard = null;
        this.score = { left: 0, right: 0 };
    }

    async init() {
        this.setGameState('ID_ENTRY');
        await Promise.all([
            this.dataManager.loadQuestions(),
            this.conditionManager.loadConditions()
        ]);
        this.uiManager.showNameEntryModal((id) => this.handleIdSubmit(id));
    }

    setGameState(newState) {
        this.gameState = newState;
        console.log(`Game State -> ${this.gameState}`);
    }

    handleIdSubmit(id) {
        if (this.gameState !== 'ID_ENTRY') return;
        this.participantId = id;
        this.setGameState('MENU');

        const hasTestQuestions = this.dataManager.testQuestions.length > 0;
        this.uiManager.showStartModal({
            onStartGame: () => this.startNewGame('main'),
            onStartPractice: hasTestQuestions ? () => this.startNewGame('test') : null
        });
    }

    startNewGame(gameType) {
        if (this.gameState !== 'MENU') return;
        
        this.setGameState(gameType === 'main' ? 'PLAYING_MAIN' : 'PLAYING_TEST');
        this.deck = gameType === 'main' ? this.dataManager.getMainGameDeck() : this.dataManager.getTestDeck();
        this.score = { left: 0, right: 0 };
        
        this.uiManager.updateInstructions("Click a card to reveal");
        
        if (this.deck.length > 0) {
            this.uiManager.createDeck(this.deck.length);
            this.uiManager.updateCounters(0, 0);

            if (gameType === 'main') {
                this.applyNextCondition();
            } else {
                this.uiManager.updateRobotName("Practice Round");
                this.uiManager.updateRobotPicture(null);
            }

            this.prepareNextCard();
        } else {
            this.uiManager.updateInstructions(`No questions found for ${gameType} game!`);
        }
    }

    applyNextCondition() {
        this.currentCondition = this.conditionManager.getNextCondition();
        if (this.currentCondition) {
            console.log("Switching to condition:", this.currentCondition.condition_name);
            this.uiManager.updateRobotName(this.currentCondition.condition_name);
            this.uiManager.updateRobotPicture(this.currentCondition.picture);

            if (this.currentCondition.eye_config) {
                this.uiManager.updateEyeAppearance(this.currentCondition.eye_config);
                if (window.gcs) {
                    window.gcs.pupilController.updateDimensions(this.currentCondition.eye_config);
                }
            }
        } else {
            this.endGame();
        }
    }

    prepareNextCard() {
        this.currentCard = this.deck.pop() || null;
        if (this.currentCard) {
            this.currentCard.gazeDirection = 'none'; 
            const topCardEl = this.uiManager.deckContainer.lastChild;
            if (topCardEl) {
                this.uiManager.addCardEventListeners(
                    topCardEl,
                    (cardEl) => this.handleReveal(cardEl),
                    (side) => this.handleDrop(side)
                );
            }
        } else {
            this.endGame();
        }
    }

    handleReveal(cardEl) {
        if (this.gameState !== 'PLAYING_TEST' && this.gameState !== 'PLAYING_MAIN') return;
        if (!this.currentCard) return;

        this.uiManager.revealCard(cardEl, this.currentCard.question);
        
        const correctDirection = this.currentCard.correctAnswer ? 'left' : 'right';
        let finalGazeDirection = 'none';

        if (this.currentCondition && this.currentCondition.initiatingJointAttention) {
            if (Math.random() <= this.currentCondition.gaze_validity) {
                finalGazeDirection = correctDirection;
            } else {
                finalGazeDirection = correctDirection === 'left' ? 'right' : 'left';
            }
        }
        
        this.currentCard.gazeDirection = finalGazeDirection;
        console.log(`[DEBUG] Gaze direction for this trial is: ${this.currentCard.gazeDirection}`);

        if (window.gcs && finalGazeDirection !== 'none') {
            window.gcs.triggerInitiatingJointAttention(finalGazeDirection);
        }
    }

    handleDrop(side) {
        if (this.gameState !== 'PLAYING_TEST' && this.gameState !== 'PLAYING_MAIN') return;
        if (!this.currentCard) return;

        if (side) {
            // Loggen nur im Hauptspiel
            if (this.gameState === 'PLAYING_MAIN') {
                logger.log('cardDrop', {
                    participantId: this.participantId,
                    condition: this.currentCondition ? this.currentCondition.condition_name : 'N/A',
                    question: this.currentCard.question,
                    difficulty: this.currentCard.difficulty, // NEU
                    correctAnswer: this.currentCard.correctAnswer,
                    choice: side,
                    robots_gaze_direction: this.currentCard.gazeDirection || 'none'
                });
            }

            if (side === 'left') this.score.left++;
            if (side === 'right') this.score.right++;
            this.uiManager.updateCounters(this.score.left, this.score.right);
            
            if (this.gameState === 'PLAYING_MAIN') {
                this.applyNextCondition();
            }
            
            this.prepareNextCard();
        }
    }

    endGame() {
        const lastGameType = this.gameState;
        this.setGameState('FINISHED_ROUND');

        // Loggen des Rundenendes nur für das Hauptspiel
        if (lastGameType === 'PLAYING_MAIN') {
            logger.log('roundOver', {
                participantId: this.participantId,
                finalScore: this.score,
                gameType: lastGameType
            });
        }

        if (lastGameType === 'PLAYING_TEST') {
            this.uiManager.updateInstructions("Practice Finished! Press Start to begin the main game.");
            this.setGameState('MENU');
            this.uiManager.showStartModal({
                onStartGame: () => this.startNewGame('main'),
                onStartPractice: null
            });
             this.uiManager.modalMessage.textContent = "Practice Complete!";
             this.uiManager.modalButton.textContent = "Start Game";
        } else {
            this.setGameState('FINISHED');
            this.uiManager.updateInstructions("Experiment Finished! Thank you for participating.");
        }
    }
}
