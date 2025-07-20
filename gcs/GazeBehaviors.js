/**
 * GazeBehaviors.js
 * * Contains the high-level gaze behaviors built from the low-level mechanics.
 */

import { Fixation, Saccade, SmoothPursuit } from './GazeMechanics.js';

/**
 * Base class for all high-level gaze behaviors.
 */
class GazeBehavior {
    constructor() {
        this.name = "GazeBehavior";
        this.isFinished = false;
    }

    apply(pupilController, context) {
        throw new Error("Apply method must be implemented by subclass.");
    }
}

/**
 * GazeAversion: A sub-behavior that looks away from the user briefly.
 */
export class GazeAversion {
    constructor(aversionDuration = 300, intervalMin = 1000, intervalMax = 3000) {
        this.name = "GazeAversion";
        this.aversionDuration = aversionDuration;
        this.intervalMin = intervalMin;
        this.intervalMax = intervalMax;
        this.aversionFixation = null;
        this.scheduleNextAversion();
    }

    scheduleNextAversion() {
        const interval = this.intervalMin + Math.random() * (this.intervalMax - this.intervalMin);
        this.nextAversionTime = Date.now() + interval;
    }

    update(pupilController) {
        if (this.aversionFixation) {
            if (this.aversionFixation.apply(pupilController)) {
                return true;
            } else {
                this.aversionFixation = null;
                this.scheduleNextAversion();
                return false;
            }
        }

        if (Date.now() >= this.nextAversionTime) {
            const randomOffsetX = (Math.random() - 0.5) * 0.2;
            const randomOffsetY = (Math.random() - 0.5) * 0.7;
            const finalTargetX = Math.max(0.15, Math.min(0.85, 0.5 + randomOffsetX));
            const finalTargetY = Math.max(0.1, Math.min(0.9, 0.5 + randomOffsetY));
            
            this.aversionFixation = new Fixation(finalTargetX, finalTargetY, this.aversionDuration);
            return true;
        }
        return false;
    }
}

/**
 * MutualGaze: Looks at the detected face, incorporating gaze aversion.
 */
export class MutualGaze extends GazeBehavior {
    constructor(smoothness = 0.1) {
        super();
        this.name = "MutualGaze";
        this.pursuit = new SmoothPursuit(0.5, 0.5, smoothness);
        this.gazeAversion = new GazeAversion();
    }

    apply(pupilController, context) {
        this.isFinished = false; 

        if (this.gazeAversion.update(pupilController)) {
            return;
        }

        let targetX = 0.5, targetY = 0.5;
        if (context.userInFront && context.faceX !== null) {
            targetX = 1.0 - context.faceX;
            targetY = context.faceY;
        }
        
        this.pursuit.updateTarget(targetX, targetY);
        this.pursuit.apply(pupilController);
    }
}

/**
 * A base for joint attention behaviors (looking to a side and returning).
 */
class JointAttention extends GazeBehavior {
    constructor(direction) {
        super();
        this.phase = 'transitionToSide'; // transitionToSide, hold, returnToUser
        this.startTime = Date.now();
        this.holdDuration = 1500; // ms
        this.targetX = (direction === "left") ? 0.15 : 0.85;
        this.targetY = 0.5;
        this.saccade = null;
        this.fixation = null;
    }

    apply(pupilController, context) {
        const now = Date.now();
        const userTargetX = context.userInFront ? (1.0 - context.faceX) : 0.5;
        const userTargetY = context.userInFront ? context.faceY : 0.5;

        switch (this.phase) {
            case 'transitionToSide':
                if (!this.saccade) {
                    this.saccade = new Saccade(pupilController.currentGazeX, pupilController.currentGazeY, this.targetX, this.targetY);
                }
                if (!this.saccade.apply(pupilController)) {
                    this.phase = 'hold';
                    this.startTime = now;
                    this.saccade = null;
                }
                break;

            case 'hold':
                if (!this.fixation) {
                    this.fixation = new Fixation(this.targetX, this.targetY, this.holdDuration);
                }
                if (!this.fixation.apply(pupilController)) {
                    this.phase = 'returnToUser';
                    this.fixation = null;
                }
                break;

            case 'returnToUser':
                 if (!this.saccade) {
                    this.saccade = new Saccade(pupilController.currentGazeX, pupilController.currentGazeY, userTargetX, userTargetY);
                }
                if (!this.saccade.apply(pupilController)) {
                    this.isFinished = true;
                }
                break;
        }
    }
}

