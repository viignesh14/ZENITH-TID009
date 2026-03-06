import { React, useEffect, useState } from "react";
import axios from "axios";

import BASE_URL from "../config";

function Dashboard() {
  const [vacancyId] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/hr-dashboard/?vacancy_id=${vacancyId}`
      );
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAutopilot = async () => {
    await axios.post(`${BASE_URL}/toggle-autopilot/`, {
      vacancy_id: vacancyId,
      enabled: !data.autopilot_enabled,
    });
    fetchDashboard();
  };

  const hrAction = async (id, action) => {
    await axios.post(`${BASE_URL}/hr-confirm/`, {
      candidate_id: id,
      action: action,
    });
    fetchDashboard();
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <h2>Loading...</h2>;

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>{data.vacancy}</h1>

      <button onClick={toggleAutopilot}>
        Autopilot: {data.autopilot_enabled ? "ON" : "OFF"}
      </button>

      <h3>
        Hiring Progress: {data.current_hires} / {data.max_hires}
      </h3>

      <hr />

      {data.candidates.map((c) => (
        <div
          key={c.id}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "8px",
          }}
        >
          <h2>{c.name}</h2>
          <p>Email: {c.email}</p>
          <p>AI Score: {c.ai_score}</p>

          <p>
            Verification:{" "}
            <strong
              style={{
                color:
                  c.verification_status === "verified"
                    ? "green"
                    : c.verification_status === "suspicious"
                      ? "orange"
                      : "red",
              }}
            >
              {c.verification_status}
            </strong>
          </p>

          <p>Status: {c.status}</p>

          <details>
            <summary>Verification Reason</summary>
            <p>{c.verification_reason}</p>
          </details>

          {!data.autopilot_enabled && c.status === "hr_pending" && (
            <>
              <button onClick={() => hrAction(c.id, "approve")}>
                Approve
              </button>
              <button
                onClick={() => hrAction(c.id, "reject")}
                style={{ marginLeft: "10px" }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default Dashboard;