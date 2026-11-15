/* ============================================================
   config.js  -  ALL the words on the site live here.
   Edit only the text inside the quotes, save, refresh.
   ============================================================ */
window.CONFIG = {
  name: { first: "Kishore", last: "B." },
  role: "Full Stack Developer",
  roleCycle: [
    "Full Stack Developer",
    "Real-time game builder",
    "RAG & AI tinkerer",
    "Next.js · React · FastAPI"
  ],
  location: "Thirunindravur, Tamil Nadu",
  status: "Building at Bilimbe",

  about: {
    eyebrow: "About",
    title: ["I build web apps", "that feel", "alive."],          // last line is set in the accent serif
    body:
      "Full Stack Developer at Bilimbe, building scalable web apps and real-time multiplayer games " +
      "with Next.js, React and FastAPI. I went from intern to a permanent role in three months on the " +
      "strength of shipping live projects, and I'm now growing into applied AI: RAG systems and " +
      "ML-driven lead intelligence for the business.",
    stats: [
      { value: 100, suffix: "+", label: "concurrent players on one live game" },
      { value: 5,   suffix: "",  label: "products shipped, live & internal" },
      { value: 3,   suffix: " mo", label: "from intern to full-time" }
    ]
  },

  projects: [
    {
      title: "Company Website",
      kind: "Live · Production",
      tech: ["Next.js", "Figma", "Google Stitch", "Hostinger"],
      blurb: "Led a 3-person team across design, content and video to ship Bilimbe's new site on deadline.",
      points: [
        "Figma & Stitch designs → responsive, performance-optimised Next.js",
        "Owned deployment and production hosting end to end"
      ],
      link: "https://new.bilimbe.in/",
      linkLabel: "new.bilimbe.in"
    },
    {
      title: "Reaction Time",
      kind: "Live · Multiplayer game",
      tech: ["JavaScript", "FastAPI", "WebSockets"],
      blurb: "Prompts flash on a big screen while players race to respond live from their phones.",
      points: [
        "WebSocket architecture scaling to 100+ concurrent players",
        "Live scoring & sessions across many devices at events"
      ],
      link: "https://reactiontime.bilimbedigital.com/play/",
      linkLabel: "reactiontime.bilimbedigital.com"
    },
    {
      title: "Cyber Quiz",
      kind: "Live · Event activation",
      tech: ["React.js", "FastAPI", "HTTPS"],
      blurb: "Scan a QR, join the lobby, and the game starts itself once five players are in.",
      points: [
        "QR-join flow, no separate monitor needed",
        "Plug-and-play, reused across many live events"
      ],
      link: "https://cyberquiz.bilimbedigital.com/screen",
      linkLabel: "cyberquiz.bilimbedigital.com"
    },
    {
      title: "Proposal Assistant",
      kind: "Internal AI tool · RAG",
      tech: ["Python", "FastAPI", "Vector DB", "Embeddings", "LLM"],
      blurb: "Drafts context-aware client responses from past proposals, product specs and pricing.",
      points: [
        "Semantic search with citation-backed, grounded answers",
        "Cut proposal turnaround with instant first drafts"
      ],
      link: "",
      linkLabel: "Internal tool"
    },
    {
      title: "Lead Scoring Agent",
      kind: "Internal AI tool · ML",
      tech: ["Python", "scikit-learn", "FastAPI", "LLM Agent"],
      blurb: "Predicts which leads convert and what they're worth, then routes them to the right owner.",
      points: [
        "Logistic regression for conversion, linear for deal value",
        "LLM agent qualifies, scores and routes automatically"
      ],
      link: "",
      linkLabel: "Internal tool"
    }
  ],

  skills: [
    { group: "Build", items: ["JavaScript", "Python", "Next.js", "React.js", "FastAPI", "WebSockets", "HTML", "CSS"] },
    { group: "Intelligence", items: ["RAG pipelines", "LLM agents", "scikit-learn", "Embeddings", "Vector databases"] },
    { group: "Ship", items: ["Git", "Docker", "Figma", "Google Stitch", "Hostinger", "AI-assisted dev"] }
  ],

  resume: {
    experience: [
      { role: "Full Stack Developer", org: "Bilimbe", when: "Aug 2026 — Present",
        note: "Promoted from intern on delivery across live production projects. Owns the company website end to end." },
      { role: "Full Stack Developer Intern", org: "Bilimbe", when: "May 2026 — Aug 2026",
        note: "Website, landing page and a Material-themed admin dashboard. Earned a full-time offer." }
    ],
    education: [
      { role: "B.Tech, Information Technology", org: "Misrimal Navajee Munoth Jain Engineering College", when: "CGPA 7.8" }
    ],
    languages: "Tamil (native) · English (professional)",
    file: "media/kishore-b-resume.pdf"
  },

  contact: {
    headline: ["Let's build", "something", "together."],
    email: "baskarankishore4@gmail.com",
    socials: [
      // Paste your full profile URLs. Empty ones are hidden automatically.
      { label: "LinkedIn",  url: "" },
      { label: "GitHub",    url: "" },
      { label: "Instagram", url: "" }
    ]
  }
};