/**
 * InitiatingJointAttention: Looks to a side, holds, and returns.
 * This version includes logic for gaze validity.
 */
export class InitiatingJointAttention extends JointAttention {
    constructor(correctDirection, condition) {
        let finalDirection = correctDirection;
        
        // Check for gaze validity from the condition object
        if (condition && typeof condition.gaze_validity !== 'undefined') {
            // If a random number is greater than the validity, the gaze is invalid.
            if (Math.random() > condition.gaze_validity) {
                // Flip the direction for an invalid gaze
                finalDirection = correctDirection === 'left' ? 'right' : 'left';
                console.log(`[Gaze Validity] Invalid gaze. Correct: ${correctDirection}, Showing: ${finalDirection}`);
            } else {
                console.log(`[Gaze Validity] Valid gaze. Correct: ${correctDirection}, Showing: ${finalDirection}`);
            }
        }

        // Call the parent constructor with the determined direction (correct or incorrect)
        super(finalDirection);
        this.name = "InitiatingJointAttention";
    }
}

/**
 * RespondingJointAttention: Responds to user's head turn by looking to the same side.
 */
export class RespondingJointAttention extends JointAttention {
    constructor(userLookDirection) {
        super(userLookDirection);
        this.name = "RespondingJointAttention";
    }
}

/**
 * DynamicGaze: Alternates gaze between two detected faces.
 */
export class DynamicGaze extends GazeBehavior {
    constructor(dwellDuration = 2000, saccadeSpeed = 0.15) {
        super();
        this.name = "DynamicGaze";
        this.dwellDuration = dwellDuration;
        this.saccadeSpeed = saccadeSpeed;
        this.activeFaceIndex = 1;
        this.state = 'dwelling';
        this.stateStartTime = Date.now();
        this.saccade = null;
    }

    apply(pupilController, context) {
        const now = Date.now();
        const face1_present = context.faceX !== null;
        const face2_present = context.secondFaceX !== null;

        if (!face1_present && !face2_present) {
            new SmoothPursuit(0.5, 0.5).apply(pupilController);
            this.isFinished = true;
            return;
        }

        const getTargetCoords = (faceIndex) => {
            if (faceIndex === 1 && face1_present) return { x: 1.0 - context.faceX, y: context.faceY };
            if (faceIndex === 2 && face2_present) return { x: 1.0 - context.secondFaceX, y: context.secondFaceY };
            return null;
        };

        if (this.state === 'dwelling') {
            const currentTarget = getTargetCoords(this.activeFaceIndex);
            if (currentTarget) {
                pupilController.setTransform(currentTarget.x, currentTarget.y);
            } else {
                this.activeFaceIndex = this.activeFaceIndex === 1 ? 2 : 1;
                this.stateStartTime = now;
                return;
            }

            if (now - this.stateStartTime >= this.dwellDuration) {
                const nextFaceIndex = this.activeFaceIndex === 1 ? 2 : 1;
                const nextTarget = getTargetCoords(nextFaceIndex);
                if (nextTarget) {
                    this.saccade = new Saccade(pupilController.currentGazeX, pupilController.currentGazeY, nextTarget.x, nextTarget.y, this.saccadeSpeed);
                    this.state = 'saccading';
                }
            }
        } else if (this.state === 'saccading') {
            if (this.saccade && !this.saccade.apply(pupilController)) {
                this.activeFaceIndex = this.activeFaceIndex === 1 ? 2 : 1;
                this.state = 'dwelling';
                this.stateStartTime = now;
                this.saccade = null;
            }
        }
    }
}