
import { useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker
} from "@mediapipe/tasks-vision";

const DEFAULT_VIDEO = "/signs/salam.mp4";
export default function VideoProcessor() {
  const videoRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO);
  const [word, setWord] = useState("");
  const [status, setStatus] = useState("Video gözlənilir...");
  const [dataset, setDataset] = useState([]);
  const [loading, setLoading] = useState(false);

  async function processVideo() {
    const video = videoRef.current;

    if (!video || !video.duration) {
      setStatus("Əvvəlcə videonun yüklənməsini gözləyin.");
      return;
    }

    if (!word.trim()) {
      setStatus("Əvvəlcə işarənin adını yazın.");
      return;
    }

    setLoading(true);
    setDataset([]);

    let landmarker;

    try {
      setStatus("MediaPipe hazırlanır...");

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

      const results = [];

      // Hər 0.1 saniyədən bir kadr analiz edilir
      const interval = 0.1;
      const totalFrames = Math.min(
  Math.ceil(video.duration / interval),
  60
);

      for (let i = 0; i < totalFrames; i++) {
        const time = Math.min(
          i * interval,
          video.duration - 0.01
        );

        video.currentTime = time;

        await new Promise(resolve => {
          video.addEventListener("seeked", resolve, {
            once: true
          });
        });

        const detection = landmarker.detectForVideo(
          video,
          i * 100 + 1
        );

        const hands = detection.landmarks || [];
        if (hands.length === 0) {
            continue;
}

        if (hands.length > 0) {
          results.push({
            label: word.trim(),
            timestamp: time,
            hands: hands.map(hand =>
              hand.map(point => ({
                x: point.x,
                y: point.y,
                z: point.z
              }))
            )
          });
        }

        setStatus(
          `Analiz edilir: ${i + 1}/${totalFrames}`
        );
      }

      setDataset(results);

      setStatus(
        `Analiz tamamlandı! ${results.length} kadrda əl tapıldı.`
      );

    } catch (error) {
      console.error(error);
      setStatus("Xəta: " + error.message);
    } finally {
      if (landmarker) landmarker.close();
      setLoading(false);
    }
  }

  function downloadDataset() {
    const data = {
      word: word,
      totalSamples: dataset.length,
      samples: dataset
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${word || "sign"}_dataset.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      maxWidth: "800px",
      margin: "30px auto",
      padding: "20px"
    }}>
      <h2>Video Dataset Processor</h2>

      <label>İşarənin adı:</label>

      <input
        value={word}
        onChange={e => setWord(e.target.value)}
        placeholder="Məsələn: salam"
        style={{
          display: "block",
          width: "100%",
          padding: "10px",
          margin: "10px 0"
        }}
      />

      <label>Video URL:</label>

      <input
        value={videoUrl}
        onChange={e => setVideoUrl(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          padding: "10px",
          margin: "10px 0"
        }}
      />

      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        controls
        onLoadedMetadata={() =>
          setStatus("Video yükləndi. Analizə hazırsınız.")
        }
        onError={() =>
          setStatus("Video yüklənmədi. URL və ya CORS xətası ola bilər.")
        }
        style={{ width: "100%", marginTop: "15px" }}
      />

      <button
        onClick={processVideo}
        disabled={loading}
        style={{ padding: "12px 20px", marginTop: "15px" }}
      >
        {loading ? "Analiz edilir..." : "Videonu analiz et"}
      </button>

      <p>{status}</p>

      <p>Tapılmış kadr sayı: {dataset.length}</p>

      {dataset.length > 0 && (
        <button onClick={downloadDataset}>
          JSON dataset-i yüklə
        </button>
      )}
    </div>
  );
}
