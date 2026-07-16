import { defineConfig } from "vitepress";
import { buildFaqSidebar } from "./faqSidebar";

export default defineConfig({
  title: "dStorage SDK",
  description:
    "Privacy-first data layer for dApps — client-side encryption + decentralised storage + on-chain coordination in a single SDK.",
  base: "/docs/",
  appearance: "dark",
  srcExclude: ["README.md", "dstorage-sdk/**"],

  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  ],

  themeConfig: {
    siteTitle: false,
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Features", link: "/features/" },
      { text: "FAQ", link: "/faq/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Overview", link: "/guide/" },
            { text: "Mock Adapters", link: "/guide/mock-adapters" },
            { text: "Core Concepts", link: "/guide/core-concepts" },
            {
              text: "Local & Simulator Adapters",
              link: "/guide/local-simulator-adapters",
            },
            {
              text: "Midnight Network Adapter",
              link: "/guide/midnight-network-adapter",
            },
            {
              text: "Managed Payments Service",
              link: "/guide/managed-payments-service",
            },
          ],
        },
      ],
      "/faq/": buildFaqSidebar(),
      "/features/": [
        {
          text: "Features",
          items: [
            { text: "Overview", link: "/features/" },
            { text: "Developer Features", link: "/features/#developer-features" },
            { text: "End-User Features", link: "/features/#end-user-features" },
            {
              text: "Managed Payments Service",
              link: "/features/#managed-payments-service",
            },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.89-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.48 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>',
        },
        link: "https://dstorage.pro",
        ariaLabel: "dStorage website",
      },
      { icon: "x", link: "https://x.com/dStorageTech", ariaLabel: "X" },
      {
        icon: "linkedin",
        link: "https://www.linkedin.com/showcase/dstorage-tech",
        ariaLabel: "LinkedIn",
      },
    ],
  },
});
