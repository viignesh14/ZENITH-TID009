import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle, XCircle, BrainCircuit, ShieldAlert, ShieldCheck, Mail, BarChart3, Clock, PlusCircle, Briefcase, ChevronDown, Trash2, Zap, RotateCcw, FileText } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000/api";

function HRDashboard() {
  const [vacancies, setVacancies] = useState([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState("pipeline"); // "pipeline", "offered", "hired", "rejected", or "strategy"
  const [strategyData, setStrategyData] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [editOfferValue, setEditOfferValue] = useState("");

  const formatSalary = (s) => {
    if (!s) return "₹8L - ₹15L";
    // Regex to handle legacy USD formats and convert to INR/LPA for display
    return s.replace(/\$/g, "₹").replace(/USD/g, "LPA").replace(/(\d+),?000/g, "$1L").replace(/(\d+)k/g, "$1L");
  };

  // New Vacancy Form State
  const [newVacancy, setNewVacancy] = useState({
    title: "",
    description: "",
    required_skills: "",
    experience_required: 0,
    max_hires: 1,
    shortlist_threshold: 80,
    autopilot_enabled: false
  });

  const fetchVacancies = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/vacancies/`);
      setVacancies(res.data);
      if (res.data.length > 0 && !selectedVacancyId) {
        setSelectedVacancyId(res.data[0].id);
      } else if (res.data.length === 0) {
        setData(null);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching vacancies:", err);
    }
  };

  const fetchDashboardData = async (vid) => {
    if (!vid) return;
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/hr-dashboard/?vacancy_id=${vid}`);
      setData(res.data);
    } catch (error) {
      console.error("Error fetching dashboard error:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStrategyData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/get-strategy/`);
      setStrategyData(res.data);
    } catch (err) {
      console.error("Error fetching strategy:", err);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  useEffect(() => {
    if (viewMode === "strategy") {
      fetchStrategyData();
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedVacancyId) {
      fetchDashboardData(selectedVacancyId);
    } else {
      setData(null);
    }
  }, [selectedVacancyId]);

  const toggleAutopilot = async () => {
    if (!data) return;
    try {
      await axios.post(`${BASE_URL}/toggle-autopilot/`, {
        vacancy_id: selectedVacancyId,
        enabled: !data.autopilot_enabled,
      });
      fetchDashboardData(selectedVacancyId);
    } catch (error) {
      console.error(error);
    }
  };

  const updateThreshold = async (newThreshold) => {
    if (!data) return;
    try {
      await axios.post(`${BASE_URL}/update-threshold/`, {
        vacancy_id: selectedVacancyId,
        threshold: newThreshold,
      });
      fetchDashboardData(selectedVacancyId);
    } catch (error) {
      console.error(error);
    }
  };

  const hrAction = async (id, action, extra = {}) => {
    try {
      await axios.post(`${BASE_URL}/hr-confirm/`, {
        candidate_id: id,
        action,
        ...extra
      });
      fetchDashboardData(selectedVacancyId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteVacancy = async () => {
    if (!selectedVacancyId) return;
    if (!window.confirm("Are you sure you want to delete this vacancy? All candidate applications will also be permanently deleted.")) return;

    try {
      await axios.delete(`${BASE_URL}/vacancies/${selectedVacancyId}/`);
      const updatedVacancies = vacancies.filter(v => v.id != selectedVacancyId);
      setVacancies(updatedVacancies);

      if (updatedVacancies.length > 0) {
        setSelectedVacancyId(updatedVacancies[0].id);
      } else {
        setSelectedVacancyId(null);
        setData(null);
      }
    } catch (err) {
      console.error("Failed to delete vacancy:", err);
      alert("Failed to delete vacancy.");
    }
  };

  const handleCreateVacancy = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await axios.post(`${BASE_URL}/vacancies/`, newVacancy);
      await fetchVacancies();
      setSelectedVacancyId(res.data.id);
      setShowCreateModal(false);
      setViewMode("pipeline");
      setNewVacancy({
        title: "", description: "", required_skills: "", experience_required: 0, max_hires: 1, shortlist_threshold: 80, autopilot_enabled: false
      });
    } catch (err) {
      console.error("Failed to create vacancy:", err);
      alert("Failed to create vacancy.");
    } finally {
      setCreating(false);
    }
  };

  const lastHiredCandidate = data?.candidates?.filter(c => c.status === "hired").sort((a, b) => b.id - a.id)[0];
  const displayedCandidates = data?.candidates?.filter(c => {
    if (viewMode === "hired") return c.status === "hired";
    if (viewMode === "offered") return c.status === "offered";
    if (viewMode === "rejected") return c.status === "rejected" || c.status === "ai_rejected";
    return c.status === "hr_pending";
  }) || [];

  return (
    <div className="space-y-8 pb-12">

      {/* Top Controls: Vacancy Selector & Create/Delete Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/80 border border-slate-700 p-4 rounded-2xl shadow-lg backdrop-blur-md z-10 relative">
        <div className="flex-1 w-full max-w-md">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Vacancy</label>
          <div className="relative">
            <select
              className="w-full appearance-none bg-slate-900 border border-slate-700 text-white rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium shadow-inner cursor-pointer"
              value={selectedVacancyId || ""}
              onChange={(e) => setSelectedVacancyId(e.target.value)}
            >
              {vacancies.length === 0 && <option value="" disabled>No vacancies available</option>}
              {vacancies.map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 w-full md:w-auto mt-2 md:mt-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create New Vacancy
          </button>

          {selectedVacancyId && (
            <button
              onClick={handleDeleteVacancy}
              className="w-full md:w-auto bg-slate-800 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center whitespace-nowrap"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Vacancy
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-slate-400 font-medium tracking-wide animate-pulse">Loading Pipeline...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="text-center p-12 bg-slate-800/40 border border-slate-700 border-dashed rounded-3xl">
          <Briefcase className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-300">No Data Available</h2>
          <p className="text-slate-500 mt-2">Create or select a vacancy to view its candidate pipeline.</p>
        </div>
      ) : (
        <>
          {/* Header and Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl p-6 rounded-3xl shadow-xl">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                {data.vacancy}
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-700/50">
                <div className={`p-2 rounded-xl transition-colors bg-indigo-500/20 text-indigo-400`}>
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-sm font-semibold text-white leading-none mb-1">AI Threshold</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">
                    Min Score
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-16 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-center font-bold focus:outline-none focus:border-indigo-500"
                  value={data.shortlist_threshold !== undefined ? data.shortlist_threshold : ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : parseInt(e.target.value);
                    setData({ ...data, shortlist_threshold: val });
                  }}
                  onBlur={(e) => updateThreshold(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-700/50">
                <div className={`p-2 rounded-xl transition-colors ${data.autopilot_enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-sm font-semibold text-white leading-none mb-1">AI Autopilot</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">
                    {data.autopilot_enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <button
                  onClick={toggleAutopilot}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${data.autopilot_enabled ? "bg-indigo-500" : "bg-slate-600"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${data.autopilot_enabled ? "translate-x-6" : "translate-x-1"
                    }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <motion.div onClick={() => setViewMode("pipeline")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`bg-slate-800/80 border ${viewMode === 'pipeline' ? 'border-indigo-400 ring-4 ring-indigo-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-indigo-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-indigo-400 text-sm font-bold uppercase tracking-wider">Pipeline</span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">{data.candidates.filter(c => c.status === 'hr_pending').length}</p>
            </motion.div>

            <motion.div onClick={() => setViewMode("offered")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`bg-slate-800/80 border ${viewMode === 'offered' ? 'border-amber-400 ring-4 ring-amber-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-amber-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-sm font-bold uppercase tracking-wider">Offered</span>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">{data.candidates.filter(c => c.status === 'offered').length}</p>
            </motion.div>

            <motion.div onClick={() => setViewMode("hired")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`bg-slate-800/80 border ${viewMode === 'hired' ? 'border-emerald-400 ring-4 ring-emerald-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-emerald-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Hired</span>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">{data.current_hires}</p>
            </motion.div>

            <motion.div onClick={() => setViewMode("rejected")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={`bg-slate-800/80 border ${viewMode === 'rejected' ? 'border-red-400 ring-4 ring-red-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-red-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-sm font-bold uppercase tracking-wider">Rejected</span>
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">{data.candidates.filter(c => c.status === 'rejected' || c.status === 'ai_rejected').length}</p>
            </motion.div>

            <motion.div onClick={() => setViewMode("strategy")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`bg-slate-800/80 border ${viewMode === 'strategy' ? 'border-amber-400 ring-4 ring-amber-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-amber-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-sm font-bold uppercase tracking-wider">Strategy</span>
                <BrainCircuit className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">Active</p>
            </motion.div>
          </div>
        </>
      )}

      {/* Content Heading */}
      <div>
        <div className="flex items-center justify-between mb-6 pl-2 border-l-4 border-indigo-500">
          <h2 className="text-xl font-bold text-white">
            {viewMode === "pipeline" ? "Candidate Pipeline" : viewMode === "offered" ? "Offered Candidates" : viewMode === "hired" ? "Hired Candidates" : viewMode === "rejected" ? "Rejected Candidates" : "Workforce Strategy"}
          </h2>
        </div>

        {viewMode === "strategy" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-slate-800/40 border border-slate-700 p-8 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-indigo-400" />
                Hiring Forecast
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-400 text-sm mb-1 uppercase tracking-widest font-bold">Planned Hires</p>
                  <p className="text-3xl font-black text-white">{strategyData?.hiring_plan || "Onboard 10 engineers by June"}</p>
                </div>
                <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30">
                  <p className="text-indigo-400 text-sm font-semibold mb-1">Recommendation</p>
                  <p className="text-white text-sm">Focus on Senior Fullstack roles for Q3 scaling.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700 p-8 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <ShieldAlert className="w-6 h-6 mr-3 text-amber-400" />
                Skill Shortage Alerts
              </h3>
              <div className="flex flex-wrap gap-3">
                {strategyData?.skill_shortage_alerts?.map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 text-sm font-bold">
                    {skill}
                  </span>
                )) || ["AI Architecture", "Cybersecurity"].map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 text-sm font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-gradient-to-r from-slate-800/60 to-indigo-900/20 border border-slate-700 p-8 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <ShieldCheck className="w-6 h-6 mr-3 text-emerald-400" />
                Workforce Roadmap
              </h3>
              <p className="text-slate-300 leading-relaxed text-lg italic">
                "{strategyData?.workforce_roadmap || "Shift towards decentralized AI teams by 2026"}"
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {displayedCandidates.length === 0 ? (
                <div className="col-span-full bg-slate-800/40 border border-slate-700 border-dashed rounded-3xl p-12 text-center">
                  <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No candidates found</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    {viewMode === "hired" ? "No candidates have been hired yet." : "No pending candidates for this vacancy."}
                  </p>
                </div>
              ) : (
                displayedCandidates.map((c, idx) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/70 shadow-lg rounded-3xl overflow-hidden hover:border-slate-500 transition-all duration-300"
                  >
                    {/* Card Header */}
                    <div className="p-6 border-b border-slate-700/50 flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{c.name}</h3>
                        <div className="flex flex-col space-y-1 mt-1">
                          <div className="flex items-center text-sm text-slate-400">
                            <Mail className="w-3 h-3 mr-2" />
                            {c.email}
                          </div>
                          {c.resume_url && (
                            <a
                              href={c.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="w-3 h-3 mr-2" />
                              View PDF Resume
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="flex flex-col items-end space-y-3">
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-inner ${c.status === 'hired' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          c.status === 'offered' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse' :
                            c.status === 'hr_pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                          {c.status.replace('_', ' ')}
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently delete ${c.name}?`)) {
                              hrAction(c.id, "delete");
                            }
                          }}
                          className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-900/30 grid grid-cols-2 gap-4 cursor-pointer hover:bg-slate-900/50 transition-colors" onClick={() => setSelectedCandidateId(selectedCandidateId === c.id ? null : c.id)}>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">AI Score</span>
                        <div className="flex items-end">
                          <span className={`text-3xl font-black ${c.ai_score >= data.shortlist_threshold ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {c.ai_score}
                          </span>
                          <span className="text-sm text-slate-500 font-medium mb-1 ml-1">/100</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Verification</span>
                        <div className="flex items-center space-x-2 mt-1">
                          {c.verification_status === "verified" ? (
                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                          ) : (
                            <ShieldAlert className={`w-8 h-8 ${c.verification_status === "suspicious" ? "text-amber-400" : "text-red-400"}`} />
                          )}
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold capitalize leading-tight ${c.verification_status === 'verified' ? 'text-emerald-400' :
                              c.verification_status === 'suspicious' ? 'text-amber-400' : 'text-red-400'
                              }`}>
                              {c.verification_status}
                            </span>
                            {c.verification_score && <span className="text-xs text-slate-500 font-medium">{c.verification_score}% Match</span>}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedCandidateId === c.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="col-span-2 overflow-hidden border-t border-slate-700/50 pt-4 mt-2 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Strengths</p>
                                <p className="text-xs text-slate-300">{c.strengths || "Technical proficiency, problem-solving"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Weaknesses</p>
                                <p className="text-xs text-slate-300">{c.weaknesses || "Management experience"}</p>
                              </div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Fairness Insight</p>
                              <p className="text-xs text-slate-400">{c.fairness_report || "Decision followed all DEI guidelines."}</p>
                            </div>
                            <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/20">
                              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">Comp Strategy</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-white">{formatSalary(c.salary_suggestion)}</span>
                                <span className="text-[9px] text-slate-500 italic">Market Benchmark: Median</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Card Footer - HR Actions */}
                    {(c.status === "rejected" || c.status === "ai_rejected") && (
                      <div className="p-4 bg-slate-800 border-t border-slate-700/50 flex space-x-3">
                        <button
                          onClick={() => hrAction(c.id, "restore")}
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore to Pipeline</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to permanently delete this candidate?")) {
                              hrAction(c.id, "delete");
                            }
                          }}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Forever</span>
                        </button>
                      </div>
                    )}
                    {c.status === "hr_pending" && !data.autopilot_enabled && (
                      <div className="p-4 bg-slate-800 border-t border-slate-700/50 flex space-x-3">
                        <button
                          onClick={() => hrAction(c.id, "offer")}
                          className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/10"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Send Offer</span>
                        </button>
                        <button
                          onClick={() => hrAction(c.id, "reject")}
                          className="flex-1 bg-slate-700/50 hover:bg-red-500/20 text-slate-300 hover:text-red-500 border border-slate-600 hover:border-red-500/30 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {c.status === "offered" && (
                      <div className="p-5 bg-indigo-950/20 border-t border-indigo-500/20">
                        <div className="flex flex-col space-y-4">
                          {/* Active Stats */}
                          <div className="flex items-center justify-between pb-3 border-b border-indigo-500/10">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">Current Offer</span>
                              <span className="text-2xl font-black text-white tracking-tighter">
                                ₹{c.offered_salary}{!String(c.offered_salary).toLowerCase().includes('l') ? 'L' : ''}
                              </span>
                            </div>
                            {c.candidate_counter_offer && (
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1">Candidate Counter</span>
                                <span className="text-2xl font-black text-amber-400 tracking-tighter animate-pulse">
                                  ₹{String(c.candidate_counter_offer).replace('₹', '')}{!String(c.candidate_counter_offer).toLowerCase().includes('l') ? 'L' : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Negotiation History Snippet */}
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30">
                            <span className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Discussion Log</span>
                            <p className="text-[10px] text-slate-300 italic line-clamp-2">
                              {c.negotiation_history?.split('\n').pop() || "Waiting for candidate to review the initial offer..."}
                            </p>
                          </div>

                          {/* HR Manual Counter Tool */}
                          <div className="space-y-2">
                            {editingOfferId === c.id ? (
                              <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-indigo-500/30">
                                <span className="text-indigo-400 font-bold ml-1">₹</span>
                                <input
                                  type="text"
                                  className="flex-1 bg-transparent text-white text-sm font-bold outline-none placeholder:text-slate-600"
                                  placeholder="New Offer (e.g. 12)"
                                  value={editOfferValue}
                                  onChange={(e) => setEditOfferValue(e.target.value)}
                                  autoFocus
                                />
                                <span className="text-slate-500 font-bold mr-2">L</span>
                                <button
                                  onClick={() => {
                                    hrAction(c.id, "update_offer", { new_offer: `₹${editOfferValue}L` });
                                    setEditingOfferId(null);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                                >
                                  Update
                                </button>
                                <button onClick={() => setEditingOfferId(null)} className="p-1.5 text-slate-500 hover:text-white">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                {c.candidate_counter_offer ? (
                                  <button
                                    onClick={() => hrAction(c.id, "accept_counter")}
                                    className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Accept ₹{String(c.candidate_counter_offer).replace('₹', '')}{!String(c.candidate_counter_offer).toLowerCase().includes('l') ? 'L' : ''} & Hire</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => hrAction(c.id, "approve")}
                                    className="col-span-2 bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-emerald-400 font-black py-3 rounded-xl transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Force Hire Immediately</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setEditingOfferId(c.id);
                                    setEditOfferValue(String(c.offered_salary).replace('₹', '').replace('L', '').replace('l', ''));
                                  }}
                                  className="bg-slate-800 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 border border-slate-700 font-bold py-2.5 rounded-xl transition-all text-[10px] uppercase tracking-widest flex items-center justify-center"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 mr-2" />
                                  Manual Counter
                                </button>

                                <button
                                  onClick={() => hrAction(c.id, "reject")}
                                  className="bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-400 border border-slate-700 font-bold py-2.5 rounded-xl transition-all text-[10px] uppercase tracking-widest"
                                >
                                  Withdraw Offer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {c.status === "hired" && c.talent_insights && (
                      <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-indigo-400 font-black uppercase tracking-widest text-[9px]">
                            <BrainCircuit className="w-3 h-3" />
                            <span>Talent Lifecycle Brain (Agent 5)</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[8px] font-bold uppercase">Active Management</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                            <div className="flex items-center space-x-2 mb-1.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider underline decoration-indigo-500/30">Career & Growth</span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{c.talent_insights.career_path_suggestions}</p>
                          </div>
                          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                            <div className="flex items-center space-x-2 mb-1.5">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider underline decoration-indigo-500/30">Upskilling Plan</span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{c.talent_insights.upskilling_plan}</p>
                          </div>
                        </div>
                        <div className="bg-red-500/5 p-2 rounded-lg border border-red-500/20 flex items-center space-x-3">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                          <div className="flex-1">
                            <span className="block text-[8px] text-red-400/70 uppercase font-black tracking-tighter">Retention Alert</span>
                            <p className="text-[10px] text-slate-300 font-bold italic">"{c.talent_insights.retention_alerts}"</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {c.status === "hired" && (
                      <div className="p-4 bg-slate-800 border-t border-slate-700/50 flex space-x-3">
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to fire this candidate?")) {
                              hrAction(c.id, "fire");
                            }
                          }}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Fire Candidate</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {/* Create Vacancy Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 shadow-2xl rounded-3xl overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-indigo-400" /> Create New Vacancy
                  </h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <form id="createVacancyForm" onSubmit={handleCreateVacancy} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Job Title</label>
                        <input required type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600" placeholder="e.g. Senior Frontend Engineer" value={newVacancy.title} onChange={e => setNewVacancy({ ...newVacancy, title: e.target.value })} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Job Description</label>
                        <textarea required rows={3} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600 resize-none" placeholder="We are looking for..." value={newVacancy.description} onChange={e => setNewVacancy({ ...newVacancy, description: e.target.value })} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Required Skills (Comma separated)</label>
                        <input required type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600" placeholder="React, Node.js, AWS" value={newVacancy.required_skills} onChange={e => setNewVacancy({ ...newVacancy, required_skills: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Years of Experience</label>
                          <input required type="number" min="0" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newVacancy.experience_required} onChange={e => setNewVacancy({ ...newVacancy, experience_required: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Max Hires</label>
                          <input required type="number" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newVacancy.max_hires} onChange={e => setNewVacancy({ ...newVacancy, max_hires: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">AI Shortlist Threshold (0-100)</label>
                          <input required type="number" min="0" max="100" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newVacancy.shortlist_threshold} onChange={e => setNewVacancy({ ...newVacancy, shortlist_threshold: e.target.value })} />
                        </div>
                        <div className="flex items-center pt-6">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" className="form-checkbox h-5 w-5 text-indigo-500 rounded border-slate-600 bg-slate-900 focus:ring-indigo-500 focus:ring-offset-slate-800" checked={newVacancy.autopilot_enabled} onChange={e => setNewVacancy({ ...newVacancy, autopilot_enabled: e.target.checked })} />
                            <span className="text-sm font-medium text-slate-300">Enable AI Autopilot by default</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/50 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-medium">Cancel</button>
                  <button type="submit" form="createVacancyForm" disabled={creating} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center">
                    {creating ? "Creating..." : "Create Vacancy"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default HRDashboard;
