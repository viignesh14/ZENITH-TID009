import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Apply from "./pages/Apply";
import HRDashboard from "./pages/HRDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";

function App() {
  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-indigo-500/30">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/candidate" element={<CandidateDashboard />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/hr" element={<HRDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;