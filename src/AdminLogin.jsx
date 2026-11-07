import React, { useState } from "react";

function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

 return (
  <div className="content-section admin-login-section">
    <button className="back-button" onClick={onBack}>
      ← Ana səhifə
    </button>

    <div className="login-card">
            <div className="login-icon">
        <img src="/logo.png" alt="Əlin Səsi loqosu" />
        </div>

      <span className="eyebrow">ƏLİN SƏSİ · ADMIN</span>

      <h2>Admin girişi</h2>

      <p>İdarəetmə panelinə daxil olmaq üçün məlumatlarını daxil et.</p>

      <form onSubmit={(e) => {
  e.preventDefault();
  setError("");
  const success = onLogin(username, password);

  if (!success) {
    setError("İstifadəçi adı və ya şifrə yanlışdır!");
  }
}}>
        <label>İstifadəçi adı</label>
        <input
          type="text"
          placeholder="İstifadəçi adını daxil et"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label>Şifrə</label>
        <input
          type="password"
          placeholder="Şifrəni daxil et"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="primary-button">
          Daxil ol <span>→</span>
        </button>
      </form>
    </div>
  </div>
);
     
}

export default AdminLogin;