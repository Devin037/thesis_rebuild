/**
 * GCSController.js
 * * This version returns the actual gaze direction.
 */

import { PupilController } from './GazeMechanics.js';
import { MutualGaze, InitiatingJointAttention, RespondingJointAttention, DynamicGaze } from './GazeBehaviors.js';

/**
 * Manages the WebSocket connection to the Python perception server.
 */
class PerceptionService {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // Callback function to update the controller's context
        this.connect();
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:8766');
        this.ws.onopen = () => console.log("GCS: Connected to Perception Server.");
        this.ws.onclose = () => {
            console.log("GCS: Disconnected from Perception Server. Reconnecting in 3s.");
            setTimeout(() => this.connect(), 3000);
        };
        this.ws.onerror = (err) => console.error("GCS: Perception WebSocket error:", err);
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'faceDetection') {
                    this.onUpdate(data);
                }
            } catch (e) {
                console.error("GCS: Error parsing perception message", e);
            }
        };
    }
}

export class GCSController {
    constructor() {
        this.pupilController = new PupilController();
        this.perceptionContext = {
            userInFront: false,
            faceX: null,
            faceY: null,
            secondFaceX: null,
            secondFaceY: null,
            headDirection: "none"
        };
        this.perceptionService = new PerceptionService((data) => {
            this.perceptionContext.userInFront = data.userInFront;
            this.perceptionContext.faceX = data.faceX;
            this.perceptionContext.faceY = data.faceY;
            this.perceptionContext.secondFaceX = data.secondFaceX;
            this.perceptionContext.secondFaceY = data.secondFaceY;
            this.perceptionContext.headDirection = data.headDirection;
        });
        this.currentBehavior = new MutualGaze();
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.triggerInitiatingJointAttention('left');
            } else if (e.key === 'ArrowRight') {
                this.triggerInitiatingJointAttention('right');
            }
        });
        this.startGazeLoop();
    }

    startGazeLoop() {
        const loop = () => {
            this.update();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update() {
        if (this.currentBehavior) {
            this.currentBehavior.apply(this.pupilController, this.perceptionContext);
        }
        if (this.currentBehavior && this.currentBehavior.isFinished) {
            this.currentBehavior = new MutualGaze();
        }
    }

    /**
     * Triggers a gaze cue and returns the actual direction the robot looked.
     * @param {'left' | 'right'} direction - The correct direction for the gaze.
     * @param {object} condition - The current experimental condition.
     * @returns {string} The actual direction of the gaze ('left' or 'right').
     */
    triggerInitiatingJointAttention(direction, condition) {
        this.currentBehavior = new InitiatingJointAttention(direction, condition);
        console.log(`GCS: Triggering InitiatingJA. Correct direction: ${direction}`);
        
        // Gib die tatsächliche Blickrichtung zurück.
        return this.currentBehavior.actualGazeDirection;
    }
}