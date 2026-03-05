import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Users, Home, LogIn, LogOut } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const isHR = location.pathname.startsWith('/hr');
  const isCandidate = location.pathname.startsWith('/candidate') || location.pathname.startsWith('/apply');

  let navLinks = [];

  if (isHR) {
    navLinks = [
      { name: 'HR Dashboard', path: '/hr', icon: Users },
      { name: 'Sign Out', path: '/', icon: LogOut },
    ];
  } else if (isCandidate) {
    navLinks = [
      { name: 'Candidate Area', path: '/candidate', icon: Briefcase },
      { name: 'Sign Out', path: '/', icon: LogOut },
    ];
  } else {
    navLinks = [
      { name: 'Home', path: '/', icon: Home },
      { name: 'Sign In', path: '/auth', icon: LogIn },
    ];
  }

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-900/70 border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center shrink-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center mr-2 shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl leading-none">HN</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
              HireNexus AI
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex space-x-1 sm:space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`group flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out ${isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                >
                  <Icon
                    className={`h-4 w-4 mr-2 transition-transform duration-300 ${isActive ? 'stroke-indigo-400 scale-110' : 'group-hover:scale-110 group-hover:stroke-indigo-300'
                      }`}
                  />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;