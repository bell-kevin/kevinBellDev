import { useState, useEffect, useRef } from 'react';
import { Github, Linkedin, Mail, ExternalLink, ChevronDown, Menu, X, Award, Code2, Cloud, Database, Cpu, Globe } from 'lucide-react';

const NAV_LINKS = ['About', 'Projects', 'Skills', 'Volunteering', 'Contact'];

const PROJECTS = [
  {
    title: 'Venturai',
    description: 'AI-powered asset tracking and predictive maintenance software using near field communication (NFC) technology. Built in 19 hours for HackUSU 2026.',
    badge: '2nd Place — Tech Start-Up',
    lang: 'TypeScript',
    langColor: 'bg-blue-400',
    url: 'https://github.com/bell-kevin/venturai',
  },
  {
    title: 'Vocode Hackathon',
    description: "It's not vibecoding — it's vocoding. Weber State University A.I. Hackathon Spring 2026. Voice-driven AI collaboration project.",
    badge: 'WSU AI Hackathon 2026',
    lang: 'Go',
    langColor: 'bg-cyan-400',
    url: 'https://github.com/bell-kevin/vocode',
  },
  {
    title: 'CS6580 Capstone Project',
    description: 'Data Science Algorithms 2 capstone — deep dive into advanced ML algorithms, statistical modeling, and data visualization pipelines.',
    badge: 'Spring 2026',
    lang: 'TypeScript',
    langColor: 'bg-blue-400',
    url: 'https://github.com/bell-kevin/cs6580capstoneProject',
  },
  {
    title: 'YouTube Pipeline AWS',
    description: 'End-to-end YouTube analytics pipeline leveraging Amazon Web Services for data ingestion, processing, and visualization.',
    badge: 'CS 6705 Final Project',
    lang: 'Jupyter Notebook',
    langColor: 'bg-orange-400',
    url: 'https://github.com/bell-kevin/YouTubePipelineAWS',
  },
  {
    title: 'UTA Data Pipeline',
    description: 'Utah Transit Authority data engineering pipeline built on AWS — ingesting, transforming, and querying large transit datasets.',
    badge: 'CS 6830 Final Project',
    lang: 'Python',
    langColor: 'bg-yellow-400',
    url: 'https://github.com/bell-kevin/UTAtransitAuthorityDataEngineering',
  },
  {
    title: 'BDD-Based CTL Model Checker',
    description: 'Formal system design project implementing a binary decision diagram-based computation tree logic model checker from scratch in C.',
    badge: 'CS 6840 Final Project',
    lang: 'C',
    langColor: 'bg-gray-400',
    url: 'https://github.com/bell-kevin',
  },
];

const SKILLS = [
  { label: 'Languages', icon: Code2, items: ['Go', 'TypeScript', 'Python', 'C', 'JavaScript'] },
  { label: 'Cloud & Data', icon: Cloud, items: ['AWS', 'Data Engineering', 'Cloud Computing', 'Jupyter', 'ETL Pipelines'] },
  { label: 'Computer Science', icon: Cpu, items: ['Formal System Design', 'Model Checking', 'Data Science Algorithms', 'ML/AI'] },
  { label: 'Databases', icon: Database, items: ['Data Pipelines', 'Analytics', 'Big Data', 'SQL'] },
  { label: 'Open Source', icon: Globe, items: ['FLOSS Advocacy', 'Git', 'GitHub', 'Open Collaboration'] },
  { label: 'Languages Spoken', icon: Globe, items: ['English (Native)', 'Spanish (Professional)', 'German (Elementary)'] },
];

