// backend/src/constants/skill-aliases.ts
// Từ điển chuẩn hóa: key = cách user viết trong CV → value = topicId trong template

export const SKILL_ALIASES: Record<string, string> = {
  // === JavaScript / TypeScript ===
  "js": "javascript",
  "javascript": "javascript",
  "es6": "es6-features",
  "es2015": "es6-features",
  "ts": "typescript",
  "typescript": "typescript",

  // === Frontend Frameworks ===
  "reactjs": "react",
  "react.js": "react",
  "react": "react",
  "redux": "state-management",
  "zustand": "state-management",
  "vuejs": "vue",
  "vue.js": "vue",
  "vue": "vue",
  "angularjs": "angular",
  "angular": "angular",
  "svelte": "svelte",
  "nextjs": "nextjs",
  "next.js": "nextjs",
  "nuxt": "nuxt",
  "nuxtjs": "nuxt",

  // === HTML / CSS ===
  "html5": "html",
  "html": "html",
  "css3": "css",
  "css": "css",
  "sass": "sass",
  "scss": "sass",
  "less": "sass",
  "tailwind": "tailwind-css",
  "tailwindcss": "tailwind-css",
  "bootstrap": "css-frameworks",
  "flexbox": "css-flexbox",
  "cssgrid": "css-grid",
  "responsive": "responsive-design",
  "bem": "css-architecture",

  // === Backend / Server ===
  "nodejs": "nodejs",
  "node": "nodejs",
  "node.js": "nodejs",
  "expressjs": "express",
  "express": "express",
  "express.js": "express",
  "nestjs": "nestjs",
  "fastify": "fastify",

  // === Database ===
  "mongodb": "mongodb",
  "mongo": "mongodb",
  "mongoose": "mongoose",
  "postgres": "postgresql",
  "postgresql": "postgresql",
  "mysql": "mysql",
  "sql": "sql-fundamentals",
  "redis": "redis",
  "prisma": "prisma",

  // === API ===
  "rest": "rest-api",
  "restapi": "rest-api",
  "restful": "rest-api",
  "graphql": "graphql",
  "websocket": "websockets",
  "websockets": "websockets",

  // === Auth ===
  "jwt": "jwt",
  "jsonwebtoken": "jwt",
  "oauth": "oauth2",
  "oauth2": "oauth2",

  // === DevOps ===
  "docker": "docker",
  "dockerfile": "dockerfile",
  "docker-compose": "docker-compose",
  "k8s": "kubernetes",
  "kubernetes": "kubernetes",
  "ci/cd": "ci-cd",
  "cicd": "ci-cd",
  "githubactions": "github-actions",
  "jenkins": "jenkins",
  "terraform": "terraform",
  "ansible": "ansible",

  // === Cloud ===
  "aws": "aws",
  "gcp": "gcp",
  "azure": "azure",
  "ec2": "ec2",
  "s3": "s3",

  // === Tools ===
  "git": "git",
  "github": "github",
  "gitlab": "github",
  "webpack": "webpack",
  "vite": "vite",
  "eslint": "eslint",
  "prettier": "prettier",
  "npm": "npm",
  "yarn": "yarn",
  "pnpm": "pnpm",

  // === Testing ===
  "jest": "jest",
  "vitest": "jest",
  "mocha": "unit-testing",
  "cypress": "cypress",
  "playwright": "cypress",
  "selenium": "e2e-testing",

  // === Languages ===
  "python": "python",
  "java": "java",
  "golang": "golang",
  "go": "golang",
  "c++": "cpp",
  "cpp": "cpp",
  "bash": "shell-scripting",

  // === Architecture ===
  "mvc": "mvc",
  "solid": "solid",
  "microservices": "microservices",
  "design-patterns": "design-patterns",
  "clean-architecture": "design-patterns",

  // === AI / ML ===
  "machinelearning": "supervised-learning",
  "ml": "supervised-learning",
  "deeplearning": "neural-networks",
  "dl": "neural-networks",
  "pytorch": "pytorch",
  "tensorflow": "tensorflow",
  "keras": "tensorflow",
  "numpy": "numpy",
  "pandas": "pandas",
  "nlp": "nlp",
  "llm": "llm",
  "langchain": "langchain",

  // === Security ===
  "owasp": "owasp-top10",
  "xss": "xss",
  "sqli": "sql-injection",
  "sqlinjection": "sql-injection",
  "csrf": "csrf",
  "pentest": "penetration-testing",
  "penetrationtesting": "penetration-testing",
  "nmap": "nmap",
  "burpsuite": "burp-suite",
  "wireshark": "wireshark",
  "cryptography": "cryptography",
  "ssl": "ssl-tls",
  "tls": "ssl-tls"
};

/**
 * Chuẩn hóa tên kỹ năng từ CV → topicId chuẩn trong template
 * VD: "React.js" → "react", "Node" → "nodejs", "k8s" → "kubernetes"
 */
export function normalizeSkill(skillName: string): string {
  // Loại bỏ khoảng trắng thừa, chuyển lowercase
  const slug = skillName.toLowerCase().trim().replace(/[\s]+/g, '');
  return SKILL_ALIASES[slug] || slug;
}
