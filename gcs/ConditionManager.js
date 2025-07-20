/**
 * ConditionManager.js
 * * Loads and manages the experimental conditions from a JSON file.
 */

const CONDITIONS_PATH = 'gcs/conditions.json';

export class ConditionManager {
    constructor() {
        this.conditions = [];
        this.lastConditionName = null;
    }

    /**
     * Loads the conditions from the JSON file.
     */
    async loadConditions() {
        try {
            const response = await fetch(CONDITIONS_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            this.conditions = await response.json();
            console.log("ConditionManager: Conditions loaded successfully", this.conditions);
            if (this.conditions.length === 0) {
                console.error("ConditionManager: No conditions found in JSON file.");
            }
        } catch (error) {
            console.error("ConditionManager: Failed to load conditions.json", error);
        }
    }

    /**
     * Gets the next condition in a semi-random order, ensuring it's not the same as the last one.
     * @returns {object | null} The next condition object or null if none are loaded.
     */
    getNextCondition() {
        if (this.conditions.length === 0) return null;
        if (this.conditions.length === 1) return this.conditions[0];

        // Filter out the last used condition to avoid immediate repeats
        const availableConditions = this.conditions.filter(c => c.condition_name !== this.lastConditionName);
        
        // Select a random condition from the available pool
        const randomIndex = Math.floor(Math.random() * availableConditions.length);
        const nextCondition = availableConditions[randomIndex];

        this.lastConditionName = nextCondition.condition_name;
        
        console.log(`ConditionManager: Next condition is "${this.lastConditionName}"`);
        return nextCondition;
    }
}