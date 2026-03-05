import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Users,
    ArrowRight,
    ShieldCheck,
    Mail,
    Lock,
    Loader2,
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const AuthPage = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [role, setRole] = useState(null); // 'candidate' or 'hr'

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // If role is HR, force Login mode
    useEffect(() => {
        if (role === 'hr') {
            setIsLogin(true);
        }
    }, [role]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                // SIGN IN
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) throw authError;

                // --- STRICT ROLE VERIFICATION ---
                // We check the user metadata to ensure they are logging into the correct portal
                const userRole = data.user?.user_metadata?.role;

                if (userRole !== role) {
                    // Mismatched role! Force sign out and block access
                    await supabase.auth.signOut();
                    throw new Error(`Unauthorized. This account is registered as a ${userRole}. Please use the ${userRole} portal.`);
                }

                // Success! Redirect to the respective dashboard
                if (role === 'candidate') {
                    localStorage.setItem('candidateEmail', email.trim().toLowerCase());
                }
                navigate(role === 'hr' ? '/hr' : '/candidate');

            } else {
                // SIGN UP (Candidates only)
                if (role === 'hr') {
                    throw new Error("HR accounts cannot be created via this portal.");
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { role: 'candidate' } // Always 'candidate' for self-signup
                    }
                });

                if (signUpError) throw signUpError;

                alert("Account created! Please check your email for the confirmation link.");
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
        >
            <div className="bg-slate-800/40 backdrop-blur-2xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center">
                {/* Visual Glow Effect */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${role === 'hr' ? 'bg-cyan-500' : 'bg-indigo-500'}`} />

                <button
                    onClick={() => {
                        setRole(null);
                        setError(null);
                        setEmail('');
                        setPassword('');
                    }}
                    className="mb-6 flex items-center text-slate-400 hover:text-white transition-colors text-sm font-medium z-10 relative"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portals
                </button>

                <div className="mb-8 z-10 relative">
                    <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${role === 'hr' ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.1)]'}`}>
                        {role === 'hr' ? <Users className="w-8 h-8" /> : <Briefcase className="w-8 h-8" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
                        {role === 'hr' ? 'HR Portal Login' : (isLogin ? 'Candidate Login' : 'Join as Candidate')}
                    </h2>
                    <p className="text-slate-400 text-sm mt-2">
                        {role === 'hr' ? 'Restricted access for authorized personnel only.' : (isLogin ? "Welcome back! Enter your credentials." : "Create your account to start your journey.")}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4 z-10 relative text-left">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl flex items-start gap-2 text-sm"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors ${role === 'hr' ? 'group-focus-within:text-cyan-400' : 'group-focus-within:text-indigo-400'}`} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className={`w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 transition-all ${role === 'hr' ? 'focus:ring-cyan-500/50 focus:border-cyan-500' : 'focus:ring-indigo-500/50 focus:border-indigo-500'}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors ${role === 'hr' ? 'group-focus-within:text-cyan-400' : 'group-focus-within:text-indigo-400'}`} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 transition-all ${role === 'hr' ? 'focus:ring-cyan-500/50 focus:border-cyan-500' : 'focus:ring-indigo-500/50 focus:border-indigo-500'}`}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${role === 'hr'
                            ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                            } disabled:opacity-70 disabled:cursor-not-allowed mt-2`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Get Started')}
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>

                {role === 'candidate' && (
                    <div className="mt-8 text-center z-10 relative border-t border-slate-700/50 pt-6">
                        <p className="text-slate-400 text-sm">
                            {isLogin ? "New to HireNexus?" : "Already have an account?"}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError(null);
                                }}
                                className="ml-1 font-bold text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4"
                            >
                                {isLogin ? 'Create Account' : 'Log In'}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-[75vh] flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
                {!role ? (
                    <motion.div
                        key="role-selection"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-4xl w-full"
                    >
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-sm font-medium mb-4 ring-1 ring-indigo-500/20">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Autonomous Talent Protocol</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight uppercase">Welcome to HireNexus</h1>
                            <p className="text-lg text-slate-400 max-w-xl mx-auto italic opacity-80">The premier AI-driven ecosystem for high-stakes technical placement.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Candidate Card */}
                            <button onClick={() => setRole('candidate')} className="text-left group outline-none focus:outline-none">
                                <div className="h-full bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl hover:border-indigo-500/50 transition-all duration-500 relative overflow-hidden flex flex-col items-center text-center group-hover:-translate-y-2 shadow-2xl">
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500" />
                                    <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                                        <Briefcase className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight uppercase">Candidate</h2>
                                    <p className="text-slate-400 mb-8 flex-grow leading-relaxed">Let our AI agents discover the perfect technical match for your elite skillset.</p>
                                    <div className="w-full bg-indigo-600/10 text-indigo-400 font-bold py-4 px-6 rounded-xl border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                        Enter Portal <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </button>

                            {/* HR Admin Card */}
                            <button onClick={() => setRole('hr')} className="text-left group outline-none focus:outline-none">
                                <div className="h-full bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl hover:border-cyan-500/50 transition-all duration-500 relative overflow-hidden flex flex-col items-center text-center group-hover:-translate-y-2 shadow-2xl">
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                                    <div className="w-20 h-20 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-cyan-500/20 group-hover:scale-110 transition-transform duration-500">
                                        <Users className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight uppercase">HR Admin</h2>
                                    <p className="text-slate-400 mb-8 flex-grow leading-relaxed">Oversee scoring models, verify AI negotiations, and manage your workforce.</p>
                                    <div className="w-full bg-cyan-600/10 text-cyan-400 font-bold py-4 px-6 rounded-xl border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                                        HR Access <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="auth-form-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full flex justify-center"
                    >
                        {renderForm()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuthPage;
