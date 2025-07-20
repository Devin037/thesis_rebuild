# Gaze-Contingent Sorting Experiment

This project is a web-based psychological experiment designed to study the effects of robotic gaze cues on human decision-making in a classification task. Participants interact with a virtual robot that displays various gaze behaviors while they sort a series of true/false statements.
The application is divided into a modular frontend (HTML, CSS, JavaScript) and two Python backend servers: one for data logging and one for real-time face perception.

## Short instructions and information

### Installation:

      - Download the entire package from GitHub, you may want to use VS code to open the file.
      - Make sure you use a new version of Python
      - Make sure you install the necessary libraries (use for example 'pip install [library name]' or 'python3 -m pip install [library name]')
      - Two libraries that you definitely need are Websocket and opencv-python

### Starting the Program:

      - You basically start the program using the Terminal in VS studio.
      - You can use 3 different Terminals.
          - In the first Terminal, start the server.py (type: python3 server.py)
          - In the second Terminal, start the perception script with the camera. (type: python3 perception.py)
          - In the third Terminal, start the local game (type: python3 -m http.server 8000)

      - If all that is running succesfully, you should be able to go on your browser and search for 'localhost:8000' and the program will be open

### Further important information

      - Make sure that everything is working. If you dont see the interactive eyes, try to reload the page.
      - When you start the server.py, a new csv file will be created called "experiment_log.csv". This file will save all the game information. Make sure that this file runs correctly. After the game is over you can copy that file, name it with the participant_id and delete the original from here, so that a new file will be created with the next participant.

### Changes?!

      - You should be able to make some changes for pictures and conditions in the condition.JSON. Here there are currently 3 different conditions, but the flexibility of the program allows you to add or remove conditions in the JSON format, to change the pictures, to change the gaze validity etc.
      - You should also change the csv file "quiz_questions.csv" by adding questions. Use the exact same format (with the same columns), but you are free in the content of the questions, different difficulty levels, the amount of questions etc.

### RUN ON LOCAL NETWORK?!

     - If you want to run the file on the local network, change 'localhost' through the IP address of your local network. After changing that in all of the files, you should be able to start the program from your computer and still access it from another computer using the local address: '[Here local IP-Adress]:8000'

## Table of Contents

