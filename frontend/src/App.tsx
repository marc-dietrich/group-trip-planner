import { useState, useEffect } from "react";
import "./App.css";

interface HealthCheck {
  status: string;
  message: string;
}

function App() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test API connection
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthCheck) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => {
        setHealth({ status: "error", message: "Backend nicht erreichbar" });
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <h1>Gruppen-Urlaubsplaner</h1>
      <p>Finde den perfekten Reisezeitraum für deine Gruppe!</p>

      <div className="status-card">
        <h3>System Status</h3>
        {loading ? (
          <p>Verbinde mit Backend...</p>
        ) : (
          <div>
            <p>
              Status:{" "}
              <span className={health?.status === "ok" ? "success" : "error"}>
                {health?.status}
              </span>
            </p>
            <p>{health?.message}</p>
          </div>
        )}
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Gruppe erstellen</h3>
          <p>Erstelle eine neue Reisegruppe und lade Freunde ein</p>
        </div>

        <div className="feature-card">
          <h3>Verfügbarkeiten sammeln</h3>
          <p>Jeder gibt seine verfügbaren Termine an</p>
        </div>

        <div className="feature-card">
          <h3>Beste Zeiten finden</h3>
          <p>Automatische Berechnung der optimalen Reisezeiträume</p>
        </div>
      </div>
    </div>
  );
}

export default App;