const VOLUNTEERING = [
  {
    org: 'Free Software Foundation',
    roles: [
      'LibrePlanet Utah Mail-List Administrator',
      'LibrePlanet 2024 Online Chat Monitor',
      'LibrePlanet 2023 Online Chat Monitor',
    ],
  },
  {
    org: 'The Church of Jesus Christ of Latter-day Saints',
    roles: [
      'Ward Mission Leader',
      'Ward Executive Secretary',
      'Elders Quorum First Counselor',
      'Ward Temple & Family History Leader',
      'Full-Time Missionary — Southern Georgia (Spanish-speaking)',
    ],
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const projectsAnim = useInView();
  const skillsAnim = useInView();
  const volunteeringAnim = useInView();
  const contactAnim = useInView();

  return (
    <div className="font-sans text-slate-800 antialiased">
      {/* Nav */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-b border-slate-100' : 'bg-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => scrollTo('about')}
            className={`text-lg font-bold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}
          >
            Kevin Bell
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => scrollTo(link)}
                className={`text-sm font-medium transition-colors hover:text-emerald-500 ${
                  scrolled ? 'text-slate-600' : 'text-white/80'
                }`}
              >
                {link}
              </button>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden transition-colors ${scrolled ? 'text-slate-700' : 'text-white'}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 bg-white border-b border-slate-100 ${
            menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="flex flex-col px-6 py-4 gap-4">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => scrollTo(link)}
                className="text-left text-slate-700 text-sm font-medium hover:text-emerald-500 transition-colors"
              >
                {link}
              </button>
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
              className="w-32 h-32 rounded-2xl ring-4 ring-emerald-500/40 shadow-2xl object-cover flex-shrink-0"
            />
            <div className="text-center md:text-left">
              <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase mb-3">Software Engineer</p>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                Kevin Bell
              </h1>
              <p className="text-slate-400 text-lg max-w-xl leading-relaxed mb-8">
                Master's student in Computer Science at Weber State University. Passionate about free/libre open-source software, AI, cloud computing, and building things that matter — fast.
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
                <button
                  onClick={() => scrollTo('Contact')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
                >
                  <Mail size={16} /> Get in Touch
                </button>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {['Weber State University', 'FLOSS Advocate', 'Hackathon Winner', 'Utah'].map((tag) => (
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

        <button
          onClick={() => scrollTo('Projects')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500 hover:text-emerald-400 transition-colors animate-bounce"
          aria-label="Scroll down"
        >
          <ChevronDown size={28} />
        </button>
      </div>

      {/* Education banner */}
      <div className="bg-emerald-50 border-y border-emerald-100 py-5 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-6 justify-center md:justify-between text-sm">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">M.S. Computer Science</span> — Weber State University (2025–2026)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">B.S. Computer Science</span> — Weber State University (2023)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={16} className="text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">HackUSU 2026</span> — 2nd Place, Tech Start-Up Category
            </span>
          </div>
        </div>
      </div>

      {/* Projects */}
      <Section id="projects" className="bg-white">
        <div
          ref={projectsAnim.ref}
          className={`transition-all duration-700 ${projectsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <SectionHeading>Projects</SectionHeading>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROJECTS.map((project, i) => (
              <a
                key={project.title}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {project.badge}
                  </span>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-0.5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  {project.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">{project.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${project.langColor}`} />
                  <span className="text-slate-400 text-xs">{project.lang}</span>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href="https://github.com/bell-kevin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium"
            >
              <Github size={16} /> View all repositories on GitHub
            </a>
          </div>
        </div>
      </Section>

      {/* Skills */}
      <Section id="skills" className="bg-slate-50">
        <div
          ref={skillsAnim.ref}
          className={`transition-all duration-700 ${skillsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
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

      {/* Volunteering */}
      <Section id="volunteering" className="bg-white">
        <div
          ref={volunteeringAnim.ref}
          className={`transition-all duration-700 ${volunteeringAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <SectionHeading>Volunteering</SectionHeading>
          <div className="grid md:grid-cols-2 gap-8">
            {VOLUNTEERING.map((v) => (
              <div
                key={v.org}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-300 hover:shadow-md transition-all duration-300"
              >
                <h3 className="font-bold text-slate-900 text-lg mb-4">{v.org}</h3>
                <ul className="space-y-2">
                  {v.roles.map((role) => (
                    <li key={role} className="flex items-start gap-2 text-slate-600 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {role}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="bg-slate-900">
        <div
          ref={contactAnim.ref}
          className={`transition-all duration-700 ${contactAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
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
        <p>
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
