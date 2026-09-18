import { useEffect, useRef } from 'react';
import { Github, Linkedin, Mail, ArrowDown, ArrowUpRight, Menu, X, GraduationCap, Code2, Cloud, Database, Cpu, Globe, Languages } from 'lucide-react';
import ThemeControl from './ThemeControl';

const NAV_LINKS = ['About', 'Skills', 'Contact'];
const GITHUB_URL = 'https://github.com/bell-kevin';
const LINKEDIN_URL = 'https://www.linkedin.com/in/kev-bell/';

const SKILLS = [
  { label: 'Languages', icon: Code2, items: ['Go', 'TypeScript', 'Python', 'C', 'JavaScript'] },
  { label: 'Cloud & Data', icon: Cloud, items: ['AWS', 'Data Engineering', 'Cloud Computing', 'Jupyter', 'ETL Pipelines'] },
  { label: 'Computer Science', icon: Cpu, items: ['Formal System Design', 'Model Checking', 'Data Science Algorithms', 'ML/AI'] },
  { label: 'Databases', icon: Database, items: ['Data Pipelines', 'Analytics', 'Big Data', 'SQL'] },
  { label: 'Open Source', icon: Globe, items: ['FLOSS Advocacy', 'Git', 'GitHub', 'Open Collaboration'] },
  { label: 'Languages Spoken', icon: Languages, items: ['English (Native)', 'Spanish (Professional)', 'German (Elementary)'] },
];

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
          <a href="#about" className="site-name" onClick={closeMenu}>Kevin Bell</a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {NAV_LINKS.map((link) => <a key={link} href={`#${link.toLowerCase()}`}>{link}</a>)}
          </nav>
          <ThemeControl />
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

        <section id="skills" className="section skills-section" aria-labelledby="skills-heading">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">What I work with</p>
              <h2 id="skills-heading">Skills</h2>
            </div>
            <div className="skills-grid">
              {SKILLS.map((skill) => {
                const Icon = skill.icon;
                return (
                  <div key={skill.label} className="skill-card">
                    <div className="skill-heading">
                      <span className="skill-icon"><Icon size={20} aria-hidden="true" /></span>
                      <h3>{skill.label}</h3>
                    </div>
                    <ul className="skill-tags">
                      {skill.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="section contact-section" aria-labelledby="contact-heading">
          <div className="container contact-content">
            <p className="eyebrow">Get in touch</p>
            <h2 id="contact-heading">Let's connect.</h2>
            <p className="contact-description">Have an idea, a question, or something interesting to share? I'd like to hear from you.</p>
            <div className="contact-links">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="contact-link">
                <Github size={22} aria-hidden="true" />
                <span><strong>GitHub</strong><span>Code and projects</span></span>
                <ArrowUpRight size={18} aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="contact-link">
                <Linkedin size={22} aria-hidden="true" />
                <span><strong>LinkedIn</strong><span>Experience and volunteering</span></span>
                <ArrowUpRight size={18} aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a href="mailto:kevinBell@Linux.com" className="contact-link email-link">
                <Mail size={22} aria-hidden="true" />
                <span><strong>kevinBell@Linux.com</strong><span>Send me an email</span></span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-content">
          <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Kevin Bell</p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">Find me on GitHub <ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </footer>
    </>
  );
}