1.  [How It Works](#how-it-works)
2.  [Project Structure](#project-structure)
3.  [Setup and Execution](#setup-and-execution)
4.  [Detailed File Description](#detailed-file-description)
    - [Root Directory](#root-directory)
    - [Gaze Control System (`/gcs`)](#gaze-control-system-gcs)
    - [Sorting Game (`/sortingGame`)](#sorting-game-sortinggame)
    - [Shared Modules (`/shared`)](#shared-modules-shared)
5.  [Experiment Configuration](#experiment-configuration)

---

## How It Works

The experiment proceeds as follows:

1.  **Participant ID:** The participant enters a unique ID to start the session.
2.  **Practice Round (Optional):** A short practice round can be completed to get familiar with the task.
3.  **Main Experiment:**
    - A card with a statement appears.
    - The robot's eyes follow the participant's face (`MutualGaze`).
    - When the card is revealed (by clicking), one of several **robot conditions** is randomly selected.
    - Depending on the condition, the robot executes a gaze cue (or not), with varying direction and reliability.
    - The participant drags the card to the "TRUE" or "FALSE" zone.
    - After dropping the card, the trial data (participant ID, robot condition, question, answer, robot's gaze direction, etc.) is sent to the Python server and saved in a CSV file.
    - The next robot condition is selected for the next card (repeated-measures design).
4.  **End:** The experiment is finished after all cards have been sorted.

---

## Project Structure

/
├── css/
│ └── style.css # All styles for the application
├── gcs/
│ ├── robot_faces/ # Images of the robot faces
│ │ ├── Robot9.png
│ │ ├── Robot11.png
│ │ └── Robot12.png
│ ├── ConditionManager.js # Loads and manages the experimental conditions
│ ├── GazeBehaviors.js # Defines complex gaze behaviors (e.g., Joint Attention)
│ ├── GazeMechanics.js # Defines basic eye movements (saccades, fixations)
│ ├── GCSController.js # Main controller for the Gaze Control System
│ ├── conditions.json # Configuration file for the robot conditions
│ └── main.js # Entry point for the GCS module
├── sortingGame/
│ ├── config.js # Configuration constants for the game
│ ├── DataManager.js # Loads and parses questions from the CSV file
│ ├── GameController.js # Main controller for the game logic and flow
│ ├── UIManager.js # Manages all DOM manipulations and UI updates
│ ├── main.js # Entry point for the sorting game module
│ └── quiz_questions.csv # Contains all true/false questions
├── shared/
│ └── Logger.js # Module for WebSocket communication with the server
├── index.html # Main HTML file that structures the application
├── perception.py # Python backend for face detection via webcam
└── server.py # Python backend for logging data to a CSV file

---

## Setup and Execution

To run the experiment locally, you need Python 3 and a webcam.

1.  **Install Python Libraries:**
    Open a terminal and install the necessary libraries using pip.

    ```bash
    python3 -m pip install opencv-python websockets
    ```

2.  **Start the Logging Server:**
    Open a terminal in the project's root directory and run the following command. This server runs on port `8765`.

    ```bash
    python3 server.py
    ```

3.  **Start the Perception Server:**
    Open a **second** terminal and run the perception server. This server runs on port `8766` and will open a debug window showing your webcam feed.

    ```bash
    python3 perception.py
    ```

4.  **Start the HTTP Server:**
    Open a **third** terminal and start a simple HTTP server.

    ```bash
    python3 -m http.server 8000
    ```

5.  **Open the Experiment in the Browser:**
    Open a web browser (e.g., Chrome or Firefox) and navigate to the following address:
    ```
    http://localhost:8000
    ```

---

## Detailed File Description

### Root Directory

- **`index.html`**: The central HTML file. It defines the page structure and loads all necessary CSS and JavaScript modules.
- **`server.py`**: A WebSocket server that listens on port `8765`. It receives JSON data from `Logger.js` and writes each interaction as a new row in `experiment_log.csv`.
- **`perception.py`**: A WebSocket server that listens on port `8766`. It uses OpenCV to access the webcam, detects the user's face, and streams the normalized (x, y) coordinates to the frontend for the `MutualGaze` behavior.

### Gaze Control System (`/gcs`)

- **`GCSController.js`**: The heart of the GCS. It connects to the `perception.py` server to receive face coordinates. It starts the animation loop (`requestAnimationFrame`) and provides public methods (e.g., `triggerInitiatingJointAttention`) that can be called by the `GameController`.
- **`GazeBehaviors.js`**: Defines abstract, high-level behaviors.
  - `MutualGaze`: The default behavior. It now uses the coordinates from the perception server to make the eyes follow the user's face.
  - `JointAttention`: A base class for gaze shifts to a side and back.
  - `InitiatingJointAttention`: Inherits from `JointAttention` and contains the logic for `gaze_validity`.
- **`GazeMechanics.js`**: Contains the fundamental building blocks for eye movements.
  - `PupilController`: Directly accesses the pupil DOM elements to change their position.
  - `Saccade`, `Fixation`, `SmoothPursuit`: Classes implementing models for different eye movements.
- **`ConditionManager.js`**: Loads `conditions.json` and provides the robot conditions in a random order.
- **`conditions.json`**: A JSON file for configuring the experimental conditions, including `gaze_validity` and dynamic `eye_config`.

### Sorting Game (`/sortingGame`)

- **`GameController.js`**: The brain of the experiment. It controls the flow via a state machine (`gameState`) and is responsible for deciding when and how the `GCSController` is triggered based on the current condition.
- **`UIManager.js`**: Responsible for all visual aspects of the game, including applying the dynamic eye styles.
- **`DataManager.js`**: Loads and parses the `quiz_questions.csv` file.
- **`quiz_questions.csv`**: Contains all questions, answers, rounds, and difficulty levels.
- **`config.js`**: Stores global constants.

### Shared Modules (`/shared`)

- **`Logger.js`**: Provides a global `logger` instance for connecting to the `server.py` logger.

---

## Experiment Configuration

The experiment can be flexibly configured via two main files:

- **`gcs/conditions.json`**:

  - Add new robot conditions as JSON objects.
  - Adjust `gaze_validity` (probability of a correct gaze, 0.0 to 1.0).
  - Set `initiatingJointAttention` to `false` if a robot should not perform gaze cues.
  - Adjust the `eye_config` to fine-tune the eye size and position for each robot image.

- **`sortingGame/quiz_questions.csv`**:
  - Add new questions by creating new rows.
  - Ensure each row contains the four columns: `question`, `correct_answer`, `round`, and `difficulty`.
  - Questions with `round` = `test` are only used in the practice round and are not logged.

