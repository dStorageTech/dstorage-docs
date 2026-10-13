import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { defineComponent, h } from "vue";
import { useData, useRoute } from "vitepress";
import Wordmark from "./Wordmark.vue";
import EarlyAccessBanner from "./EarlyAccessBanner.vue";
import AgentPrompt from "./AgentPrompt.vue";
import CopyOrDownloadAsMarkdownButtons from "vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue";
import { useSidebarScrollSpy } from "./sidebarScrollSpy";
import "./custom.css";

const Layout = defineComponent({
  name: "Layout",
  setup() {
    useSidebarScrollSpy({ pathPrefix: "faq/", headingSelector: "h3[id]" });
    useSidebarScrollSpy({ pathPrefix: "features/", headingSelector: "h2[id]" });
    const { frontmatter } = useData();
    const route = useRoute();

    return () =>
      h(DefaultTheme.Layout, null, {
        "nav-bar-title-before": () => h(Wordmark),
        "layout-top": () =>
          frontmatter.value.layout === "home" ? null : h(EarlyAccessBanner),
        // "Copy page for AI" dropdown from vitepress-plugin-llms, moved from under each page's
        // h1 into the nav bar. It resolves the page URL only on mount, so it's keyed by route
        // to remount on every navigation.
        "nav-bar-content-before": () =>
          frontmatter.value.layout === "home"
            ? null
            : h("div", { class: "nav-llms-buttons" }, [
                h(CopyOrDownloadAsMarkdownButtons, { key: route.path }),
              ]),
      });
  },
});

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("AgentPrompt", AgentPrompt);
  },
} satisfies Theme;
