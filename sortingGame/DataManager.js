/**
 * DataManager.js
 * * Handles fetching and parsing of external data, like the questions CSV.
 */

import { CSV_FILE_PATH } from './config.js';

export class DataManager {
    constructor() {
        this.testQuestions = [];
        this.mainGameQuestions = [];
    }

    async loadQuestions() {
        try {
            const response = await fetch(CSV_FILE_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const csvText = await response.text();
            this.parseCSV(csvText);
            console.log("DataManager: Questions loaded and parsed successfully.");
        } catch (error) {
            console.error('DataManager: Error loading or parsing CSV file:', error);
            alert("Failed to load questions. Please check the console and the CSV file path.");
            throw error;
        }
    }

    parseCSV(text) {
        this.testQuestions = [];
        this.mainGameQuestions = [];

        // Robusteres Splitten der Zeilen, das verschiedene Zeilenumbrüche (LF und CRLF) berücksichtigt.
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return;

        // Entfernt explizit unsichtbare Zeichen aus der Kopfzeile vor dem Splitten.
        const headers = lines[0].trim().split(',').map(h => h.trim().toLowerCase());
        
        // --- DEBUGGING HINZUGEFÜGT ---
        console.log("[DEBUG] Gelesene Spaltenüberschriften aus CSV:", headers);
        const difficultyIndex = headers.indexOf('difficulty');
        console.log(`[DEBUG] Der Index für die Spalte 'difficulty' ist: ${difficultyIndex}`);
        // --- ENDE DEBUGGING ---

        const questionIndex = headers.indexOf('question');
        const answerIndex = headers.indexOf('correct_answer');
        const roundIndex = headers.indexOf('round');

        // Sicherheitsabfrage, falls die Spalte immer noch nicht gefunden wird.
        if (difficultyIndex === -1) {
            console.error("DataManager Error: Die Spalte 'difficulty' konnte in der CSV-Datei nicht gefunden werden. Überprüfen Sie die Kopfzeile.", headers);
        }

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const round = cols[roundIndex]?.trim().toLowerCase();
            
            const questionData = {
                question: cols[questionIndex]?.trim() || 'No Question Text',
                correctAnswer: cols[answerIndex]?.trim().toUpperCase() === 'TRUE',
                // Lese den Wert nur aus, wenn der Index gültig ist.
                difficulty: difficultyIndex !== -1 ? (cols[difficultyIndex]?.trim() || 'unspecified') : 'unspecified'
            };

            // --- DEBUGGING HINZUGEFÜGT ---
            if (i === 1) { // Logge nur das erste geparste Objekt
                console.log("[DEBUG] Erstes geparstes Frage-Objekt:", questionData);
            }
            // --- ENDE DEBUGGING ---

            if (round === 'test') {
                this.testQuestions.push(questionData);
            } else {
                this.mainGameQuestions.push(questionData);
            }
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getMainGameDeck() {
        this.shuffleArray(this.mainGameQuestions);
        return [...this.mainGameQuestions];
    }

    getTestDeck() {
        this.shuffleArray(this.testQuestions);
        return [...this.testQuestions];
    }
}
