import React, { useEffect, useState } from "react";
import { WORDS, loadRecordings, knnPredict } from "./sequenceClassifier";

const TRAIN_COUNT = 12; // ilk 12 yazı = öyrətmək, qalanı = yoxlamaq

function Evaluator() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      try {
        const all = await loadRecordings();

        const train = all.filter(s => s.index < TRAIN_COUNT);
        const test = all.filter(s => s.index >= TRAIN_COUNT);

        // matrix[həqiqi][tapılan] = neçə dəfə
        const matrix = {};
        for (const a of WORDS) {
          matrix[a] = {};
          for (const b of WORDS) matrix[a][b] = 0;
        }

        for (const sample of test) {
          const prediction = knnPredict(sample.features, train);
          if (prediction) matrix[sample.label][prediction.label] += 1;
        }

        setReport({
          trainCount: train.length,
          testCount: test.length,
          matrix
        });
      } catch (e) {
        console.error(e);
        setError(
          "Xəta: " + e.message +
          " (faylların public/datasets qovluğunda olduğunu yoxla)"
        );
      }
    }

    run();
  }, []);

  if (error) return <p style={{ padding: 20 }}>{error}</p>;
  if (!report) return <p style={{ padding: 20 }}>Hesablanır...</p>;

  let correct = 0;
  let total = 0;

  for (const a of WORDS) {
    for (const b of WORDS) {
      total += report.matrix[a][b];
      if (a === b) correct += report.matrix[a][b];
    }
  }

  const wordAccuracy = {};

for (const word of WORDS) {
  let wordCorrect = report.matrix[word][word];
  let wordTotal = 0;

  for (const predicted of WORDS) {
    wordTotal += report.matrix[word][predicted];
  }

  wordAccuracy[word] = wordTotal
    ? Math.round((wordCorrect / wordTotal) * 100)
    : 0;
}

  const cell = { border: "1px solid #888", padding: "8px 14px" };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2 style={{
  color: "#383b35",
  fontSize: "clamp(32px, 3vw, 54px)"
}}>
  Dəqiqlik yoxlaması
</h2>

      <p>
        Öyrətmə nümunələri: {report.trainCount} | Yoxlama nümunələri:{" "}
        {report.testCount}
      </p>

      <h1 style={{
  color: "#383b35",
  fontSize: "clamp(30px, 2.8vw, 48px)"
}}>
  Ümumi dəqiqlik: {total ? Math.round((correct / total) * 100) : 0}%
  {" "}({correct}/{total})
</h1>

      <p>Sətir = həqiqətən nə idi, sütun = sistem nə dedi</p>

    <div className="word-accuracy-section">
  <h3>Jestlər üzrə dəqiqlik</h3>

  <div className="word-accuracy-grid">
    {WORDS.map(word => (
      <div className="word-accuracy-card" key={word}>
        <span>{word}</span>
        <strong>{wordAccuracy[word]}%</strong>
      </div>
    ))}
  </div>
</div> 

      <div className="matrix-table-wrapper">
  <table className="confusion-matrix">
        <thead>
          <tr>
            <th style={cell}></th>
            {WORDS.map(w => (
              <th key={w} style={cell}>{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WORDS.map(a => (
            <tr key={a}>
              <th style={cell}>{a}</th>
              {WORDS.map(b => (
               <td
                  key={b}
                  className={
                    a === b
                      ? "matrix-correct"
                      : report.matrix[a][b] > 0
                        ? "matrix-wrong"
                        : "matrix-empty"
                  }
                  style={cell}
                >
                  {report.matrix[a][b]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

export default Evaluator;