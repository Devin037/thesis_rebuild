/**
 * GazeMechanics.js
 * * Contains the low-level classes and controllers for pupil movement.
 */

/**
 * A controller to manage the direct DOM manipulation of the pupils.
 */
export class PupilController {
    constructor() {
        this.leftPupil = document.getElementById('leftPupil');
        this.rightPupil = document.getElementById('rightPupil');
        this.currentGazeX = 0.5;
        this.currentGazeY = 0.5;

        // Initialize with default values from your CSS
        this.maxHorizontalOffset = 34; // (104 / 2) - (36 / 2)
        this.maxVerticalOffset = 24;   // (84 / 2) - (36 / 2)

        if (!this.leftPupil || !this.rightPupil) {
            console.error("GCS Error: Pupil DOM elements not found!");
        }
    }

    /**
     * Updates the internal offsets based on new eye/pupil dimensions.
     * This MUST be called whenever the eye/pupil CSS is changed.
     * @param {object} config - The eye_config object from the condition.
     */
    updateDimensions(config) {
        // Helper to parse '104px' into the number 104
        const parse = (val) => parseFloat(val) || 0;

        const eyeW = parse(config.eye_width);
        const eyeH = parse(config.eye_height);
        const pupilW = parse(config.pupil_width);
        const pupilH = parse(config.pupil_height);

        this.maxHorizontalOffset = (eyeW / 2) - (pupilW / 2);
        this.maxVerticalOffset = (eyeH / 2) - (pupilH / 2);

        console.log(`GCS Dimensions Updated: H-Offset=${this.maxHorizontalOffset.toFixed(1)}, V-Offset=${this.maxVerticalOffset.toFixed(1)}`);
    }


    /**
     * Sets the transform property for both pupils.
     * @param {number} targetX - The horizontal target (0 to 1).
     * @param {number} targetY - The vertical target (0 to 1).
     */
    setTransform(targetX, targetY) {
        if (!this.leftPupil || !this.rightPupil) return;

        const clampedX = Math.max(0.05, Math.min(0.95, targetX));
        const clampedY = Math.max(0.2, Math.min(0.8, targetY));

        // Use the dynamically calculated offsets
        const offsetX = ((clampedX - 0.5) * 2) * this.maxHorizontalOffset;
        const offsetY = ((clampedY - 0.5) * 2) * this.maxVerticalOffset;

        this.currentGazeX = clampedX;
        this.currentGazeY = clampedY;

        const transformString = `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px)`;
        this.leftPupil.style.transform = transformString;
        this.rightPupil.style.transform = transformString;
    }
}


// --- Low-Level Gaze Mechanics ---
// These classes define basic eye movements. They are given a pupilController
// to act upon, rather than calling global functions.

export class Fixation {
    constructor(targetX, targetY, duration) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.duration = duration;
        this.startTime = Date.now();
        this.name = "Fixation";
    }

    /**
     * Applies the fixation.
     * @param {PupilController} pupilController - The controller for the pupils.
     * @returns {boolean} - True if the fixation is still active, false if finished.
     */
    apply(pupilController) {
        const elapsed = Date.now() - this.startTime;
        if (elapsed < this.duration) {
            pupilController.setTransform(this.targetX, this.targetY);
            return true;
        }
        return false;
    }
}

export class Saccade {
    constructor(startX, startY, endX, endY, speed = 0.15) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.speed = Math.max(0.01, speed);
        this.progress = 0;
        this.name = "Saccade";
    }

    apply(pupilController) {
        if (this.progress < 1) {
            this.progress += this.speed;
            this.progress = Math.min(1, this.progress);
            const currentX = this.startX + (this.endX - this.startX) * this.progress;
            const currentY = this.startY + (this.endY - this.startY) * this.progress;
            pupilController.setTransform(currentX, currentY);
            return true;
        }
        pupilController.setTransform(this.endX, this.endY);
        return false;
    }
}

export class SmoothPursuit {
    constructor(targetX, targetY, smoothness = 0.1) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.smoothness = smoothness;
        this.name = "SmoothPursuit";
    }

    updateTarget(newTargetX, newTargetY) {
        this.targetX = newTargetX;
        this.targetY = newTargetY;
    }

    apply(pupilController) {
        const currentX = pupilController.currentGazeX;
        const currentY = pupilController.currentGazeY;
        const newX = currentX + (this.targetX - currentX) * this.smoothness;
        const newY = currentY + (this.targetY - currentY) * this.smoothness;
        pupilController.setTransform(newX, newY);
        return true; // Always active until a new behavior takes over
    }
}