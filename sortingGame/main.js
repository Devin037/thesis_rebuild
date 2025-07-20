/**
 * main.js
 * * The main entry point for the sorting game application.
 */

import { GameController } from './GameController.js';

// Wait for the DOM to be fully loaded before initializing the game.
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameController();
    game.init();
});
