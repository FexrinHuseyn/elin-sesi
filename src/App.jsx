
import React, { useState } from "react";
import SignRecognizer from "./SignRecognizer";
import DataRecorder from "./DataRecorder";
import Evaluator from "./Evaluator";
import AdminLogin from "./AdminLogin";
import "./App.css";
import { Hand, Handshake, ThumbsUp, ThumbsDown } from "lucide-react";
function App() {
  const [page, setPage] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand" onClick={() => setPage("home")}>
          <img className="brand-icon" src="/logo.png" alt="Əlin Səsi loqosu" />
          <span>Əlin Səsi</span>
        </div>

        <nav className="nav-links">
  <button onClick={() => setPage("home")}>
    Ana səhifə
  </button>

  <button onClick={() => setPage("recognize")}>
    Jestləri tanı
  </button>

  {isAdmin ? (
    <>
      <button onClick={() => setPage("record")}>
        Data yazma
      </button>

      <button onClick={() => setPage("evaluate")}>
        Yoxlama
      </button>

      <button
  className="logout-button"
  onClick={() => {
    setIsAdmin(false);
    setPage("home");
  }}
>
  Çıxış
</button>
    </>
  ) : (
    <button onClick={() => setPage("admin-login")}>
      Admin
    </button>
  )}
</nav>
      </header>

      {page === "admin-login" && (
            <AdminLogin
              onBack={() => setPage("home")}
              onLogin={(username, password) => {
  if (username === "admin" && password === "9999") {
    setIsAdmin(true);
    setPage("admin");
    return true;
  } else {
    return false;
  }
}}
            />
          )}

          {page === "admin" && isAdmin && (
  <main className="content-section">
    <button className="back-button" onClick={() => setPage("home")}>
      ← Ana səhifə
    </button>

    <h2 style={{ color: "#383b35" }}>Admin paneli</h2>
    <p>Əlin Səsi idarəetmə bölməsi</p>

    <div className="admin-dashboard">
      <button onClick={() => setPage("record")}>
        Data yazma →
      </button>

      <button onClick={() => setPage("evaluate")}>
        Sistemin yoxlanması →
      </button>
    </div>
  </main>
)}

      {page === "home" && (
  <main className="hero">
    <div className="hero-content">
      <span className="eyebrow">
        TEXNOLOGİYA • ÜNSİYYƏT • ƏLÇATANLIQ
      </span>

      <h1>
        Səssizliyin
        <br />
        <span>səsini eşit.</span>
      </h1>

      <p>
        Əlin Səsi Azərbaycan işarə dilini süni intellekt
        vasitəsilə tanıyaraq jestləri mətnə və səsə çevirir.
      </p>

      <button
        className="primary-button"
        onClick={() => setPage("recognize")}
      >
        Tanımağa başla <span>→</span>
      </button>

      <div className="hero-note">
        Azərbaycan işarə dili üçün hazırlanmış AI layihəsi
      </div>
    </div>

    <div className="hero-visual">
      <div className="visual-decoration decoration-one"></div>
      <div className="visual-decoration decoration-two"></div>

      <div className="visual-card">
        <div className="visual-top">
          <span className="status-dot"></span>
          Canlı tanıma
          <span className="live-label">LIVE</span>
        </div>

        <div className="hand-area">
          <div className="hand-symbol">
  <span className="hand-emoji">✋🏻</span>
</div>
          <div className="scan-line"></div>
        </div>

        <div className="visual-result">
          <span>Tanınan işarə</span>
          <strong>Salam</strong>
        </div>
      </div>

      
    </div>
  </main>
)}

{page === "home" && (
  <section className="how-it-works">
    <div className="section-heading">
      <span className="eyebrow">SADƏ VƏ RAHAT</span>
      <h2>Necə işləyir?</h2>
      <p>Üç sadə addımda jest dilini mətnə və səsə çevir.</p>
    </div>

    <div className="steps-container">
      <div className="step-card">
        <span className="step-number">01</span>
        <div className="step-icon">📷</div>
        <h3>Kameranı aktivləşdir</h3>
        <p>Kameraya icazə ver və tanıma sistemini başlat.</p>
      </div>

      <div className="step-card">
        <span className="step-number">02</span>
        <div className="step-icon">✋🏻</div>
        <h3>Jestini göstər</h3>
        <p>Əlini kameraya göstərərək jesti et.</p>
      </div>

      <div className="step-card">
        <span className="step-number">03</span>
        <div className="step-icon">🔊</div>
        <h3>Nəticəni əldə et</h3>
        <p>Sistem jesti tanısın, sözü göstərsin və səsləndirsin.</p>
      </div>
    </div>
  </section>
)}

{page === "home" && (
  <section className="about-section">
    <div className="about-content">
      <span className="eyebrow">LAYİHƏ HAQQINDA</span>

      <h2>
        Ünsiyyət üçün
        <br />
        <span>yeni bir imkan.</span>
      </h2>

      <p>
        Əlin Səsi Azərbaycan işarə dilində istifadə olunan
        jestləri süni intellekt vasitəsilə tanımaq və onları
        mətnə, eləcə də səsə çevirmək məqsədilə hazırlanmış
        texnoloji layihədir.
      </p>

      <p>
        Layihənin əsas məqsədi eşitmə və nitq məhdudiyyəti
        olan şəxslərlə digər insanlar arasında ünsiyyəti
        asanlaşdırmaq və rəqəmsal əlçatanlığa töhfə verməkdir.
      </p>
    </div>

    <div className="about-highlight">
      <span className="highlight-symbol">✦</span>
      <h3>Texnologiya hər kəs üçün.</h3>
      <p>
        Daha əlçatan, daha rahat və daha inklüziv
        ünsiyyət dünyası.
      </p>
      <span className="highlight-label">ƏLİN SƏSİ · 2026</span>
    </div>
  </section>
)}

      {page === "recognize" && (
        <main className="content-section">
          <button className="back-button" onClick={() => setPage("home")}>
            ← Ana səhifə
          </button>
          <h2 style={{
              color: "#383b35",
              fontSize: "clamp(50px, 3.5vw, 80px)",
              fontWeight: 600,
              marginBottom: "20px"
            }}>
              Jestlərin tanınması
            </h2>
            <p style={{
                color: "#55594f",
                fontSize: "clamp(16px, 1.4vw, 24px)",
                lineHeight: 1.7,
                marginBottom: "25px"
              }}>
                Kamera qarşısında işarəni göstər və nəticəni gör.
              </p>




          <SignRecognizer />
        </main>
      )}

      {page === "record" && (
        <main className="content-section">
          <button className="back-button" onClick={() => setPage("home")}>
            ← Ana səhifə
          </button>
          <DataRecorder />
        </main>
      )}

      {page === "evaluate" && (
  <main className="content-section">
    <button className="back-button" onClick={() => setPage("home")}>
      ← Ana səhifə
    </button>

    <h2 style={{
      color: "#383b35",
      fontSize: "clamp(32px, 3vw, 54px)"
    }}>
      Sistemin yoxlanması
    </h2>

    <Evaluator />
  </main>
)}

      <footer className="footer">
        <span>Əlin Səsi © 2026</span>
        <span>Ünsiyyət üçün texnologiya.</span>
      </footer>
    </div>
  );
}

export default App;
