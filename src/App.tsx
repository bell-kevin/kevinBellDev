import { useEffect, useRef } from 'react';
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
  const mobileMenu = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (mobileMenu.current) mobileMenu.current.open = false;
  };

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)');
    const onResize = () => {
      if (desktop.matches && mobileMenu.current) mobileMenu.current.open = false;
    };
    desktop.addEventListener('change', onResize);
    return () => desktop.removeEventListener('change', onResize);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="container header-content">
          <a href="#about" className="site-name" onClick={closeMenu}>Kevin Bell<span aria-hidden="true">.</span></a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {NAV_LINKS.map((link) => <a key={link} href={`#${link.toLowerCase()}`}>{link}</a>)}
          </nav>
          <details
            ref={mobileMenu}
            className="mobile-navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && mobileMenu.current?.open) {
                closeMenu();
                mobileMenu.current.querySelector('summary')?.focus();
              }
            }}
          >
            <summary aria-label="Navigation menu">
              <Menu size={22} className="menu-icon-open" aria-hidden="true" />
              <X size={22} className="menu-icon-close" aria-hidden="true" />
            </summary>
            <nav className="mobile-menu" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => <a key={link} href={`#${link.toLowerCase()}`} onClick={closeMenu}>{link}</a>)}
            </nav>
          </details>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
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
        <div>
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
        <div>
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

      </main>
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
    </>
  );
}
