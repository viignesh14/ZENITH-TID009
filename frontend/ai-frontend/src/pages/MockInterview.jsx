import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    BrainCircuit, Mic, CheckCircle, XCircle, ChevronRight, ChevronLeft,
    Clock, Award, TrendingUp, AlertTriangle, BookOpen, Zap, RotateCcw,
    Star, Target, ArrowLeft
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000/api";

// ─── Score Ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120 }) {
    const radius = (size - 20) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, score));
    const offset = circ - (pct / 100) * circ;
    const color = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444";

    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
            />
            <text
                x={size / 2} y={size / 2 + 8}
                textAnchor="middle"
                fill="white"
                fontSize="22"
                fontWeight="900"
                style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
            >
                {score}
            </text>
        </svg>
    );
}

// ─── Grade Badge ──────────────────────────────────────────────────────────────
function GradeBadge({ grade }) {
    const cfg = {
        "A+": { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
        "A": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/15" },
        "B+": { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/40", glow: "shadow-indigo-500/20" },
        "B": { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", glow: "shadow-indigo-500/15" },
        "C+": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40", glow: "shadow-amber-500/20" },
        "C": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/15" },
        "D": { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40", glow: "shadow-orange-500/20" },
        "F": { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", glow: "shadow-red-500/20" },
    };
    const c = cfg[grade] || cfg["B"];
    return (
        <span className={`text-4xl font-black px-5 py-2 rounded-2xl border ${c.bg} ${c.text} ${c.border} shadow-xl ${c.glow}`}>
            {grade}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MockInterviewPage({ vacancy, candidateEmail, candidateName, onBack }) {
    const [phase, setPhase] = useState("intro"); // intro | loading | interview | evaluating | results
    const [interviewId, setInterviewId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [timeLeft, setTimeLeft] = useState(120); // 2 min per question
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    const timerRef = useRef(null);

    // Timer per question
    useEffect(() => {
        if (phase !== "interview") return;
        setTimeLeft(120);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    handleNextQuestion(true);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase, currentQ]);

    const startInterview = async () => {
        setPhase("loading");
        setError("");
        try {
            const res = await axios.post(`${BASE_URL}/mock-interview/generate/`, {
                vacancy_id: vacancy.id,
                candidate_email: candidateEmail,
                candidate_name: candidateName || "Candidate",
            });
            setInterviewId(res.data.interview_id);
            setQuestions(res.data.questions);
            setAnswers(new Array(res.data.questions.length).fill(""));
            setCurrentQ(0);
            setCurrentAnswer("");
            setPhase("interview");
        } catch (e) {
            setError(e.response?.data?.error || "Failed to generate interview questions.");
            setPhase("intro");
        }
    };

    const handleNextQuestion = (autoSubmit = false) => {
        clearInterval(timerRef.current);
        const ans = autoSubmit ? (currentAnswer || "[No answer provided]") : currentAnswer;
        const updatedAnswers = [...answers];
        updatedAnswers[currentQ] = ans;
        setAnswers(updatedAnswers);
        setCurrentAnswer("");

        if (currentQ + 1 < questions.length) {
            setCurrentQ(currentQ + 1);
        } else {
            submitAnswers(updatedAnswers);
        }
    };

    const handlePrevQuestion = () => {
        clearInterval(timerRef.current);
        const updatedAnswers = [...answers];
        updatedAnswers[currentQ] = currentAnswer;
        setAnswers(updatedAnswers);
        setCurrentAnswer(answers[currentQ - 1] || "");
        setCurrentQ(currentQ - 1);
    };

    const submitAnswers = async (finalAnswers) => {
        setPhase("evaluating");
        const payload = questions.map((q, i) => ({ question: q, answer: finalAnswers[i] || "[No answer provided]" }));
        try {
            const res = await axios.post(`${BASE_URL}/mock-interview/submit/`, {
                interview_id: interviewId,
                answers: payload,
            });
            setResults(res.data);
            setPhase("results");
        } catch (e) {
            setError(e.response?.data?.error || "Evaluation failed. Please try again.");
            setPhase("intro");
        }
    };

    const resetInterview = () => {
        setPhase("intro");
        setInterviewId(null);
        setQuestions([]);
        setAnswers([]);
        setCurrentQ(0);
        setCurrentAnswer("");
        setResults(null);
        setError("");
    };

    const report = results?.evaluation_report;
    const fmt = (s) => (s === 120 ? "2:00" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    const timerColor = timeLeft > 60 ? "text-emerald-400" : timeLeft > 30 ? "text-amber-400" : "text-red-400";

    return (
        <div className="min-h-screen">

            {/* ─── INTRO PHASE ─── */}
            <AnimatePresence>
                {phase === "intro" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="max-w-2xl mx-auto space-y-6"
                    >
                        <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors mb-2">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Open Roles
                        </button>

                        {/* Hero Card */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-[2rem] p-8 shadow-2xl">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-purple-500/10 rounded-full blur-[60px]" />
                            <div className="relative z-10">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                        <BrainCircuit className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.25em]">Sub-Agent 6</p>
                                        <h2 className="text-2xl font-black text-white">Mock Interview with AI</h2>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-indigo-300 mb-2">{vacancy.title}</h3>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                    You'll be asked <strong className="text-white">5 domain-specific questions</strong> tailored for this role.
                                    The AI will evaluate your responses and generate a detailed score report — the same report visible to HR.
                                </p>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    {[
                                        { icon: <Clock className="w-5 h-5 text-amber-400" />, label: "Time Limit", value: "2 min/Q" },
                                        { icon: <Target className="w-5 h-5 text-indigo-400" />, label: "Questions", value: "5 Total" },
                                        { icon: <Award className="w-5 h-5 text-emerald-400" />, label: "Score", value: "Out of 100" },
                                    ].map((item, i) => (
                                        <div key={i} className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 text-center">
                                            <div className="flex justify-center mb-2">{item.icon}</div>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">{item.label}</p>
                                            <p className="text-sm font-black text-white">{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                                    <p className="text-xs text-amber-400 font-bold flex items-start">
                                        <AlertTriangle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                                        Your answers and score will be visible to the HR team. Take your time and answer thoughtfully.
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4">
                                        <p className="text-xs text-red-400 font-bold">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={startInterview}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98] flex items-center justify-center space-x-3 text-lg"
                                >
                                    <BrainCircuit className="w-5 h-5" />
                                    <span>Start Mock Interview</span>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Skills required */}
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Skills Covered in This Interview</h4>
                            <div className="flex flex-wrap gap-2">
                                {vacancy.required_skills?.split(',').map((s, i) => (
                                    <span key={i} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold">
                                        {s.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── LOADING PHASE ─── */}
            <AnimatePresence>
                {phase === "loading" && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
                                <BrainCircuit className="w-12 h-12 text-indigo-400 animate-pulse" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-lg mb-1">AI is preparing your interview...</p>
                            <p className="text-slate-500 text-sm">Generating domain-specific questions for <span className="text-indigo-400">{vacancy.title}</span></p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── INTERVIEW PHASE ─── */}
            <AnimatePresence mode="wait">
                {phase === "interview" && (
                    <motion.div
                        key={currentQ}
                        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                        className="max-w-3xl mx-auto space-y-6"
                    >
                        {/* Progress Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                                <span className="text-white font-bold text-sm">Mock Interview — {vacancy.title}</span>
                            </div>
                            <div className={`flex items-center space-x-2 font-black text-2xl tabular-nums ${timerColor}`}>
                                <Clock className="w-5 h-5" />
                                <span>{fmt(timeLeft)}</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                initial={{ width: `${(currentQ / questions.length) * 100}%` }}
                                animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>

                        {/* Question Pills */}
                        <div className="flex items-center space-x-2">
                            {questions.map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < currentQ ? "bg-indigo-500" : i === currentQ ? "bg-purple-400 animate-pulse" : "bg-slate-700"
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Question Card */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl">
                            <div className="absolute top-4 right-4 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                Q{currentQ + 1} of {questions.length}
                            </div>
                            <div className="flex items-start space-x-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                    <span className="text-indigo-400 font-black text-lg">{currentQ + 1}</span>
                                </div>
                                <p className="text-white text-xl font-bold leading-relaxed pt-1">{questions[currentQ]}</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Your Answer</label>
                                <textarea
                                    value={currentAnswer}
                                    onChange={e => setCurrentAnswer(e.target.value)}
                                    placeholder="Type your answer here... Be specific and provide examples where possible."
                                    rows={6}
                                    className="w-full bg-slate-900/70 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl p-4 text-white text-sm leading-relaxed outline-none transition-all resize-none placeholder:text-slate-600 font-medium shadow-inner"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-600 text-right">{currentAnswer.length} characters</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center space-x-4">
                            {currentQ > 0 && (
                                <button
                                    onClick={handlePrevQuestion}
                                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-2xl border border-slate-700 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Previous</span>
                                </button>
                            )}
                            <button
                                onClick={() => handleNextQuestion(false)}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98] flex items-center justify-center space-x-3"
                            >
                                <span>{currentQ + 1 === questions.length ? "Submit All Answers" : "Next Question"}</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-center text-xs text-slate-600">Timer runs out → answer auto-submitted</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── EVALUATING PHASE ─── */}
            <AnimatePresence>
                {phase === "evaluating" && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
                    >
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full border-4 border-purple-500/20 flex items-center justify-center">
                                <BrainCircuit className="w-14 h-14 text-purple-400" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-indigo-500 animate-spin" style={{ animationDuration: "1.5s" }} />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-xl mb-2">AI is evaluating your responses...</p>
                            <p className="text-slate-500 text-sm">Analyzing technical depth, accuracy, and communication skills</p>
                            <div className="flex items-center justify-center space-x-2 mt-4">
                                {["Scoring answers", "Checking accuracy", "Generating feedback"].map((s, i) => (
                                    <motion.span
                                        key={i}
                                        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
                                        className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-bold"
                                    >
                                        {s}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── RESULTS PHASE ─── */}
            <AnimatePresence>
                {phase === "results" && report && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="max-w-4xl mx-auto space-y-8"
                    >
                        {/* Score Hero */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950/60 border border-indigo-500/20 rounded-[2.5rem] p-8 shadow-2xl">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px]" />
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="flex flex-col items-center">
                                    <ScoreRing score={results.overall_score} size={140} />
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">Overall Score</p>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                            <BrainCircuit className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">AI Evaluation Complete</span>
                                    </div>
                                    <div className="flex items-center space-x-4 mb-4">
                                        <GradeBadge grade={results.grade} />
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">AI Recommendation</p>
                                            <span className={`text-sm font-black px-3 py-1 rounded-xl border ${report.hiring_recommendation === "Strong Hire" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                                    report.hiring_recommendation === "Hire" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" :
                                                        report.hiring_recommendation === "Maybe" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                                            "bg-red-500/20 text-red-400 border-red-500/30"
                                                }`}>
                                                {report.hiring_recommendation}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">{report.summary}</p>
                                </div>
                            </div>
                        </div>

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-800/40 border border-emerald-500/20 rounded-[1.5rem] p-6">
                                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center">
                                    <Star className="w-4 h-4 mr-2" /> Strengths
                                </h3>
                                <div className="space-y-3">
                                    {(report.strengths || []).map((s, i) => (
                                        <div key={i} className="flex items-start space-x-3">
                                            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                            <p className="text-slate-300 text-sm font-medium">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-800/40 border border-amber-500/20 rounded-[1.5rem] p-6">
                                <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-2" /> Areas for Improvement
                                </h3>
                                <div className="space-y-3">
                                    {(report.areas_for_improvement || []).map((a, i) => (
                                        <div key={i} className="flex items-start space-x-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-slate-300 text-sm font-medium">{a}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Per-Question Breakdown */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center pl-3 border-l-4 border-indigo-500">
                                <Target className="w-5 h-5 mr-2 text-indigo-400" /> Question-by-Question Breakdown
                            </h3>
                            {(report.per_question || []).map((qa, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                    className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden"
                                >
                                    <div className="p-5 flex items-start justify-between gap-4">
                                        <div className="flex items-start space-x-4 flex-1">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-sm mb-2 leading-relaxed">{qa.question}</p>
                                                <p className="text-slate-400 text-xs leading-relaxed italic bg-slate-900/40 p-3 rounded-xl border border-slate-700/30">
                                                    "{qa.answer || "No answer provided"}"
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-center shrink-0">
                                            <p className={`text-2xl font-black ${qa.score >= 16 ? "text-emerald-400" : qa.score >= 12 ? "text-indigo-400" : qa.score >= 8 ? "text-amber-400" : "text-red-400"}`}>
                                                {qa.score}
                                            </p>
                                            <p className="text-[9px] text-slate-600 font-bold">/20</p>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                                            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">AI Feedback</p>
                                            <p className="text-xs text-slate-300 leading-relaxed">{qa.feedback}</p>
                                        </div>
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                                            <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Ideal Answer Should Cover</p>
                                            <p className="text-xs text-slate-300 leading-relaxed">{qa.ideal_points}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Recommended Resources */}
                        {report.recommended_resources && report.recommended_resources.length > 0 && (
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-[1.5rem] p-6">
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 flex items-center">
                                    <BookOpen className="w-4 h-4 mr-2 text-indigo-400" /> Recommended Learning Resources
                                </h3>
                                <div className="space-y-2">
                                    {report.recommended_resources.map((r, i) => (
                                        <div key={i} className="flex items-center space-x-3 p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                                            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                                            <p className="text-slate-300 text-sm font-medium">{r}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={resetInterview}
                                className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>Retake Interview</span>
                            </button>
                            <button
                                onClick={onBack}
                                className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl border border-slate-700 transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Back to Dashboard</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
