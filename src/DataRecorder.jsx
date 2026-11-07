import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const STORAGE_KEY = "elin_recordings_v1";
const COUNTDOWN_SECONDS = 3;       // hazırlaşma müddəti
const RECORD_SECONDS = 2;          // yazı müddəti
const SAMPLE_INTERVAL_MS = 66;     // təxminən saniyədə 15 kadr
const MIN_FRAMES_WITH_HANDS = 10;  // bundan az kadrda əl görünsə, yazı rədd olunur

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Brauzer yaddaşından əvvəlki yazıları oxuyur (ehtiyat nüsxə)
function loadSaved() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function DataRecorder() {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const phaseRef = useRef("idle");
  const framesRef = useRef([]);
  const lastSampleRef = useRef(0);
  const startTimeRef = useRef(0);
  const handsCountRef = useRef(0);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState("Sistem hazırlanır...");
  const [word, setWord] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | countdown | recording
  const [countdown, setCountdown] = useState(0);
  const [handsNow, setHandsNow] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordings, setRecordings] = useState(loadSaved);

  // Kamera və MediaPipe
  useEffect(() => {
    let stream;
    let active = true;
    let animationId;
    mountedRef.current = true;

    async function start() {
      try {
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

        stream = await navigator.mediaDevices.getUserMedia({ video: true });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setCameraReady(true);
        setStatus("Kamera hazırdır. İşarənin adını yazıb 'Yaz' düyməsinə bas.");

        function detect() {
          if (!active) return;

          const video = videoRef.current;

          if (video && video.readyState >= 2 && landmarkerRef.current) {
            const detection = landmarkerRef.current.detectForVideo(
              video,
              performance.now()
            );

            const hands = detection.landmarks || [];

            // Ekranda əl sayını yalnız dəyişəndə yeniləyirik
            if (hands.length !== handsCountRef.current) {
              handsCountRef.current = hands.length;
              setHandsNow(hands.length);
            }

            // Yazma zamanı kadrları toplayırıq
            if (phaseRef.current === "recording") {
              const now = performance.now();

              if (now - lastSampleRef.current >= SAMPLE_INTERVAL_MS) {
                lastSampleRef.current = now;

                framesRef.current.push({
                  t: Math.round(now - startTimeRef.current),
                  hands: hands.map(hand =>
                    hand.map(p => [round3(p.x), round3(p.y), round3(p.z)])
                  )
                });
              }
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
      mountedRef.current = false;
      cancelAnimationFrame(animationId);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      landmarkerRef.current?.close();
    };
  }, []);

  // Hər dəyişiklikdə yazıları brauzer yaddaşına ehtiyat kimi saxlayırıq
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
    } catch {
      setStatus("Diqqət: brauzer yaddaşı doldu. Faylları yükləyin!");
    }
  }, [recordings]);

  async function startRecording() {
    const key = word.trim().toLocaleLowerCase("az");

    if (!key) {
      setStatus("Əvvəlcə işarənin adını yazın (məsələn: salam).");
      return;
    }

    if (!cameraReady || phaseRef.current !== "idle") return;

    // 1) Geri sayım
    phaseRef.current = "countdown";
    setPhase("countdown");

    for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
      setCountdown(i);
      await sleep(1000);
      if (!mountedRef.current) return;
    }

    // 2) Yazma
    framesRef.current = [];
    startTimeRef.current = performance.now();
    lastSampleRef.current = 0;
    phaseRef.current = "recording";
    setPhase("recording");

    await sleep(RECORD_SECONDS * 1000);
    if (!mountedRef.current) return;

    // 3) Bitirmə və yoxlama
    phaseRef.current = "idle";
    setPhase("idle");

    const frames = framesRef.current;
    const withHands = frames.filter(f => f.hands.length > 0).length;

    if (withHands < MIN_FRAMES_WITH_HANDS) {
      setStatus(
        `❌ Yazı rədd edildi: cəmi ${withHands} kadrda əl görünüb (ən azı ${MIN_FRAMES_WITH_HANDS} lazımdır). Əlini kameraya daha aydın göstər.`
      );
      return;
    }

    setRecordings(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { frames }]
    }));

    setStatus(
      `✅ "${key}" yazıldı (${withHands}/${frames.length} kadrda əl görünüb).`
    );
  }

  function deleteLast(key) {
    setRecordings(prev => {
      const list = (prev[key] || []).slice(0, -1);
      const next = { ...prev };

      if (list.length === 0) {
        delete next[key];
      } else {
        next[key] = list;
      }

      return next;
    });
  }

  function downloadWord(key) {
    const list = recordings[key] || [];

    const data = {
      format: "sequence-v1",
      word: key,
      recordingCount: list.length,
      recordings: list
    };

    const blob = new Blob([JSON.stringify(data)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${key}_recordings.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const busy = phase !== "idle";
  const words = Object.keys(recordings);

  return (
  <div className="recorder-page">

    <div className="recorder-header">
      <div>
        <span className="eyebrow">ƏLİN SƏSİ · ADMIN</span>
        <h2>Data yazma</h2>
        <p>Yeni jest nümunələri topla və dataset-i idarə et.</p>
      </div>

      <div className="recorder-status">
        <span className={cameraReady ? "status-dot active" : "status-dot"}></span>
        {cameraReady ? "Kamera aktivdir" : "Kamera hazırlanır..."}
      </div>
    </div>

    <div className="recorder-layout">

      <div className="recorder-camera-card">
        <div className="recorder-card-header">
          <h3>Kamera görüntüsü</h3>
          <span>CANLI GÖRÜNTÜ</span>
        </div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="recorder-video"
        />

        <div className="hand-counter">
          <span>Görünən əl sayı</span>
          <strong>{handsNow}</strong>
        </div>

        {phase === "countdown" && (
          <div className="recording-message countdown-message">
            Hazırlaş: {countdown}
          </div>
        )}

        {phase === "recording" && (
          <div className="recording-message recording-active">
            <span className="status-dot recording-dot"></span>
            YAZILIR — İndi işarə et!
          </div>
        )}
      </div>

      <div className="recorder-control-card">
        <span className="eyebrow">YENİ NÜMUNƏ</span>
        <h3>Jest qeydiyyatı</h3>

        <p>
          Kamerada göstərəcəyin jestin adını daxil et və qeydiyyata başla.
        </p>

        <label>Jestin adı</label>

        <input
          className="recorder-input"
          value={word}
          onChange={e => setWord(e.target.value)}
          placeholder="Məsələn: salam"
          disabled={busy}
        />

        <button
          className="recorder-button"
          onClick={startRecording}
          disabled={busy || !cameraReady}
        >
          {phase === "countdown"
            ? "Hazırlıq davam edir..."
            : phase === "recording"
              ? "Yazılır..."
              : "Yazmağa başla →"}
        </button>

        <div className="recorder-info">
          <div>
            <span>Hazırlıq müddəti</span>
            <strong>3 saniyə</strong>
          </div>

          <div>
            <span>Yazılma müddəti</span>
            <strong>2 saniyə</strong>
          </div>
        </div>

        <div className="recorder-status-text">
          {status}
        </div>
      </div>

    </div>

    <div className="dataset-section">

      <div className="dataset-header">
        <div>
          <span className="eyebrow">DATASET İDARƏETMƏSİ</span>
          <h3>Yazılmış jestlər</h3>
        </div>

        <div className="dataset-total">
          <strong>{words.length}</strong>
          <span>Jest növü</span>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="dataset-empty">
          <p>Hələ heç bir jest qeydə alınmayıb.</p>
          <span>İlk jest nümunəni əlavə etməklə başlaya bilərsən.</span>
        </div>
      ) : (
        <div className="dataset-list">
          {words.map(key => (
            <div className="dataset-item" key={key}>

              <div className="dataset-word">
                <strong>{key}</strong>
                <span>{recordings[key].length} nümunə</span>
              </div>

              <div className="dataset-actions">
                <button
                  onClick={() => downloadWord(key)}
                  disabled={busy}
                  className="dataset-download"
                >
                  Yüklə ↓
                </button>

                <button
                  onClick={() => deleteLast(key)}
                  disabled={busy}
                  className="dataset-delete"
                >
                  Sonuncunu sil
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>

  </div>
);
}

export default DataRecorder;