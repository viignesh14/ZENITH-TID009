import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Briefcase, ArrowRight, Zap, Code, ShieldCheck, Database, Layout, Search, FileText, CheckCircle, Clock, XCircle, LogOut, Video, BookOpen, GraduationCap, Award, BrainCircuit, Newspaper, Users, Wallet, Shield, MapPin, Mail, Phone, Calendar, Target, Loader2 } from "lucide-react";
import MockInterviewPage from "./MockInterview";
import { supabase } from "../supabaseClient";

const BASE_URL = "http://127.0.0.1:8000/api";

const TypingAnimation = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [index, text]);

  return (
    <div className="flex flex-col">
      <span className="text-sm text-slate-200 leading-relaxed font-medium">{displayedText}<span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse" /></span>
    </div>
  );
};

function CandidateDashboard() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("roles"); // "roles", "mockinterview", "applications", or "profile"
  const [profile, setProfile] = useState({ name: "", phone: "", location: "", linkedin: "", github: "", experience: "", skills: "", currentRole: "", education: "" });
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState({});
  const [aiMessages, setAiMessages] = useState({});
  const [searched, setSearched] = useState(false);
  const [talentData, setTalentData] = useState(null);
  const [talentLoading, setTalentLoading] = useState(false);
  const [selectedMockVacancy, setSelectedMockVacancy] = useState(null); // for mock interview
  const [staffTab, setStaffTab] = useState("overview"); // "overview" or "upgrade"

  // Fetch profile from Supabase
  const fetchProfile = async (email) => {
    if (!email) return;
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (data) {
        setProfile({
          name: data.name || "",
          phone: data.phone || "",
          location: data.location || "",
          linkedin: data.linkedin || "",
          github: data.github || "",
          experience: data.experience || "",
          skills: data.skills || "",
          currentRole: data.current_role || "",
          education: data.education || "",
          employee_id: data.employee_id || ""
        });
        localStorage.setItem("candidateProfile", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error fetching profile from Supabase:", err);
      // Fallback to local storage handled in init
    }
  };

  const saveProfileToSupabase = async (profileData, email) => {
    if (!email) return;
    try {
      const isHired = !!profileData.employee_id;

      const upsertData = {
        email: email.toLowerCase(),
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
        linkedin: profileData.linkedin,
        github: profileData.github,
        experience: profileData.experience,
        skills: profileData.skills,
        current_role: profileData.currentRole,
        education: profileData.education,
        employee_id: profileData.employee_id || null, // Include employee_id if it exists
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('candidate_profiles')
        .upsert(upsertData, { onConflict: 'email' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error saving profile to Supabase:", err);
      return false;
    }
  };

  // Initialize email from localStorage if present
  useEffect(() => {
    const initDashboard = async () => {
      // 1. Check Supabase session first (Highest Truth)
      const { data: { session } } = await supabase.auth.getSession();
      let email = session?.user?.email;

      // 2. Fallback to localStorage if no session (for persistence/demo)
      if (!email) {
        email = localStorage.getItem("candidateEmail");
      }

      if (email) {
        setSearchEmail(email);
        localStorage.setItem("candidateEmail", email); // Sync
        autoFetchApplications(email);
        fetchProfile(email); // Load from Supabase

        // Listen for auth changes to clear email if they log out elsewhere
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) handleLogout();
          else if (session.user?.email) fetchProfile(session.user.email);
        });

        // Poll every 45 seconds to catch status changes
        const interval = setInterval(() => autoFetchApplications(email), 45000);
        return () => {
          clearInterval(interval);
          subscription.unsubscribe();
        }
      }
    };

    initDashboard();

    const savedProfile = localStorage.getItem("candidateProfile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) { }
    }
  }, []);

  // Dynamic icon mapper function based on title keywords
  const getJobIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('frontend') || t.includes('ui') || t.includes('design')) return <Layout className="w-6 h-6 text-emerald-400" />;
    if (t.includes('data') || t.includes('machine') || t.includes('ai')) return <Database className="w-6 h-6 text-amber-400" />;
    return <Code className="w-6 h-6 text-indigo-400" />; // default for backend/engineering
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/vacancies/`);
        // Only show open vacancies on candidate side, though right now all are considered 'open'
        setVacancies(res.data);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const autoFetchApplications = async (emailToSearch) => {
    setLoadingApps(true);
    setSearched(true);
    try {
      const res = await axios.get(`${BASE_URL}/candidate-applications/?email=${encodeURIComponent(emailToSearch.toLowerCase())}`);
      setApplications(res.data);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchTalentData = async (email) => {
    setTalentLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/get-talent/?email=${encodeURIComponent(email)}`);
      setTalentData(res.data);
    } catch (err) {
      console.error("Failed to fetch growth insights:", err);
    } finally {
      setTalentLoading(false);
    }
  };

  // Handle tab switching based on hired status (Automatic Landing)
  useEffect(() => {
    if (applications.length > 0) {
      const hiredApp = applications.find(app => app.status === "hired");
      if (hiredApp) {
        // If hired, they are an employee -> show growth plan / welcome panel in My Applications
        setActiveTab("applications");
        if (searchEmail) {
          fetchTalentData(searchEmail);

          // Auto-sync Employee ID to Supabase if missing
          if (!profile.employee_id) {
            const nexusId = `HN-00${hiredApp.candidate_id || hiredApp.id}`;
            saveProfileToSupabase({ ...profile, employee_id: nexusId }, searchEmail);
          }
        }
      } else {
        // If not hired (fired/rejected/new), show open roles so they can apply immediately
        setActiveTab("roles");
        setTalentData(null);
      }
    }
  }, [applications]);

  const fetchApplications = async (e) => {
    e.preventDefault();
    if (!searchEmail) return;
    localStorage.setItem("candidateEmail", searchEmail);
    autoFetchApplications(searchEmail);
  };

  const handleNegotiate = async (candidateId, action, counterOffer = "") => {
    setLoadingApps(true);
    setAiMessages(prev => ({ ...prev, [candidateId]: "" }));
    setIsAiTyping(prev => ({ ...prev, [candidateId]: false }));

    try {
      const res = await axios.post(`${BASE_URL}/candidate-negotiate/`, {
        candidate_id: candidateId,
        action,
        counter_offer: counterOffer
      });

      if (action === 'negotiate') {
        // Simulate Agent Thinking
        setTimeout(() => {
          const history = res.data.history?.split('\n') || [];
          const lastResponse = history.pop() || "I am reviewing your proposal...";
          setAiMessages(prev => ({ ...prev, [candidateId]: lastResponse }));
          setIsAiTyping(prev => ({ ...prev, [candidateId]: true }));
          autoFetchApplications(searchEmail);
        }, 1500);
      } else {
        autoFetchApplications(searchEmail);
      }
    } catch (err) {
      console.error("Negotiation failed:", err);
      alert("Negotiation failed. Please check your connection.");
    } finally {
      setLoadingApps(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("candidateEmail");
    setSearchEmail("");
    setApplications([]);
    setSearched(false);
    setActiveTab("roles");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'hired':
        return <span className="flex items-center text-sm font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"><CheckCircle className="w-4 h-4 mr-2" /> Hired</span>;
      case 'rejected':
      case 'ai_rejected':
        return <span className="flex items-center text-sm font-semibold px-3 py-1 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20"><XCircle className="w-4 h-4 mr-2" /> Rejected</span>;
      case 'hr_pending':
        return <span className="flex items-center text-sm font-semibold px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20"><Clock className="w-4 h-4 mr-2" /> Under Review</span>;
      case 'offered':
        return <span className="flex items-center text-sm font-semibold px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30 shadow-lg shadow-indigo-500/10 animate-pulse"><Zap className="w-4 h-4 mr-2" /> Offer Received</span>;
      case 'fired':
        return <span className="flex items-center text-sm font-semibold px-3 py-1 bg-red-600/10 text-red-500 rounded-lg border border-red-600/20 shadow-lg shadow-red-500/5"><XCircle className="w-4 h-4 mr-2 font-black" /> EX-EMPLOYEE</span>;
      default:
        return <span className="flex items-center text-sm font-semibold px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20"><Clock className="w-4 h-4 mr-2" /> Applied</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-400 font-medium tracking-wide animate-pulse">Loading Open Roles...</span>
        </div>
      </div>
    );
  }

  const hiredApp = applications.find(app => app.status === "hired");

  if (hiredApp) {
    return (
      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* Official Staff Portal Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-slate-700/50 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center text-left">
          {/* ... (Existing Hero Content) ... */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <Shield className="w-3.5 h-3.5" />
                <span>OFFICIAL STAFF</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-slate-800/80 text-slate-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-slate-700/50">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>NEXUS ID: HN-00{hiredApp.candidate_id || hiredApp.id}</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">{hiredApp.name || "Employee"}</span>
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                  <Briefcase className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Role / Department</p>
                  <p className="text-xl font-bold text-white tracking-tight">{hiredApp.vacancy_title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <Calendar className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Member Since</p>
                  <p className="text-xl font-bold text-white tracking-tight">{new Date(hiredApp.created_at).getFullYear()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 md:mt-0 flex flex-col items-center md:items-end space-y-4 relative z-10 w-full md:w-auto">
            {/* User Profile Mini-Card */}
            <div className="bg-slate-900/60 p-4 rounded-3xl border border-slate-700/50 backdrop-blur-xl w-full md:w-64 mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                  {hiredApp.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{hiredApp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{hiredApp.email}</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] opacity-40">Auth Verified • Nexus Core v2.4.0</p>
          </div>
        </div>

        {/* Staff Sub-Navigation */}
        <div className="flex justify-center md:justify-start gap-4 mb-2">
          <button
            onClick={() => setStaffTab("overview")}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center ${staffTab === "overview"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
              : "bg-slate-800/40 text-slate-400 hover:text-white border border-slate-700/50"
              }`}
          >
            <Layout className="w-3.5 h-3.5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setStaffTab("upgrade")}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center ${staffTab === "upgrade"
              ? "bg-purple-600 text-white shadow-xl shadow-purple-600/20"
              : "bg-slate-800/40 text-slate-400 hover:text-white border border-slate-700/50"
              }`}
          >
            <Award className="w-3.5 h-3.5 mr-2" />
            Upgrade Skill
          </button>
          <button
            onClick={() => setStaffTab("profile")}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center ${staffTab === "profile"
              ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
              : "bg-slate-800/40 text-slate-400 hover:text-white border border-slate-700/50"
              }`}
          >
            <Users className="w-3.5 h-3.5 mr-2" />
            My Profile
          </button>
        </div>

        {staffTab === "overview" ? (
          /* Core Staff Dashboard Sections */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Growth & Docs */}
            <div className="lg:col-span-2 space-y-8">
              {/* AI Growth Section */}
              <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <BrainCircuit className="w-6 h-6 mr-3 text-indigo-400" />
                    AI Growth Strategy
                  </h2>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-500/20">Active Analysis</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/30">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-amber-400" />
                      Promotion Path
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                      {talentData?.career_path?.promotion_roadmap || "AI is synthesizing your roadmap based on current performance benchmarks..."}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                        <span className="text-slate-500 font-bold">Readiness Score</span>
                        <span className="text-indigo-400 font-bold">{talentData?.career_path?.readiness_score || 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${talentData?.career_path?.readiness_score || 0}%` }} className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/30">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest flex items-center">
                      <Users className="w-4 h-4 mr-2 text-emerald-400" />
                      Assigned Mentor
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                      {talentData?.assigned_mentor_role || "Assigning a senior mentor based on your tech stack..."}
                    </p>
                    <div className="flex items-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Connect Requested</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents & Compliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <FileText className="w-5 h-5 mr-3 text-emerald-400" />
                    My Documents
                  </h3>
                  <div className="space-y-3">
                    {['Employment_Contract.pdf', 'Employee_Handbook.pdf', 'Benefits_Guide.pdf'].map((doc, i) => (
                      <div key={i} className="group flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-slate-700/30 hover:bg-slate-800/60 transition-all cursor-pointer">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mr-4 border border-slate-700/50">
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <span className="text-sm text-slate-300 font-medium truncate max-w-[140px]">{doc}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Wallet className="w-5 h-5 mr-3 text-amber-400" />
                    Payroll & Benefits
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-700/30 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Next Pay Cycle</p>
                        <p className="text-sm font-bold text-white">March 31, 2026</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Status</p>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-500/20">VERIFIED</span>
                      </div>
                    </div>
                    <button className="w-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold py-3 px-6 rounded-2xl border border-slate-700/50 transition-all active:scale-[0.98] text-sm">
                      View Benefits Package
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: News & Team */}
            <div className="space-y-8">
              {/* Announcements */}
              <div className="bg-indigo-600/10 border border-indigo-500/20 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Newspaper className="w-5 h-5 mr-3 text-indigo-400" />
                  Latest Memos
                </h3>
                <div className="space-y-6">
                  <div className="border-l-2 border-indigo-500 pl-4 py-1">
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Company-wide • Today</p>
                    <p className="text-sm font-bold text-white mb-1 leading-snug">Nexus Summit 2026</p>
                    <p className="text-xs text-slate-400 line-clamp-2">Register now for our semi-annual engineering summit on AI Ethics.</p>
                  </div>
                  <div className="border-l-2 border-slate-700 pl-4 py-1">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">HR Update • Yesterday</p>
                    <p className="text-sm font-bold text-white mb-1 leading-snug">New Wellness Perks</p>
                    <p className="text-xs text-slate-400 line-clamp-2">Check the portal for the new health insurance premium upgrades.</p>
                  </div>
                </div>
              </div>

              {/* Team Directory Placeholder */}
              <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Users className="w-5 h-5 mr-3 text-emerald-400" />
                  Your Team
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Sarah Chen', role: 'Team Lead', color: 'bg-emerald-500' },
                    { name: 'Alex Rivera', role: 'DevOps', color: 'bg-amber-500' },
                    { name: 'James Wilson', role: 'Product', color: 'bg-indigo-500' }
                  ].map((member, i) => (
                    <div key={i} className="flex items-center p-3 bg-slate-900/40 rounded-2xl border border-slate-700/20">
                      <div className={`w-9 h-9 rounded-full ${member.color} flex items-center justify-center text-white font-black text-[10px] mr-3 shadow-lg`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-none mb-1">{member.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">{member.role}</p>
                      </div>
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  ))}
                  <button className="w-full text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 hover:text-white transition-colors">
                    View Full Directory
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : staffTab === "upgrade" ? (
          /* Upgrade Skills View */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white flex items-center">
                    <Award className="w-8 h-8 mr-4 text-purple-400" />
                    Skill Multiplier
                  </h2>
                  <p className="text-slate-400 mt-2">AI-curated learning paths to accelerate your career within the {hiredApp.vacancy_title} domain.</p>
                </div>
                <div className="hidden md:block">
                  <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Growth Phase: Accelerating</span>
                  </div>
                </div>
              </div>

              {talentData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-700/30 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-purple-500/10 transition-all duration-500" />
                      <h3 className="text-sm font-black text-purple-400 mb-6 uppercase tracking-[0.3em] flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        AI Learning Summary
                      </h3>
                      <p className="text-lg text-white font-medium leading-relaxed leading-relaxed">
                        {talentData.upskilling_summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {talentData.identified_skill_gaps?.map((gap, i) => (
                        <div key={i} className="flex items-center p-4 bg-slate-900/40 rounded-2xl border border-slate-700/20">
                          <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center mr-4">
                            <Target className="w-4 h-4 text-red-400" />
                          </div>
                          <span className="text-xs font-bold text-slate-300">{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-500 mb-2 uppercase tracking-[0.4em]">Recommended Resources</h3>
                    <div className="space-y-4">
                      {talentData.course_recommendations?.map((course, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => window.open(course.direct_url || `https://www.google.com/search?q=${encodeURIComponent(course.title + " " + course.platform)}`, '_blank')}
                          className="group flex items-center p-6 bg-slate-900/80 border border-slate-700/40 rounded-3xl hover:border-purple-500/50 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/5"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 flex items-center justify-center mr-6 group-hover:scale-110 transition-transform shadow-inner">
                            <GraduationCap className="w-7 h-7 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">{course.platform}</p>
                            <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors leading-tight">{course.title}</h4>
                            <p className="text-xs text-slate-500 mt-2 font-medium">{course.focus_area}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-2">Pro Tip</p>
                      <p className="text-xs text-slate-500 leading-relaxed">Complete these courses to increase your "Readiness Score" for the next internal assessment.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-slate-700 border-dashed rounded-[2rem]">
                  <Loader2 className="w-10 h-10 text-slate-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">Retrieving personalized skill paths...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Profile View for Staff */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
            <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <Users className="w-6 h-6 mr-3 text-indigo-400" /> Official Staff Profile
                </h2>
                {!isEditingProfile && (
                  <button onClick={() => setIsEditingProfile(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg active:scale-95 text-sm">
                    Edit Details
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="space-y-6 mt-6">
                  {/* Reuse the existing profile display logic */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                      <p className="text-lg text-white font-semibold">{profile.name || hiredApp.name || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Employee Email</label>
                      <p className="text-lg text-white font-semibold">{searchEmail || hiredApp.email || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nexus ID</label>
                      <p className="text-lg text-indigo-400 font-black">HN-00{hiredApp.candidate_id || hiredApp.id}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                      <p className="text-lg text-white font-semibold">{profile.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Location</label>
                      <p className="text-lg text-white font-semibold">{profile.location || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">LinkedIn Profile</label>
                      {profile.linkedin ? <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-lg text-indigo-400 hover:underline font-semibold break-all">{profile.linkedin}</a> : <p className="text-lg text-white font-semibold">Not provided</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">GitHub / Portfolio</label>
                      {profile.github ? <a href={profile.github} target="_blank" rel="noreferrer" className="text-lg text-emerald-400 hover:underline font-semibold break-all">{profile.github}</a> : <p className="text-lg text-white font-semibold">Not provided</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Role in Company</label>
                      <p className="text-lg text-white font-semibold">{hiredApp.vacancy_title}</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-700/50">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Technical Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills ? profile.skills.split(',').map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-md border border-slate-600 font-medium text-sm">{skill.trim()}</span>
                      )) : <p className="text-lg text-white font-semibold">Not provided</p>}
                    </div>
                  </div>
                  {/* ... rest of the profile read-only view ... */}
                  <div className="pt-6 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 italic">This profile is linked to your official employment record. Changes made here will be verified by the Nexus AI Protocol.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                      <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Phone</label>
                      <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Location</label>
                      <input type="text" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2 opacity-50">Employee Email (System Managed)</label>
                      <input type="email" value={searchEmail} disabled className="w-full bg-slate-900/30 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">LinkedIn Profile</label>
                      <input type="url" value={profile.linkedin} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">GitHub / Portfolio</label>
                      <input type="url" value={profile.github} onChange={(e) => setProfile({ ...profile, github: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-400 mb-2">Technical Skills (Comma separated)</label>
                      <input type="text" value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" />
                    </div>
                  </div>
                  <div className="pt-6 text-center space-x-4">
                    <button onClick={() => setIsEditingProfile(false)} className="px-8 py-3 font-bold rounded-xl text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all shadow-lg active:scale-95">
                      Cancel
                    </button>
                    <button onClick={async () => {
                      const success = await saveProfileToSupabase({ ...profile, employee_id: `HN-00${hiredApp.candidate_id || hiredApp.id}` }, searchEmail);
                      if (success) {
                        setIsEditingProfile(false);
                        setIsProfileSaved(true);
                        setTimeout(() => setIsProfileSaved(false), 3000);
                      } else {
                        alert("Sync Failed. Please check Supabase connection.");
                      }
                    }} className={`px-8 py-3 font-bold rounded-xl text-white transition-all shadow-lg active:scale-95 ${isProfileSaved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}>
                      {isProfileSaved ? "Saved to Nexus Cloud" : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-xl flex flex-col items-center text-center">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          <span>HireNexus Candidate Portal</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 max-w-3xl">
          Discover your next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">career opportunity</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl text-center mx-auto">
          We use strictly objective, AI-driven evaluation processes to guarantee every applicant gets a fair, transparent review based on their genuine skills.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-800/60 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-700/50 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center ${activeTab === "roles"
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
          >
            <Briefcase className="w-4 h-4 mr-2" /> Open Roles
          </button>
          <button
            onClick={() => { setActiveTab("mockinterview"); setSelectedMockVacancy(null); }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center ${activeTab === "mockinterview"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
          >
            <BrainCircuit className="w-4 h-4 mr-2" /> Mock Interview
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center ${activeTab === "applications"
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
          >
            <FileText className="w-4 h-4 mr-2" /> My Applications
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center ${activeTab === "profile"
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
          >
            <Users className="w-4 h-4 mr-2" /> My Profile
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === "mockinterview" ? (
        <div className="animate-in fade-in duration-500">
          {!selectedMockVacancy ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white pl-3 border-l-4 border-purple-500">Select a Role to Practice</h2>
                <span className="text-slate-400 font-medium bg-slate-800/50 px-3 py-1 rounded-full text-sm border border-slate-700">{vacancies.length} Available</span>
              </div>
              {vacancies.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700 border-dashed rounded-3xl p-12 text-center">
                  <BrainCircuit className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No open roles available</h3>
                  <p className="text-slate-500 text-sm mt-1">HR hasn't posted any vacancies yet. Check back soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vacancies.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
                      className="group flex flex-col bg-slate-800/60 backdrop-blur-xl border border-slate-700/70 shadow-lg rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all duration-300"
                    >
                      <div className="p-6 flex-grow border-b border-slate-700/50 flex flex-col items-start">
                        <div className="w-12 h-12 rounded-2xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shadow-inner mb-5 group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <BrainCircuit className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 leading-snug h-14 line-clamp-2">{job.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="text-[11px] font-semibold px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20">{job.experience_required}+ Yrs</span>
                          <span className="text-[11px] font-semibold px-2 py-1 bg-slate-700/50 text-slate-400 rounded-md border border-slate-600/50">5 Questions</span>
                        </div>
                        <div className="space-y-2 mt-auto w-full">
                          {job.required_skills.split(',').slice(0, 3).map((skill, i) => (
                            <div key={i} className="flex items-center text-sm text-slate-400">
                              <ShieldCheck className="w-4 h-4 text-purple-400/70 mr-2 shrink-0" />
                              <span className="truncate">{skill.trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-900/30">
                        <button
                          onClick={() => {
                            if (!searchEmail) {
                              alert("Please go to 'My Applications' tab first and enter your email, or save your profile with an email.");
                              return;
                            }
                            setSelectedMockVacancy(job);
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center"
                        >
                          <BrainCircuit className="w-4 h-4 mr-2" /> Start Mock Interview
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <MockInterviewPage
              vacancy={selectedMockVacancy}
              candidateEmail={searchEmail}
              candidateName={profile.name || "Candidate"}
              onBack={() => setSelectedMockVacancy(null)}
            />
          )}
        </div>
      ) : activeTab === "profile" ? (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Users className="w-6 h-6 mr-3 text-indigo-400" /> Your Profile Details
              </h2>
              {!isEditingProfile && (
                <button onClick={() => setIsEditingProfile(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg active:scale-95 text-sm">
                  Edit Profile
                </button>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                    <p className="text-lg text-white font-semibold">{profile.name || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                    <p className="text-lg text-white font-semibold">{searchEmail || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                    <p className="text-lg text-white font-semibold">{profile.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Location</label>
                    <p className="text-lg text-white font-semibold">{profile.location || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">LinkedIn Profile</label>
                    {profile.linkedin ? <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-lg text-indigo-400 hover:underline font-semibold break-all">{profile.linkedin}</a> : <p className="text-lg text-white font-semibold">Not provided</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">GitHub / Portfolio</label>
                    {profile.github ? <a href={profile.github} target="_blank" rel="noreferrer" className="text-lg text-emerald-400 hover:underline font-semibold break-all">{profile.github}</a> : <p className="text-lg text-white font-semibold">Not provided</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current Job Title</label>
                    <p className="text-lg text-white font-semibold">{profile.currentRole || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Years of Experience</label>
                    <p className="text-lg text-white font-semibold">{profile.experience ? `${profile.experience} years` : "Not provided"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-700/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Core Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills ? profile.skills.split(',').map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-md border border-slate-600 font-medium text-sm">{skill.trim()}</span>
                      )) : <p className="text-lg text-white font-semibold">Not provided</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Highest Education</label>
                    <p className="text-lg text-white font-semibold">{profile.education || "Not provided"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                    <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email Address (Search Key)</label>
                    <input type="email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Phone Number</label>
                    <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Location</label>
                    <input type="text" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="New York, USA" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">LinkedIn Profile URL</label>
                    <input type="url" value={profile.linkedin} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="https://linkedin.com/in/johndoe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">GitHub / Portfolio URL</label>
                    <input type="url" value={profile.github} onChange={(e) => setProfile({ ...profile, github: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="https://github.com/johndoe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Current Job Title</label>
                    <input type="text" value={profile.currentRole} onChange={(e) => setProfile({ ...profile, currentRole: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="Senior Frontend Engineer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Years of Experience</label>
                    <input type="number" value={profile.experience} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="5" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Core Skills (Comma separated)</label>
                    <input type="text" value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium" placeholder="React, Python, AWS, System Design" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Highest Education</label>
                    <select value={profile.education} onChange={(e) => setProfile({ ...profile, education: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium appearance-none cursor-pointer">
                      <option value="" disabled>Select your education level</option>
                      <option value="High School">High School</option>
                      <option value="Associate Degree">Associate Degree</option>
                      <option value="Bachelor's Degree">Bachelor's Degree</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="Ph.D.">Ph.D.</option>
                      <option value="Self-Taught / Bootcamp">Self-Taught / Bootcamp</option>
                    </select>
                  </div>
                </div>
                <div className="pt-6 text-center space-x-4">
                  <button onClick={() => setIsEditingProfile(false)} className="px-8 py-3 font-bold rounded-xl text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all shadow-lg active:scale-95">
                    Cancel
                  </button>
                  <button onClick={async () => {
                    const success = await saveProfileToSupabase(profile, searchEmail);
                    if (success) {
                      localStorage.setItem("candidateProfile", JSON.stringify(profile));
                      localStorage.setItem("candidateEmail", searchEmail);
                      setIsEditingProfile(false);
                      setIsProfileSaved(true);
                      setTimeout(() => setIsProfileSaved(false), 3000);
                    } else {
                      alert("Failed to save profile to Supabase. Please ensure your session is active.");
                    }
                  }} className={`px-8 py-3 font-bold rounded-xl text-white transition-all shadow-lg active:scale-95 ${isProfileSaved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}>
                    {isProfileSaved ? <span className="flex items-center"><CheckCircle className="w-5 h-5 mr-2" /> Saved</span> : "Save Profile Details"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "roles" ? (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white pl-3 border-l-4 border-indigo-500">Open Roles</h2>
            <span className="text-slate-400 font-medium bg-slate-800/50 px-3 py-1 rounded-full text-sm border border-slate-700">{vacancies.length} Vacant</span>
          </div>

          {vacancies.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700 border-dashed rounded-3xl p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300">No open roles currently</h3>
              <p className="text-slate-500 text-sm mt-1">Please check back later for new opportunities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vacancies.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex flex-col bg-slate-800/60 backdrop-blur-xl border border-slate-700/70 shadow-lg rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 relative"
                >
                  <div className="p-6 flex-grow border-b border-slate-700/50 flex flex-col items-start">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-center shadow-inner mb-6 group-hover:scale-110 transition-transform duration-300 shrink-0">
                      {getJobIcon(job.title)}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 leading-snug h-14 line-clamp-2">{job.title}</h3>

                    <div className="flex flex-wrap gap-2 mb-4 w-full">
                      <span className="text-[11px] font-semibold px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">{job.experience_required}+ Yrs Exp</span>
                      <span className="text-[11px] font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">{job.max_hires} Openings</span>
                    </div>

                    <div className="space-y-2 mt-auto w-full">
                      {job.required_skills.split(',').slice(0, 3).map((skill, i) => (
                        <div key={i} className="flex items-center text-sm text-slate-400">
                          <ShieldCheck className="w-4 h-4 text-emerald-400/70 mr-2 shrink-0" />
                          <span className="truncate">{skill.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/30 flex justify-between items-center w-full">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Status</span>
                      <span className="text-sm text-emerald-400 font-medium flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span> Open
                      </span>
                    </div>

                    <Link
                      to={`/apply?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center group/btn"
                    >
                      Apply <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-2">Track Your Applications</h2>
            <p className="text-slate-400 mb-6">Enter the email address you used to apply to view your application status.</p>

            <form onSubmit={fetchApplications} className="flex gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500 outline-none"
                  placeholder="Enter your email address"
                />
              </div>
              <button
                type="submit"
                disabled={loadingApps || !searchEmail}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center"
              >
                {loadingApps ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {searched && (
            <div>
              <h3 className="text-xl font-bold text-white mb-6 pl-3 border-l-4 border-indigo-500">
                Applications for {searchEmail}
              </h3>

              {applications.length === 0 && !loadingApps ? (
                <div className="bg-slate-800/40 border border-slate-700 border-dashed rounded-3xl p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No applications found</h3>
                  <p className="text-slate-500 text-sm mt-1">We couldn't find any applications associated with this email.</p>
                </div>
              ) : null}

              {!loadingApps && applications.length > 0 && (
                <div className="space-y-4">
                  {applications.map((app, index) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/70 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">{app.vacancy_title}</h4>
                        <p className="text-sm text-slate-400">Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {app.ai_score !== null && (
                          <div className="text-right hidden md:block border-r border-slate-700 pr-4">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1">AI Score</span>
                            <span className="text-indigo-400 font-bold">{app.ai_score}/100</span>
                          </div>
                        )}
                        <div>
                          {getStatusBadge(app.status)}
                        </div>
                      </div>

                      {/* Offer Negotiation Panel */}
                      {app.status === 'hired' && (
                        <div className="w-full mt-6 pt-6 border-t border-emerald-500/20 bg-emerald-500/5 -mx-6 -mb-6 p-8 rounded-b-2xl">
                          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h4 className="text-2xl font-black text-white">Welcome to the Team!</h4>
                              </div>
                              <p className="text-slate-300 leading-relaxed mb-6">
                                Congratulations on joining our company! Your onboarding is officially complete. Below is your AI-generated growth roadmap for the first 90 days.
                              </p>

                              {talentData ? (
                                <div className="mt-8 space-y-6">
                                  {/* Upskilling & Mentor Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-900 shadow-xl border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                      <h5 className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mb-3 flex items-center">
                                        <Zap className="w-3 h-3 mr-2" /> AI Upskilling Path
                                      </h5>
                                      <p className="text-sm text-white font-medium">{talentData.upskilling_summary}</p>
                                    </div>
                                    <div className="bg-slate-900 shadow-xl border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                      <h5 className="text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-3 flex items-center">
                                        <Users className="w-3 h-3 mr-2" /> Assigned Mentor
                                      </h5>
                                      <p className="text-sm text-white font-medium">{talentData.assigned_mentor_role}</p>
                                    </div>
                                  </div>

                                  {/* Recommended Courses */}
                                  <div>
                                    <h5 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-4 flex items-center">
                                      <BookOpen className="w-3 h-3 mr-2 text-indigo-400" /> Recommended Online Courses
                                    </h5>
                                    <div className="grid grid-cols-1 gap-3">
                                      {talentData.course_recommendations?.map((course, i) => (
                                        <div key={i} className="flex items-center p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all group cursor-pointer" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(course.title + " " + course.platform)}`, '_blank')}>
                                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-4 border border-indigo-500/20">
                                            <GraduationCap className="w-5 h-5 text-indigo-400" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{course.title}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{course.platform} • {course.focus_area}</p>
                                          </div>
                                          <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                  <div className="bg-slate-900 shadow-xl border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
                                    <h5 className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mb-3 flex items-center">
                                      <Zap className="w-3 h-3 mr-2" /> Upskilling Path
                                    </h5>
                                    <p className="text-sm text-white font-medium">AWS Certified Solutions Architect + GraphQL</p>
                                  </div>
                                  <div className="bg-slate-900 shadow-xl border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
                                    <h5 className="text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-3 flex items-center">
                                      <Users className="w-3 h-3 mr-2" /> Assigned Mentor
                                    </h5>
                                    <p className="text-sm text-white font-medium">Senior Engineering Team Lead</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="w-full md:w-64 space-y-3">
                              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2">
                                <span>Watch Course Videos</span>
                              </button>
                              <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-700 border-dashed">
                                <span>Career Roadmap Docs</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {app.status === 'offered' && (
                        <div className="w-full mt-6 pt-6 border-t border-indigo-500/20 bg-indigo-500/5 -mx-6 -mb-6 p-6 rounded-b-2xl">
                          <div className="flex flex-col lg:flex-row gap-6">
                            {/* Offer Details Side */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-4">
                                <Zap className="w-5 h-5 text-indigo-400" />
                                <h5 className="text-indigo-400 font-black uppercase tracking-widest text-xs">Official Offer Package</h5>
                              </div>
                              <p className="text-4xl font-black text-white mb-2 tracking-tight">₹{app.offered_salary}{app.offered_salary && !app.offered_salary.toLowerCase().includes('l') ? 'L' : ''}</p>
                              <div className="flex items-center space-x-4 mt-6">
                                <button
                                  onClick={() => handleNegotiate(app.id, 'accept')}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Accept & Join</span>
                                </button>
                                <button
                                  onClick={() => handleNegotiate(app.id, 'reject')}
                                  className="px-6 bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-400 border border-slate-700/50 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>

                            {/* Conversational Message Area */}
                            <div className="flex-1 bg-slate-900 shadow-2xl rounded-3xl border border-indigo-500/20 p-6 relative overflow-hidden flex flex-col min-h-[250px]">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BrainCircuit className="w-20 h-20 text-indigo-400" />
                              </div>

                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center">
                                  <BrainCircuit className="w-3.5 h-3.5 mr-2" />
                                  Negotiate with AI
                                </span>
                                <div className="flex space-x-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[10px] text-slate-500 font-bold uppercase">Online</span>
                                </div>
                              </div>

                              <div className="flex-grow space-y-4 mb-6">
                                <div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-none border border-slate-700/50 max-w-[90%]">
                                  {(loadingApps && !isAiTyping[app.id]) ? (
                                    <div className="flex space-x-1 py-1">
                                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                    </div>
                                  ) : isAiTyping[app.id] ? (
                                    <TypingAnimation text={aiMessages[app.id]} />
                                  ) : (
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                      {aiMessages[app.id] || app.negotiation_history?.split('\n').pop() || "Hello! I am your AI Recruiter. I'm open to discussing the compensation for this role based on your skills."}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="relative mt-auto">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                <input
                                  type="text"
                                  id={`counter-${app.id}`}
                                  placeholder="Enter Counter Offer (e.g. 15)"
                                  className="w-full bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 text-white pl-8 pr-28 py-4 rounded-2xl text-sm outline-none transition-all font-bold placeholder:font-normal placeholder:text-slate-600 shadow-inner"
                                />
                                <button
                                  onClick={() => {
                                    const val = document.getElementById(`counter-${app.id}`).value;
                                    if (val) {
                                      handleNegotiate(app.id, 'negotiate', `₹${val}L`);
                                      document.getElementById(`counter-${app.id}`).value = "";
                                    }
                                  }}
                                  disabled={loadingApps}
                                  className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                  Negotiate
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CandidateDashboard;
