import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  loadRecordings,
  sequenceToFeatures,
  knnPredict
} from "./sequenceClassifier";
function SignRecognizer() {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const datasetRef = useRef([]);
  const framesRef = useRef([]);
  const lastSpokenRef = useRef("");
  const lastSampleTimeRef = useRef(0);
  const lastPredictionTimeRef = useRef(0);

  const [status, setStatus] = useState("Sistem hazırlanır...");
  const [result, setResult] = useState("İşarə gözlənilir...");
  const [cameraReady, setCameraReady] = useState(false);
  const speak = (word) => {
  if (!("speechSynthesis" in window)) {
    console.log("Brauzer səs funksiyasını dəstəkləmir");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);

  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
};

  useEffect(() => {
    let stream;
    let active = true;
    let animationId;

    async function start() {
      try {
        setStatus("Dataset yüklənir...");

        datasetRef.current = await loadRecordings();

        setStatus("MediaPipe hazırlanır...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        landmarkerRef.current = await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: "/models/hand_landmarker.task",
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            numHands: 2
          }
        );

        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setCameraReady(true);
        setStatus("Kamera hazırdır");

        function detect() {
          if (!active) return;

          const video = videoRef.current;

          if (
            video &&
            video.readyState >= 2 &&
            landmarkerRef.current
          ) {
            const detection = landmarkerRef.current.detectForVideo(
              video,
              performance.now()
            );

            if (detection.landmarks?.length > 0) {
  const now = performance.now();

  if (now - lastSampleTimeRef.current >= 66) {
    console.log("Əl sayı:", detection.landmarks.length);
    const hands = detection.landmarks.map(hand =>
      hand.map(p => [
        Number(p.x.toFixed(3)),
        Number(p.y.toFixed(3)),
        Number(p.z.toFixed(3))
      ])
    );

    framesRef.current.push({
      t: Math.round(now),
      hands
    });

    lastSampleTimeRef.current = now;
  }

  // Son 2 saniyəlik kadrları saxla
  framesRef.current = framesRef.current.filter(
    frame => now - frame.t <= 2000
  );
  if (
  framesRef.current.length >= 10 &&
  now - lastPredictionTimeRef.current >= 300
) {
  const features = sequenceToFeatures(framesRef.current);

  if (features) {
    const prediction = knnPredict(
      features,
      datasetRef.current,
      3
    );

    if (prediction) {
  setResult(
    `${prediction.label} (${Math.round(prediction.agreement * 100)}%)`
  );

  if (
    prediction.label !== "bos" &&
    prediction.agreement >= 0.66 &&
    lastSpokenRef.current !== prediction.label
  ) {
    speak(prediction.label);
    lastSpokenRef.current = prediction.label;
  }
}
  }

  lastPredictionTimeRef.current = now;
}

} else {
  framesRef.current = [];
  lastSampleTimeRef.current = 0;
  setResult("Əl aşkarlanmadı");
}
          }

          animationId = requestAnimationFrame(detect);
        }

        detect();

      } catch (error) {
        console.error(error);
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

      landmarkerRef.current?.close();
    };
  }, []);


  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2 style={{
          color: "#383b35",
          fontSize: "clamp(36px, 4vw, 64px)",
          fontWeight: 600,
          marginBottom: "20px"
        }}>
          Jest tanıma 
        </h2>

      <p style={{
  color: status.toLowerCase().includes("tapılmadı") ||
         status.toLowerCase().includes("aşkarlanmadı")
         ? "#d9534f"
         : "#849579",
  fontSize: "clamp(18px, 1.6vw, 26px)",
  fontWeight: 600,
  marginBottom: "24px"
}}>
  {status}
</p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
       style={{
          width: "100%",
          maxWidth: 850,
          minHeight: 450,
          objectFit: "cover",
          borderRadius: 24,
          border: "5px solid #383b35",
          boxShadow: "0 12px 35px rgba(80, 77, 61, 0.10)",
          transform: "scaleX(-1)"
        }}
      />

     <div className="recognition-result">
  <span className="result-label">TANINAN JEST</span>
  <h2 style={{
  color: result === "Əl aşkarlanmadı"
    ? "#d9534f"
    : result === "İşarə gözlənilir..."
      ? "#858579"
      : "#4F9D69"
}}>
  {result}
</h2>
  <p>İşarə tanıma sisteminin nəticəsi</p>
</div>
    </div>
  );
}

export default SignRecognizer;
