"use client";

import React, { useState } from "react";
import NoraRealtimeCallModal from "../components/NoraRealtimeCallModal";
import { Mic, Sparkles, Database, ShieldCheck, Radio } from "lucide-react";

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>
      <div style={{ maxWidth: "600px", width: "100%", textAlign: "center" }}>
        
        {/* Badge Neon & Pollinations */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#161b22", border: "1px solid #30363d", padding: "6px 16px", borderRadius: "20px", marginBottom: "24px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3fb950" }}></span>
          <span style={{ fontSize: "12px", color: "#8b949e", fontWeight: 600 }}>Neon PostgreSQL + Pollinations $0 Cost</span>
        </div>

        <h1 style={{ fontSize: "38px", fontWeight: 800, margin: "0 0 12px 0", background: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Nora Itu Core
        </h1>
        <p style={{ fontSize: "15px", color: "#8b949e", margin: "0 0 36px 0", lineHeight: 1.6 }}>
          Superinteligencia ag�ntica conversacional para Ituzaing�, Corrientes. Voz en tiempo real con Web Speech API, streaming SSE y almacenamiento en Neon.
        </p>

        {/* Bot�n Principal para Iniciar Llamada */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: "#238636",
            color: "#ffffff",
            border: "none",
            borderRadius: "50px",
            padding: "16px 36px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(35, 134, 54, 0.4)",
            transition: "all 0.2s ease"
          }}
        >
          <Mic size={20} />
          <span>Iniciar Llamada PTT en Vivo</span>
        </button>

        {/* Grid de M�tricas y Estado */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "48px", textAlign: "left" }}>
          <div style={{ backgroundColor: "#161b22", border: "1px solid #21262d", borderRadius: "16px", padding: "16px" }}>
            <Database size={18} color="#38bdf8" style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "11px", color: "#8b949e" }}>Base de Datos</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0f6fc" }}>Neon Serverless</div>
          </div>
          <div style={{ backgroundColor: "#161b22", border: "1px solid #21262d", borderRadius: "16px", padding: "16px" }}>
            <Radio size={18} color="#a855f7" style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "11px", color: "#8b949e" }}>Inferencia IA</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0f6fc" }}>Pollinations Open</div>
          </div>
          <div style={{ backgroundColor: "#161b22", border: "1px solid #21262d", borderRadius: "16px", padding: "16px" }}>
            <ShieldCheck size={18} color="#3fb950" style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "11px", color: "#8b949e" }}>Costo Operativo</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0f6fc" }}>$0 / 100% Libre</div>
          </div>
        </div>
      </div>

      {/* Modal Realtime */}
      <NoraRealtimeCallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
