import asyncio
import json
import cv2
import websockets

# Load a pre-trained Haar Cascade model for face detection.
# This file is included with the opencv-python library.
# You may need to adjust the path depending on your Python environment.
# To find the path, run this in a Python shell:
# import cv2
# print(cv2.data.haarcascades)
cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(cascade_path)

async def face_detection_server(websocket, path=None):
    """
    WebSocket server for real-time, simple face detection using OpenCV.
    It sends the coordinates of the largest detected face.
    """
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not access webcam.")
        return

    print("Perception server started. A debug window will open.")

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("No frame captured from webcam.")
                break

            # Convert the frame to grayscale for the detection algorithm
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect faces in the image
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )

            face_found = len(faces) > 0
            faceX = None
            faceY = None

            if face_found:
                # Find the largest face (most likely the user)
                largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
                x, y, w, h = largest_face
                
                # Calculate the center of the face and normalize coordinates (0.0 to 1.0)
                img_h, img_w, _ = frame.shape
                faceX = (x + w / 2) / img_w
                faceY = (y + h / 2) / img_h

                # Draw a rectangle around the detected face for the debug view
                cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

            # Prepare the message for the frontend
            message = {
                "event": "faceDetection",
                "userInFront": face_found,
                "faceX": faceX,
                "faceY": faceY,
                # These are kept for compatibility with the frontend code
                "secondFaceX": None,
                "secondFaceY": None,
                "headDirection": "none"
            }
            
            try:
                # Send the data over the WebSocket
                await websocket.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                print("Client disconnected. Closing perception server.")
                break

            # Show the debug view
            cv2.imshow("Perception Debug View", frame)

            # Allow the server to process events and check for exit key (ESC)
            if cv2.waitKey(1) & 0xFF == 27:
                break
            
            # A small delay to prevent overwhelming the CPU
            await asyncio.sleep(0.01)

    finally:
        print("Shutting down perception server.")
        cap.release()
        cv2.destroyAllWindows()


async def main():
    """
    Main function to start the WebSocket server on port 8766.
    """
    async with websockets.serve(face_detection_server, "localhost", 8766):
        print("Perception WebSocket server started at ws://localhost:8766")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user.")