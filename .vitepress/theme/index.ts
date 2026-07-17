import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { defineComponent, h } from "vue";
import { useData } from "vitepress";
import Wordmark from "./Wordmark.vue";
import EarlyAccessBanner from "./EarlyAccessBanner.vue";
import { useFaqSidebarScrollSpy } from "./faqSidebarScrollSpy";
import "./custom.css";

const Layout = defineComponent({
  name: "Layout",
  setup() {
    useFaqSidebarScrollSpy();
    const { frontmatter } = useData();

    return () =>
      h(DefaultTheme.Layout, null, {
        "nav-bar-title-before": () => h(Wordmark),
        "layout-top": () =>
          frontmatter.value.layout === "home" ? null : h(EarlyAccessBanner),
      });
  },
});

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
