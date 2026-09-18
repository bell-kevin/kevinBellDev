import { useEffect, useRef } from 'react';
import { Github, Linkedin, Mail, ArrowDown, ArrowUpRight, Menu, X, GraduationCap, Code2, Cloud, Database, Cpu, Globe } from 'lucide-react';

const NAV_LINKS = ['About', 'Skills', 'Contact'];
const GITHUB_URL = 'https://github.com/bell-kevin';
const LINKEDIN_URL = 'https://www.linkedin.com/in/kev-bell/';

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
        <section id="about" className="hero" aria-labelledby="about-heading">
          <div className="container hero-content">
            <div className="hero-profile">
              <img
                src="https://avatars.githubusercontent.com/u/8269880?v=4"
                alt="Kevin Bell"
                width="160"
                height="160"
                className="portrait"
                fetchPriority="high"
              />
              <div className="hero-copy">
                <p className="eyebrow">Software Engineer <span aria-hidden="true">/</span> Utah</p>
                <h1 id="about-heading">Kevin Bell</h1>
                <p className="intro">
                  Software Engineer at the U.S. Department of Defense. M.S. Computer Science graduate with a Computational Data Science &amp; Machine Learning certification.
                </p>
                <p className="hero-description">
                  I care about free/libre open-source software, AI, and building useful things.
                </p>
                <div className="social-links">
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="button button-secondary">
                    <Github size={18} aria-hidden="true" /> GitHub <ArrowUpRight size={15} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="button button-secondary">
                    <Linkedin size={18} aria-hidden="true" /> LinkedIn <ArrowUpRight size={15} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <a href="#contact" className="button button-primary"><Mail size={18} aria-hidden="true" /> Get in touch</a>
                </div>
                <ul className="tags" aria-label="Highlights">
                  {['U.S. Dept. of Defense', 'FLOSS Advocate', 'Hackathon Winner'].map((tag) => <li key={tag}>{tag}</li>)}
                </ul>
              </div>
            </div>
            <a href="#skills" className="explore-link">Explore my skills <ArrowDown size={17} aria-hidden="true" /></a>
          </div>
        </section>

        <section className="education" aria-labelledby="education-heading">
          <div className="container education-content">
            <div className="education-heading">
              <GraduationCap size={24} aria-hidden="true" />
              <div>
                <h2 id="education-heading">Education</h2>
                <p>Weber State University</p>
              </div>
            </div>
            <ul className="credentials">
              <li>M.S. Computer Science</li>
              <li>B.S. Computer Science</li>
              <li>Computational Data Science &amp; Machine Learning Certificate</li>
            </ul>
          </div>
        </section>

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
