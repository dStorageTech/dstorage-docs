import { defineConfig } from "vitepress";
import { buildFaqSidebar } from "./faqSidebar";

export default defineConfig({
  title: "dStorage SDK",
  description:
    "Privacy-first data layer for dApps — client-side encryption + decentralised storage + on-chain coordination in a single SDK.",
  base: "/docs/",
  appearance: "dark",
  srcExclude: ["README.md", "DEPLOYING.md"],

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
      { text: "Guide", link: "/guide/quick-start" },
      { text: "FAQ", link: "/faq/" },
      { text: "Reference", link: "/reference/" },
      { text: "Architecture", link: "/architecture/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [{ text: "Quick Start", link: "/guide/quick-start" }],
        },
      ],
      "/faq/": buildFaqSidebar(),
      "/reference/": [
        {
          text: "Reference",
          items: [{ text: "Overview", link: "/reference/" }],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [{ text: "Overview", link: "/architecture/" }],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/dStorageTech/dstorage-sdk" },
    ],
  },
});
