/**
 * main.js (for GCS)
 * * The main entry point for the Gaze Control System.
 */

import { GCSController } from './GCSController.js';

// This will be our global GCS instance that the sorting game can talk to.
let gcsController = null;

document.addEventListener('DOMContentLoaded', () => {
    gcsController = new GCSController();
    
    // Make the controller instance globally accessible for the sorting game
    // This is a simple way to communicate between modules for now.
    window.gcs = gcsController;
});
