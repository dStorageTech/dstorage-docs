import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { defineComponent, h } from "vue";
import Wordmark from "./Wordmark.vue";
import { useFaqSidebarScrollSpy } from "./faqSidebarScrollSpy";
import "./custom.css";

const Layout = defineComponent({
  name: "Layout",
  setup() {
    useFaqSidebarScrollSpy();

    return () =>
      h(DefaultTheme.Layout, null, {
        "nav-bar-title-before": () => h(Wordmark),
      });
  },
});

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
