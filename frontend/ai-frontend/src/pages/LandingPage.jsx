import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, Zap, Shield, CheckCircle2, ArrowRight, Mail, Phone, MapPin, Linkedin, Twitter, Github } from 'lucide-react';

const LandingPage = () => {
    return (
        <div className="flex flex-col min-h-[85vh] -mt-8">
            {/* Hero Section */}
            <section className="relative flex-grow flex items-center justify-center overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xl -z-10" />
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full font-medium mb-8 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    >
                        <Bot className="w-5 h-5 mr-1" />
                        <span>The Future of Hiring is Autonomous</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8 leading-tight"
                    >
                        Next-Generation <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 animate-gradient-x">
                            AI Recruitment Platform
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"
                    >
                        HireNexus transforms the way modern companies hire. Objectively evaluate candidates, verify skills autonomously, and scale your tech teams with unparalleled AI precision.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                        <Link
                            to="/auth"
                            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] flex items-center justify-center group"
                        >
                            Sign In / Sign Up
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-slate-900/50 border-t border-slate-800 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl hover:border-indigo-500/50 transition-colors"
                        >
                            <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Lightning Fast</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Scan thousands of resumes in seconds. Our Gemini-powered AI identifies top-tier talent instantly, reducing time-to-hire by up to 80%.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl hover:border-cyan-500/50 transition-colors"
                        >
                            <div className="w-14 h-14 bg-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mb-6">
                                <Shield className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Objective Scoring</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Eliminate human bias. Every candidate is evaluated uniformly based on exact technical requirements, ensuring pure meritocracy.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl hover:border-emerald-500/50 transition-colors"
                        >
                            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Auto-Verification</h3>
                            <p className="text-slate-400 leading-relaxed">
                                We automatically cross-reference resumes with GitHub repositories and online portfolios to verify a candidate's real-world coding ability.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-24 bg-slate-900 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Get in Touch</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">Have questions about integrating HireNexus into your workflow? Our team is here to help.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl"
                        >
                            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Thanks for contacting us! This feature will be available in production."); }}>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <input type="email" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="john@company.com" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                                    <textarea className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none" placeholder="How can we help you?" required></textarea>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20">Send Message</button>
                            </form>
                        </motion.div>

                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex flex-col justify-center space-y-8"
                        >
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <h3 className="text-lg font-medium text-white">Email Us</h3>
                                    <p className="mt-1 text-slate-400">support@hirenexus.ai</p>
                                    <p className="mt-1 text-slate-400">enterprise@hirenexus.ai</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <h3 className="text-lg font-medium text-white">Call Us</h3>
                                    <p className="mt-1 text-slate-400">+1 (800) 555-HIRE</p>
                                    <p className="mt-1 text-slate-400">Mon-Fri, 9am - 6pm EST</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <h3 className="text-lg font-medium text-white">Headquarters</h3>
                                    <p className="mt-1 text-slate-400">123 AI Innovation Drive</p>
                                    <p className="mt-1 text-slate-400">San Francisco, CA 94105</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center mb-6">
                                <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center mr-2 shadow-lg shadow-indigo-500/20">
                                    <span className="text-white font-bold text-xl leading-none">HN</span>
                                </div>
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
                                    HireNexus AI
                                </span>
                            </div>
                            <p className="text-slate-400 max-w-sm">
                                Autonomous hiring solutions combining AI precision with human insight. Building the future of technical recruitment.
                            </p>
                            <div className="flex space-x-4 mt-6">
                                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4 text-lg">Platform</h4>
                            <ul className="space-y-3">
                                <li><Link to="/auth" className="text-slate-400 hover:text-indigo-400 transition-colors">For Employers (HR)</Link></li>
                                <li><Link to="/auth" className="text-slate-400 hover:text-indigo-400 transition-colors">For Candidates</Link></li>
                                <li><a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors">Features</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors">Pricing</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4 text-lg">Company</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors">About Us</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors">Careers</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
                        <p>&copy; {new Date().getFullYear()} HireNexus Inc. All rights reserved.</p>
                        <p className="mt-2 md:mt-0 shadow-sm text-center">Engineered with ❤️ for Software Companies.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
