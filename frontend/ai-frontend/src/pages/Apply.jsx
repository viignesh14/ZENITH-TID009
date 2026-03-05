import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle, AlertTriangle, FileText, ChevronRight, Briefcase, Zap, ShieldCheck, BrainCircuit } from "lucide-react";

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
      <span className="text-sm text-slate-200 leading-relaxed min-h-[1.5em]">{displayedText}<span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse" /></span>
    </div>
  );
};

function Apply() {
  const [searchParams] = useSearchParams();
  const initialVacancyId = searchParams.get("jobId") || 1;
  const jobTitle = searchParams.get("jobTitle") || "Backend Python Developer";

  const [form, setForm] = useState({ name: "", email: "", vacancy_id: initialVacancyId });
  const [resume, setResume] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResume(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !form.name || !form.email) return;

    setLoading(true);
    setResult(null);

    const data = new FormData();
    data.append("name", form.name);
    data.append("email", form.email);
    data.append("vacancy_id", form.vacancy_id);
    data.append("resume_file", resume);

    try {
      const res = await axios.post(`${BASE_URL}/evaluate/`, data);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || "Error submitting application";
      alert(`Submission Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNegotiate = async (action) => {
    if (!result?.candidate_id) return;
    setLoading(true);
    setAiResponse("");
    setIsAiTyping(false);

    try {
      const res = await axios.post(`${BASE_URL}/candidate-negotiate/`, {
        candidate_id: result.candidate_id,
        counter_offer: form.counter_offer ? `₹${form.counter_offer}L` : null,
        action: action
      });

      // If it was a negotiation, simulate "Agent Thinking"
      const formatSalary = (val) => {
        if (!val) return result?.offered_salary;
        return String(val).replace('₹', '').replace('L', '').replace('l', '').split('-')[0].trim();
      };

      if (action === 'negotiate') {
        setTimeout(() => {
          setIsAiTyping(true);
          const historyLines = res.data.history?.split('\n') || [];
          setAiResponse(historyLines.pop() || "I am reviewing your proposal...");
          setResult({ ...result, ...res.data, offered_salary: formatSalary(res.data.current_offer) });
        }, 1500);
      } else {
        setResult({ ...result, ...res.data, offered_salary: formatSalary(res.data.current_offer) });
      }

      if (action === 'accept' && res.data.status === 'hired') {
        alert("Congratulations! You are officially hired. Check your dashboard for onboarding.");
      }
    } catch (err) {
      console.error(err);
      alert("Negotiation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-10">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-start">

        {/* Left Side: Copy & Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col space-y-6"
        >
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full w-max text-sm font-medium">
            <Zap className="w-4 h-4" />
            <span>AI-Powered Recruitment</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Apply for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{jobTitle}</span>
          </h1>

          <p className="text-slate-400 text-lg">
            Join our cutting-edge engineering team. Our AI natively evaluates your resume securely and provides instant feedback on your application.
          </p>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-indigo-400" />
              What we're looking for
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 text-emerald-400 shrink-0" />
                <span>Strong experience with Python & Django</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 text-emerald-400 shrink-0" />
                <span>API Design & Database Management</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 text-emerald-400 shrink-0" />
                <span>Active GitHub profile with relevant projects</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Right Side: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-slate-800/60 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-3xl p-8 relative overflow-hidden"
        >
          {/* Subtle glow effect behind form */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl font-bold text-white mb-6 relative z-10">Application details</h2>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
                  placeholder="John Doe"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
                  placeholder="john@example.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Custom File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Resume (PDF)</label>
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900/30 hover:bg-slate-900/50'
                    }`}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="space-y-1 text-center flex flex-col items-center">
                    {resume ? (
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="w-10 h-10 text-indigo-400 mb-2" />
                        <span className="text-sm text-white font-medium break-words px-2 text-center w-full max-w-[200px] truncate">{resume.name}</span>
                        <span className="text-xs text-slate-400 hover:text-indigo-400" onClick={(e) => { e.stopPropagation(); setResume(null); }}>Change file</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                        <div className="flex text-sm text-slate-300">
                          <span className="relative font-medium text-indigo-400 hover:text-indigo-300">Upload a file</span>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500">PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => setResume(e.target.files[0])}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !resume || !form.name || !form.email}
              className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing with AI...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Submit Application <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          {/* Result Slide-in */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-slate-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Analysis Complete</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${result.status === 'hired' ? 'bg-emerald-500/20 text-emerald-400' :
                    result.status === 'ai_rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                    {result.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">AI Score</span>
                    <span className="text-3xl font-black text-white">{result.ai_score}<span className="text-sm text-slate-500 font-medium">/100</span></span>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Verification</span>
                    <span className={`text-lg font-bold capitalize pt-1 ${result.verification_status === 'verified' ? 'text-emerald-400' :
                      result.verification_status === 'suspicious' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                      {result.verification_status}
                    </span>
                  </div>
                </div>

                {/* Analysis Reason / Fairness */}
                <div className="space-y-4">
                  <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center">
                      <Zap className="w-3 h-3 mr-2" /> Why this score?
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {result.strengths ? `Key strengths: ${result.strengths}. ` : ""}
                      {result.weaknesses ? `Areas for growth: ${result.weaknesses}. ` : ""}
                      {!result.strengths && !result.weaknesses && "Our AI has completed its deep scan of your skills against the vacancy requirements."}
                    </p>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-2" /> Bias & Fairness Report
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      {result.fairness_report || "This evaluation was conducted strictly on skill-based merit using anonymized data processing to ensure zero bias."}
                    </p>
                  </div>
                </div>

                {/* Negotiation Section (Sub-Agent 3) */}
                {result.status === 'offered' && (
                  <div className="mt-8 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                      <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>

                    <h3 className="text-xl font-extrabold text-white mb-2">You have an offer!</h3>
                    <p className="text-sm text-slate-400 mb-6">
                      Our HireNexus AI has evaluated your profile and would like to extend an official offer.
                    </p>

                    <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700 mb-6">
                      <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black flex items-center">
                        {isAiTyping || aiResponse ? <BrainCircuit className="w-3 h-3 mr-2 text-indigo-400" /> : <Zap className="w-3 h-3 mr-2" />}
                        {isAiTyping || aiResponse ? "Negotiated AI Offer" : "Current AI Offer"}
                      </span>
                      <div className="flex items-end mt-1">
                        <span className="text-4xl font-black text-indigo-400 tracking-tighter">₹{result.offered_salary}L</span>
                        <span className="text-sm text-slate-500 font-bold ml-2 mb-1">Per Annum (LPA)</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Counter-Offer (Optional)</label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                            <input
                              type="text"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-12 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                              placeholder="e.g. 15"
                              value={form.counter_offer || ''}
                              onChange={(e) => setForm({ ...form, counter_offer: e.target.value })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">L</span>
                          </div>
                          <button
                            onClick={() => handleNegotiate('negotiate')}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                          >
                            Negotiate
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleNegotiate('accept')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept & Join</span>
                        </button>
                        <button
                          onClick={() => handleNegotiate('reject')}
                          className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                        >
                          Decline Offer
                        </button>
                      </div>
                    </div>

                    {/* Negotiation Status & AI Response */}
                    <div className="mt-6 p-5 bg-slate-900/80 rounded-2xl border border-slate-700/50 shadow-inner min-h-[100px] flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] flex items-center">
                          <BrainCircuit className="w-3.5 h-3.5 mr-2" />
                          AI Negotiation Agent
                        </span>
                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${result.status === 'hired' ? 'bg-emerald-500/10 text-emerald-400' :
                          result.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                          {result.status === 'hired' ? 'Deal Closed' : result.status === 'rejected' ? 'Deal Failed' : 'Active Discussion'}
                        </div>
                      </div>

                      {loading ? (
                        <div className="flex items-center space-x-3 py-2">
                          <div className="flex space-x-1">
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                          </div>
                          <span className="text-xs text-slate-500 italic font-medium">Agent is evaluating your proposal...</span>
                        </div>
                      ) : isAiTyping ? (
                        <TypingAnimation text={aiResponse} />
                      ) : (
                        <p className="text-sm text-slate-400 leading-relaxed italic">
                          {aiResponse || result.negotiation_history?.split('\n').pop() || "I am open to discussing a compensation package that reflects your expertise. Make a proposal to begin."}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {result.verification_reason && (
                  <div className="mt-4 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <p className="text-xs text-slate-400 leading-relaxed flex items-start">
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-400 shrink-0 mt-0.5" />
                      <span>{result.verification_reason}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}

export default Apply;