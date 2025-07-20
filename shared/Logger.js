/**
 * Logger.js
 * * A shared module for logging events to a WebSocket server.
 */

const LOGGING_SERVER_URL = 'ws://localhost:8765'; // The address of your Python logging server

class Logger {
    constructor() {
        this.ws = null;
        this.messageQueue = [];
        this.connect();
    }

    /**
     * Establishes a connection to the WebSocket logging server.
     */
    connect() {
        this.ws = new WebSocket(LOGGING_SERVER_URL);

        this.ws.onopen = () => {
            console.log("Logger: Connected to logging server.");
            // Send any messages that were queued while disconnected
            this.messageQueue.forEach(msg => this.ws.send(JSON.stringify(msg)));
            this.messageQueue = [];
        };

        this.ws.onclose = () => {
            console.log("Logger: Disconnected from logging server. Will attempt to reconnect in 5 seconds.");
            setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error("Logger: WebSocket error:", error);
            this.ws.close();
        };
    }

    /**
     * Logs an event by sending it to the server.
     * @param {string} eventType - The type of event (e.g., 'cardReveal', 'cardDrop').
     * @param {object} data - The data payload for the event.
     */
    log(eventType, data) {
        const message = {
            event: eventType,
            payload: data,
            timestamp_client: new Date().toISOString() // Add a client-side timestamp
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // If the connection is not open, queue the message
            this.messageQueue.push(message);
            console.log("Logger: Connection not open. Queued message:", message);
        }
    }
}

// Export a single instance of the logger to be used throughout the application
export const logger = new Logger();