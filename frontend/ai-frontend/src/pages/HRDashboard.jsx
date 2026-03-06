import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle, XCircle, BrainCircuit, ShieldAlert, ShieldCheck, Mail, BarChart3, Clock, PlusCircle, Briefcase, ChevronDown, Trash2, Zap, RotateCcw, FileText, Star, TrendingUp, Award, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import BASE_URL from "../config";

function HRDashboard() {
  const [vacancies, setVacancies] = useState([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState("pipeline"); // "pipeline", "offered", "hired", "rejected", "strategy", or "interviews"
  const [strategyData, setStrategyData] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [editOfferValue, setEditOfferValue] = useState("");
  const [interviewScores, setInterviewScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);
  // Workforce Planning state
  const [wpFile, setWpFile] = useState(null);
  const [wpLoading, setWpLoading] = useState(false);
  const [wpResult, setWpResult] = useState(null);
  const [wpError, setWpError] = useState("");
  // Company-wide employee overview
  const [companyEmp, setCompanyEmp] = useState(null);
  const [empPanelOpen, setEmpPanelOpen] = useState(true);

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
    fetchCompanyEmployees();
  }, []);

  const fetchCompanyEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/company-employees/`);
      setCompanyEmp(res.data);
    } catch (err) {
      console.error("Error fetching company employees:", err);
    }
  };

  useEffect(() => {
    if (viewMode === "strategy") {
      fetchStrategyData();
    }
    if (viewMode === "interviews" && selectedVacancyId) {
      fetchInterviewScores(selectedVacancyId);
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedVacancyId) {
      fetchDashboardData(selectedVacancyId);
      if (viewMode === "interviews") fetchInterviewScores(selectedVacancyId);
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

  const fetchInterviewScores = async (vid) => {
    setLoadingScores(true);
    try {
      const res = await axios.get(`${BASE_URL}/mock-interview/hr-scores/?vacancy_id=${vid}`);
      setInterviewScores(res.data);
    } catch (err) {
      console.error("Failed to fetch interview scores:", err);
    } finally {
      setLoadingScores(false);
    }
  };

  const deleteMockInterview = async (interviewId, candidateName) => {
    if (!window.confirm(`Remove mock interview result for ${candidateName || "this candidate"}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${BASE_URL}/mock-interview/${interviewId}/delete/`);
      setInterviewScores(prev => prev.filter(mi => mi.interview_id !== interviewId));
    } catch (err) {
      console.error("Failed to delete interview:", err);
      alert("Failed to remove the interview result. Please try again.");
    }
  };

  const downloadWorkforcePDF = (result) => {
    const doc = new jsPDF();
    const a = result.analysis;
    const cw = result.current_workforce;

    // Title
    doc.setFontSize(22);
    doc.setTextColor(63, 81, 181); // Indigo color
    doc.text("Workforce Planning Report", 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

    // Section 1: Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Executive Summary", 20, 45);
    doc.setFontSize(11);
    const splitSummary = doc.splitTextToSize(a.executive_summary, 170);
    doc.text(splitSummary, 20, 52);

    let yPos = 55 + (splitSummary.length * 6);

    // Section 2: Workforce Statistics
    doc.setFontSize(16);
    doc.text("Workforce Statistics", 20, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Current Employees', a.current_strength || cw.reduce((s, w) => s + w.count, 0)],
        ['Total Hires Needed Next Month', a.total_hires_needed_next_month]
      ],
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Section 3: Current Workforce Breakdown
    doc.setFontSize(14);
    doc.text("Current Workforce Breakdown", 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Role / Domain', 'Employee Count']],
      body: cw.map(w => [w.role, w.count]),
      theme: 'grid',
      headStyles: { fillColor: [75, 85, 99] }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Add page if needed
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Section 4: Hiring Recommendations
    doc.setFontSize(14);
    doc.text("Hiring Recommendations (Next Month)", 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Domain', 'Hires', 'Priority', 'Reason']],
      body: a.hiring_recommendations.map(r => [r.domain, r.count, r.priority, r.reason]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }, // Amber
      columnStyles: {
        3: { cellWidth: 80 }
      }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Add page if needed
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Section 5: Risk & Timeline
    doc.setFontSize(14);
    doc.text("Project Risks & Implementation Timeline", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Risk Analysis:", 20, yPos);
    doc.setFont("helvetica", "normal");
    const splitRisk = doc.splitTextToSize(a.risk_if_not_hired, 170);
    doc.text(splitRisk, 20, yPos + 6);

    yPos += 15 + (splitRisk.length * 6);

    doc.setFont("helvetica", "bold");
    doc.text("Suggested Timeline:", 20, yPos);
    doc.setFont("helvetica", "normal");
    const splitTimeline = doc.splitTextToSize(a.suggested_timeline, 170);
    doc.text(splitTimeline, 20, yPos + 6);

    // Save
    doc.save(`HireNexus_Workforce_Plan_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ─── COMPANY EMPLOYEES OVERVIEW ───────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800/90 to-indigo-950/60 border border-indigo-500/20 rounded-[1.5rem] shadow-xl overflow-hidden">
        {/* Header row — always visible */}
        <button
          onClick={() => setEmpPanelOpen(o => !o)}
          className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Company-Wide</p>
              <h3 className="text-white font-black text-lg leading-tight">Total Employees Overview</h3>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {companyEmp && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-3xl font-black text-white">{companyEmp.total_employees}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Hired</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-3xl font-black text-emerald-400">{companyEmp.total_open_vacancies}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Open Roles</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-3xl font-black text-indigo-400">{companyEmp.total_vacancies}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Vacancies</p>
                </div>
              </>
            )}
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${empPanelOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Expandable domain grid */}
        <AnimatePresence>
          {empPanelOpen && companyEmp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-700/50 p-5">
                {/* Mobile totals */}
                <div className="flex sm:hidden justify-around mb-5">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{companyEmp.total_employees}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Hired</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-400">{companyEmp.total_open_vacancies}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Open Roles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-indigo-400">{companyEmp.total_vacancies}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Vacancies</p>
                  </div>
                </div>

                {companyEmp.domains.length === 0 ? (
                  <div className="text-center py-6">
                    <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No employees hired yet across any domain.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {companyEmp.domains.map((d, i) => (
                      <motion.div
                        key={d.vacancy_id}
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm leading-snug truncate" title={d.domain}>{d.domain}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {d.required_skills?.split(',').slice(0, 2).map((s, j) => (
                              <span key={j} className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded font-bold">{s.trim()}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-2xl font-black ${d.employee_count > 0 ? "text-white" : "text-slate-600"}`}>{d.employee_count}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">employees</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Refresh button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={fetchCompanyEmployees}
                    className="flex items-center text-xs text-slate-500 hover:text-indigo-400 transition-colors space-x-1"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Refresh
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

            <motion.div onClick={() => { setViewMode("interviews"); fetchInterviewScores(selectedVacancyId); }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`bg-slate-800/80 border ${viewMode === 'interviews' ? 'border-purple-400 ring-4 ring-purple-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-purple-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 text-sm font-bold uppercase tracking-wider">Interviews</span>
                <BrainCircuit className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">{interviewScores.length > 0 ? interviewScores.length : "—"}</p>
            </motion.div>

            <motion.div onClick={() => setViewMode("workforce")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={`bg-slate-800/80 border ${viewMode === 'workforce' ? 'border-amber-400 ring-4 ring-amber-500/20' : 'border-slate-700'} rounded-3xl p-6 shadow-lg backdrop-blur-sm cursor-pointer hover:border-amber-400 transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-sm font-bold uppercase tracking-wider">Workforce Planning</span>
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-4xl font-black text-white mt-4">{wpResult ? "Done" : "Upload"}</p>
            </motion.div>
          </div>
        </>
      )}

      {/* Content Heading */}
      <div>
        <div className="flex items-center justify-between mb-6 pl-2 border-l-4 border-indigo-500">
          <h2 className="text-xl font-bold text-white">
            {viewMode === "pipeline" ? "Candidate Pipeline" : viewMode === "offered" ? "Offered Candidates" : viewMode === "hired" ? "Hired Candidates" : viewMode === "rejected" ? "Rejected Candidates" : viewMode === "interviews" ? "Mock Interview Scores" : "Workforce Planning"}
          </h2>
        </div>

        {viewMode === "workforce" ? (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">

            {/* Upload Card */}
            {!wpResult && (
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/80 to-amber-950/20 border border-amber-500/20 rounded-[2rem] p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]" />
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                      <BarChart3 className="w-7 h-7 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-[0.25em]">Sub-Agent 4</p>
                      <h3 className="text-xl font-black text-white">Workforce Planning AI</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Upload your <strong className="text-white">project plan / roadmap PDF</strong> and the AI will analyse it against the
                    current employee database to tell you exactly <strong className="text-white">how many people to hire, in which domain, for next month</strong>.
                  </p>

                  {/* Drop Zone */}
                  <label
                    htmlFor="wp-pdf-input"
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                      ${wpFile ? "border-amber-400 bg-amber-500/10" : "border-slate-600 hover:border-amber-400 hover:bg-amber-500/5 bg-slate-900/40"}`}
                  >
                    {wpFile ? (
                      <div className="text-center">
                        <FileText className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                        <p className="text-amber-300 font-bold text-sm">{wpFile.name}</p>
                        <p className="text-slate-500 text-xs mt-1">{(wpFile.size / 1024).toFixed(1)} KB — click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-300 font-bold">Click to upload Project PDF</p>
                        <p className="text-slate-500 text-xs mt-1">Supports PDF files only</p>
                      </div>
                    )}
                    <input
                      id="wp-pdf-input"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => { setWpFile(e.target.files[0] || null); setWpError(""); }}
                    />
                  </label>

                  {wpError && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <p className="text-red-400 text-xs font-bold">{wpError}</p>
                    </div>
                  )}

                  <button
                    disabled={!wpFile || wpLoading}
                    onClick={async () => {
                      if (!wpFile) return;
                      setWpLoading(true); setWpError("");
                      const fd = new FormData();
                      fd.append("project_pdf", wpFile);
                      try {
                        const res = await axios.post(`${BASE_URL}/workforce-planning/`, fd, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        setWpResult(res.data);
                      } catch (err) {
                        setWpError(err.response?.data?.error || "Analysis failed. Please try again.");
                      } finally {
                        setWpLoading(false);
                      }
                    }}
                    className="mt-6 w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-amber-600/20 active:scale-[0.98] text-base"
                  >
                    {wpLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Analysing with AI...</span>
                      </>
                    ) : (
                      <><BarChart3 className="w-5 h-5" /><span>Analyse & Generate Hiring Plan</span></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {wpResult && (() => {
              const a = wpResult.analysis;
              const priorityColor = (p) => p === "Critical" ? "bg-red-500/20 text-red-400 border-red-500/30" : p === "High" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
              return (
                <div className="space-y-6">
                  {/* Header with reset */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white pl-3 border-l-4 border-amber-500">AI Hiring Recommendations — Next Month</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => downloadWorkforcePDF(wpResult)}
                        className="text-xs text-emerald-400 hover:text-white flex items-center space-x-1 bg-emerald-500/10 hover:bg-emerald-500 px-3 py-2 rounded-xl border border-emerald-500/30 transition-all font-bold"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                      </button>
                      <button onClick={() => { setWpResult(null); setWpFile(null); }} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl border border-slate-700 transition-all">
                        <RotateCcw className="w-3 h-3 mr-1" /> Analyse another
                      </button>
                    </div>
                  </div>

                  {/* KPI Row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 text-center">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Current Employees</p>
                      <p className="text-4xl font-black text-white">{a.current_strength ?? wpResult.current_workforce.reduce((s, w) => s + w.count, 0)}</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center">
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">Hires Needed</p>
                      <p className="text-4xl font-black text-amber-300">{a.total_hires_needed_next_month}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Current Workforce</p>
                      {wpResult.current_workforce.length === 0 ? (
                        <p className="text-slate-500 text-xs">No hired employees yet</p>
                      ) : wpResult.current_workforce.map((w, i) => (
                        <div key={i} className="flex justify-between text-xs py-0.5">
                          <span className="text-slate-400 truncate">{w.role}</span>
                          <span className="text-white font-bold ml-2">{w.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="bg-gradient-to-r from-slate-800/60 to-amber-950/20 border border-amber-500/20 rounded-2xl p-6">
                    <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-2">Executive Summary</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{a.executive_summary}</p>
                  </div>

                  {/* Per-Domain Hiring Recs */}
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Hiring Recommendations by Domain</p>
                    <div className="space-y-4">
                      {(a.hiring_recommendations || []).map((rec, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                          className="bg-slate-800/70 border border-slate-700/70 rounded-2xl overflow-hidden">
                          <div className="p-5 flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${priorityColor(rec.priority)}`}>{rec.priority}</span>
                                <h4 className="text-white font-bold">{rec.domain}</h4>
                              </div>
                              <p className="text-slate-400 text-xs leading-relaxed mb-3">{rec.reason}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(rec.required_skills || []).map((s, j) => (
                                  <span key={j} className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg font-bold">{s}</span>
                                ))}
                              </div>
                            </div>
                            <div className="text-center shrink-0">
                              <p className="text-4xl font-black text-amber-400">{rec.count}</p>
                              <p className="text-[9px] text-slate-500 font-bold mt-0.5">to hire</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom 3 panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Skill Gaps */}
                    <div className="bg-slate-800/40 border border-red-500/20 rounded-2xl p-5">
                      <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-3">Skill Gaps Identified</p>
                      <div className="flex flex-wrap gap-2">
                        {(a.skill_gaps_identified || []).map((g, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-bold">{g}</span>
                        ))}
                      </div>
                    </div>
                    {/* Timeline */}
                    <div className="bg-slate-800/40 border border-indigo-500/20 rounded-2xl p-5">
                      <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-3">Suggested Timeline</p>
                      <p className="text-slate-300 text-xs leading-relaxed">{a.suggested_timeline}</p>
                    </div>
                  </div>

                  {/* Risk Box */}
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-2">Risk if Hires Not Made</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{a.risk_if_not_hired}</p>
                  </div>

                  {/* Notes */}
                  {a.additional_notes && (
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Additional Notes</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{a.additional_notes}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : viewMode === "interviews" ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {loadingScores ? (
              <div className="flex items-center justify-center min-h-[30vh]">
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-10 w-10 text-purple-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-slate-400 font-medium">Loading interview scores...</span>
                </div>
              </div>
            ) : interviewScores.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700 border-dashed rounded-3xl p-12 text-center">
                <BrainCircuit className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">No mock interview results yet</h3>
                <p className="text-slate-500 text-sm mt-1">Candidates who have completed mock interviews for this vacancy will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {interviewScores.map((mi, idx) => {
                  const scoreColor = mi.overall_score >= 80 ? "text-emerald-400" : mi.overall_score >= 60 ? "text-indigo-400" : mi.overall_score >= 40 ? "text-amber-400" : "text-red-400";
                  const recColor = mi.hiring_recommendation === "Strong Hire" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    mi.hiring_recommendation === "Hire" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" :
                      mi.hiring_recommendation === "Maybe" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30";
                  return (
                    <motion.div
                      key={mi.interview_id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
                      className="bg-slate-800/80 border border-slate-700/70 rounded-3xl overflow-hidden"
                    >
                      <div className="p-6 flex items-start justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-white font-black text-xl shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{mi.candidate_name || mi.candidate_email}</h3>
                            <div className="flex items-center text-xs text-slate-400 mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {mi.candidate_email}
                            </div>
                            {mi.completed_at && (
                              <div className="flex items-center text-xs text-slate-500 mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(mi.completed_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2 shrink-0">
                          <div className="text-right">
                            <p className={`text-4xl font-black ${scoreColor}`}>{mi.overall_score}</p>
                            <p className="text-xs text-slate-500 font-bold">/100</p>
                            <span className="text-sm font-black text-white">{mi.grade}</span>
                          </div>
                          <button
                            onClick={() => deleteMockInterview(mi.interview_id, mi.candidate_name || mi.candidate_email)}
                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                            title="Remove interview result"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="px-6 pb-6 space-y-4">
                        <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${recColor}`}>
                          <BrainCircuit className="w-3 h-3 mr-1.5" />
                          {mi.hiring_recommendation}
                        </span>
                        {mi.summary && <p className="text-xs text-slate-400 leading-relaxed">{mi.summary}</p>}
                        {mi.strengths && mi.strengths.length > 0 && (
                          <div>
                            <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-2">Key Strengths</p>
                            <div className="flex flex-wrap gap-1.5">
                              {mi.strengths.map((s, i) => (
                                <span key={i} className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {mi.areas_for_improvement && mi.areas_for_improvement.length > 0 && (
                          <div>
                            <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">Needs Improvement</p>
                            <div className="flex flex-wrap gap-1.5">
                              {mi.areas_for_improvement.map((a, i) => (
                                <span key={i} className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-bold">{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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
