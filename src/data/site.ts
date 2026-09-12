export const navigation = [
  { label: "Home", href: "#home" },
  { label: "AI Lab", href: "#ai-lab" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

// Neutral editorial placeholders; replace only with verified personal content.
export const portfolioSections = [
  {
    id: "ai-lab",
    number: "02",
    label: "AI LAB",
    title: "A space for intelligence.",
    description: "A place for AI systems, experiments, and the ideas behind them.",
    note: "Systems will be introduced here as they become available.",
  },
  {
    id: "projects",
    number: "03",
    label: "PROJECTS",
    title: "Ideas, made tangible.",
    description: "A closer look at software projects: the problem, the process, and the result.",
    note: "Project stories and technical details will be added here.",
  },
  {
    id: "experience",
    number: "04",
    label: "EXPERIENCE",
    title: "The path behind the work.",
    description: "The professional journey behind this digital space.",
    note: "Experience and education details will be shared here.",
  },
  {
    id: "about",
    number: "05",
    label: "ABOUT",
    title: "The person behind the systems.",
    description: "Ramazan Yildirim. Computer Engineer.",
    note: "More about my background, interests, and approach will follow.",
  },
  {
    id: "contact",
    number: "06",
    label: "CONTACT",
    title: "Every connection starts somewhere.",
    description: "A place for conversations about AI, software, and what comes next.",
    note: "Contact details will be available here soon.",
  },
] as const;
