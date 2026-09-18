import { useState, useEffect, useRef } from 'react';
import { Github, Linkedin, Mail, ChevronDown, Menu, X, Award, Code2, Cloud, Database, Cpu, Globe } from 'lucide-react';

const NAV_LINKS = ['About', 'Skills', 'Contact'];

const SKILLS = [
  { label: 'Languages', icon: Code2, items: ['Go', 'TypeScript', 'Python', 'C', 'JavaScript'] },
  { label: 'Cloud & Data', icon: Cloud, items: ['AWS', 'Data Engineering', 'Cloud Computing', 'Jupyter', 'ETL Pipelines'] },
  { label: 'Computer Science', icon: Cpu, items: ['Formal System Design', 'Model Checking', 'Data Science Algorithms', 'ML/AI'] },
  { label: 'Databases', icon: Database, items: ['Data Pipelines', 'Analytics', 'Big Data', 'SQL'] },
  { label: 'Open Source', icon: Globe, items: ['FLOSS Advocacy', 'Git', 'GitHub', 'Open Collaboration'] },
  { label: 'Languages Spoken', icon: Globe, items: ['English (Native)', 'Spanish (Professional)', 'German (Elementary)'] },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Without an observer there is nothing to trigger the reveal, so show the
    // section rather than animating it in — never leave content hidden.
    if (typeof IntersectionObserver === 'undefined' || !ref.current) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function Section({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-24 px-6 ${className}`}>
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold text-slate-900 mb-12 flex items-center gap-3">
      <span className="w-8 h-0.5 bg-emerald-500 inline-block" />
      {children}
    </h2>
  );
}

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const menuToggle = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Navigation itself is plain anchor links, so it works with scripting off.
  // This only collapses the mobile menu after a tap; without JS the menu stays
  // open behind the jump, which is harmless.
  const closeMenu = () => {
    if (menuToggle.current) menuToggle.current.checked = false;
  };

  const skillsAnim = useInView();
  const contactAnim = useInView();

  return (
    <div className="font-sans text-slate-800 antialiased">
      {/* Nav */}
      <header
        className={`site-header top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-b border-slate-100' : 'bg-transparent'
        }`}
      >
        {/* The mobile menu is opened by this checkbox rather than by state, so
            it still works when JavaScript is unavailable. Styling lives in
            index.css alongside the other progressive-enhancement rules. */}
        <input
          type="checkbox"
          id="menu-toggle"
          ref={menuToggle}
          className="sr-only"
          aria-label="Toggle navigation menu"
          aria-controls="mobile-menu"
        />

        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a
            href="#about"
            className={`text-lg font-bold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}
          >
            Kevin Bell
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className={`text-sm font-medium transition-colors hover:text-emerald-500 ${
                  scrolled ? 'text-slate-600' : 'text-white/80'
                }`}
              >
                {link}
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <label
            htmlFor="menu-toggle"
            className={`menu-button md:hidden cursor-pointer transition-colors ${scrolled ? 'text-slate-700' : 'text-white'}`}
          >
            <Menu size={22} className="menu-icon-open" aria-hidden="true" />
            <X size={22} className="menu-icon-close" aria-hidden="true" />
          </label>
        </div>

        {/* Mobile menu */}
        <div id="mobile-menu" className="mobile-menu md:hidden bg-white border-b border-slate-100">
          <nav className="flex flex-col px-6 py-4 gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={closeMenu}
                className="text-left text-slate-700 text-sm font-medium hover:text-emerald-500 transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div id="about" className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-slate-900">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gradient orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            <img
              src={`https://avatars.githubusercontent.com/u/8269880?v=4`}
              alt="Kevin Bell"
              className="w-32 h-32 rounded-2xl ring-4 ring-emerald-500/40 shadow-2xl object-cover shrink-0"
            />
            <div className="text-center md:text-left">
              <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase mb-3">Software Engineer</p>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                Kevin Bell
              </h1>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed mb-8">
                Software Engineer at the U.S. Department of Defense. M.S. Computer Science graduate with a Computational Data Science &amp; Machine Learning certification. Passionate about free/libre open-source software, AI, and building things that matter — fast.
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                <a
                  href="https://github.com/bell-kevin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 border border-white/10"
                >
                  <Github size={16} /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/kev-bell/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 border border-[#0A66C2]/30"
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
                >
                  <Mail size={16} /> Get in Touch
                </a>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {['U.S. Dept. of Defense', 'FLOSS Advocate', 'Hackathon Winner', 'Utah'].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 border border-white/10 text-slate-400 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <a
          href="#skills"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500 hover:text-emerald-400 transition-colors animate-bounce"
          aria-label="Skip to skills"
        >
          <ChevronDown size={28} />
        </a>
      </div>

      {/* Education banner */}
      <div className="bg-emerald-50 border-y border-emerald-100 py-5 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-6 justify-center md:justify-between text-sm">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">Software Engineer</span> — U.S. Department of Defense
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">M.S. Computer Science</span> — Weber State University
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">Computational Data Science &amp; ML Cert.</span> — Weber State University
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">B.S. Computer Science</span> — Weber State University
            </span>
          </div>
        </div>
      </div>

      {/* Skills */}
      <Section id="skills" className="bg-slate-50">
        <div
          ref={skillsAnim.ref}
          className={`reveal ${skillsAnim.inView ? 'is-visible' : ''}`}
        >
          <SectionHeading>Skills</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SKILLS.map((skill, i) => {
              const Icon = skill.icon;
              return (
                <div
                  key={skill.label}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-300 hover:shadow-md transition-all duration-300"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Icon size={18} className="text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{skill.label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skill.items.map((item) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="bg-slate-900">
        <div
          ref={contactAnim.ref}
          className={`reveal ${contactAnim.inView ? 'is-visible' : ''}`}
        >
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Let's Connect</h2>
            <p className="text-slate-400 mb-10 leading-relaxed">
              I'm always open to interesting conversations, collaborations, and opportunities. Feel free to reach out through any of the channels below.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://github.com/bell-kevin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-all hover:scale-105 border border-white/10"
              >
                <Github size={18} />
                <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/kev-bell/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3.5 bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-white rounded-xl text-sm font-medium transition-all hover:scale-105 border border-[#0A66C2]/30"
              >
                <Linkedin size={18} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 text-sm text-center py-6 px-6">
        {/* Prerendered at build time; the client may render a newer year, which
            is a harmless difference rather than a hydration error. */}
        <p suppressHydrationWarning>
          Built with care &mdash; Kevin Bell &copy; {new Date().getFullYear()} &mdash;{' '}
          <a
            href="https://github.com/bell-kevin"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors"
          >
            Open Source
          </a>
        </p>
      </footer>
    </div>
  );
}
