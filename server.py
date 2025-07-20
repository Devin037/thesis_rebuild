import asyncio
import websockets
import json
import csv
from datetime import datetime
import os

# --- Configuration ---
LOG_FILE = 'experiment_log.csv'
# --- THIS IS THE CHANGE: Updated header columns ---
CSV_HEADER = [
    'participant_id',
    'robot_condition',
    'card_question',
    'difficulty',
    'correct_side',
    'participant_choice',
    'robots_gaze_direction',
    'timestamp_reveal',
    'timestamp_drop'
]

def initialize_csv():
    """Creates the CSV file with a header if it doesn't exist."""
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADER)
        print(f"Created log file: {LOG_FILE}")

async def log_handler(websocket, path):
    """Handles incoming WebSocket messages and logs them to the CSV."""
    print("Client connected to logging server.")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                payload = data.get('payload', {})
                
                # --- THIS IS THE CHANGE: Map new data fields ---
                log_entry = {
                    'participant_id': payload.get('participantId'),
                    'robot_condition': payload.get('condition'),
                    'card_question': payload.get('question'),
                    'difficulty': payload.get('difficulty'),
                    'correct_side': 'left' if payload.get('correctAnswer') else 'right',
                    'participant_choice': payload.get('choice'),
                    'robots_gaze_direction': payload.get('robots_gaze_direction'),
                    'timestamp_reveal': payload.get('timestamp_reveal'),
                    'timestamp_drop': payload.get('timestamp_drop')
                }

                # We only want to log the full trial data, not other events
                if data.get('event') == 'cardDrop':
                    with open(LOG_FILE, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=CSV_HEADER)
                        writer.writerow(log_entry)
                    
                    print(f"Logged cardDrop for participant {payload.get('participantId')}")

            except json.JSONDecodeError:
                print(f"Error: Received non-JSON message: {message}")
            except Exception as e:
                print(f"An error occurred: {e}")

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected.")

async def main():
    """Starts the WebSocket server."""
    initialize_csv()
    async with websockets.serve(log_handler, "localhost", 8765):
        print("Logging server started on ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
