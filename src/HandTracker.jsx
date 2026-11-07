
import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export default function HandTracker() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [status, setStatus] = useState("MediaPipe hazırlanır...");
  const [handDetected, setHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState([]);

  useEffect(() => {
    let landmarker;
    let stream;
    let animationId;
    let active = true;

    async function start() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        if (!active) return;

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setStatus("Kamera aktivdir. Əlinizi göstərin.");

        function detectHands() {
          if (!active) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && video.readyState >= 2) {
            const results = landmarker.detectForVideo(
              video,
              performance.now()
            );

            const ctx = canvas.getContext("2d");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const hands = results.landmarks || [];
            setLandmarks(hands[0] || []);
            setHandDetected(hands.length > 0);

            hands.forEach(hand => {
              hand.forEach(point => {
                ctx.beginPath();
                ctx.arc(
                  point.x * canvas.width,
                  point.y * canvas.height,
                  6,
                  0,
                  2 * Math.PI
                );
                ctx.fillStyle = "#ff4fa3";
                ctx.fill();
              });
            });
          }

          animationId = requestAnimationFrame(detectHands);
        }

        detectHands();

      } catch (error) {
        console.error("MediaPipe xətası:", error);
        setStatus("Xəta: " + error.message);
      }
    }

    start();

    return () => {
      active = false;
      cancelAnimationFrame(animationId);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      if (landmarker) {
        landmarker.close();
      }
    };
  }, []);

  return (
    <div>
      <p>{status}</p>
      <p>
        {handDetected ? "Əl aşkarlandı!" : "Əl gözlənilir..."}
      </p>

      <div style={{
  background: "#172033",
  color: "white",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "15px"
}}>
  <h3>Əl koordinatları</h3>

  {landmarks.map((point, index) => (
    <p key={index}>
      Nöqtə {index + 1}: 
      X: {point.x.toFixed(3)} |
      Y: {point.y.toFixed(3)} |
      Z: {point.z.toFixed(3)}
    </p>
  ))}
</div>

      <div style={{ position: "relative", width: "100%" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            transform: "scaleX(-1)"
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
            pointerEvents: "none"
          }}
        />
      </div>
    </div>
  );
}
