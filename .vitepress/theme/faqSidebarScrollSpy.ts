// Scroll-spy for the FAQ pages' left sidebar.
//
// VitePress's default theme already implements scroll-spy for the *right*
// "on this page" outline (see `useActiveAnchor` in
// vitepress/dist/client/theme-default/composables/outline.js). It does NOT
// touch the left sidebar and does NOT update `location.hash`.
//
// The left sidebar's `.is-active` styling (see `useSidebarControl` in
// vitepress/dist/client/theme-default/composables/sidebar.js) *is* already
// reactive to `location.hash`, via VitePress's own `useData().hash` — a ref
// that is only updated when a native `hashchange` DOM event fires (see
// vitepress/dist/client/app/data.js). So instead of re-implementing the
// highlighting, this composable:
//
//   1. Runs its own scroll-spy (same algorithm as `useActiveAnchor`),
//      scoped to FAQ pages' `### ` question headings (`.VPDoc h3[id]`).
//   2. On each active-heading change, calls `history.replaceState(...)` to
//      update `location.hash` without adding a browser history entry and
//      without triggering the browser's native "jump to anchor" scroll.
//   3. Dispatches a synthetic `hashchange` event so VitePress's internal
//      `hashRef` (and therefore `useSidebarControl`'s `isActiveLink`) picks
//      up the change and the existing sidebar `.is-active`/`.has-active`
//      CSS applies automatically.
//
// This intentionally adds no new CSS and no custom sidebar component.

import { getScrollOffset, inBrowser, onContentUpdated, useData } from "vitepress";
import { nextTick, onMounted, onUnmounted } from "vue";

// Ported from VitePress's internal `theme-default/support/utils.js`
// (`throttleAndDebounce`). Copied rather than deep-imported because
// `vitepress/dist/client/theme-default/support/utils` is a private path
// with no stability guarantee across VitePress releases.
function throttleAndDebounce(fn: () => void, delay: number): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let called = false;
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (!called) {
      fn();
      called = true;
      setTimeout(() => (called = false), delay);
    } else {
      timeoutId = setTimeout(fn, delay);
    }
  };
}

// Absolute top offset of `element`, walking up `offsetParent`s. Mirrors
// `getAbsoluteTop` in VitePress's own outline.js so both scroll-spies agree
// on what "top" means for a heading.
function getAbsoluteTop(element: HTMLElement): number {
  let offsetTop = 0;
  let el: HTMLElement | null = element;
  while (el !== document.body) {
    if (el === null) return NaN;
    offsetTop += el.offsetTop;
    el = el.offsetParent as HTMLElement | null;
  }
  return offsetTop;
}

export function useFaqSidebarScrollSpy(): void {
  if (!inBrowser) return;

  const { page } = useData();

  let headers: { id: string; top: number }[] = [];
  let activeId: string | null = null;

  function collectHeaders() {
    headers = [
      ...document.querySelectorAll<HTMLHeadingElement>(".VPDoc :where(h3)[id]"),
    ]
      .map((el) => ({ id: el.id, top: getAbsoluteTop(el) }))
      .filter((h) => !Number.isNaN(h.top))
      .sort((a, b) => a.top - b.top);
  }

  function applyHash(id: string | null) {
    if (id === activeId) return;
    activeId = id;
    const { pathname, search } = location;
    const newUrl = id ? `${pathname}${search}#${id}` : `${pathname}${search}`;
    // `replaceState` (not `pushState`) avoids polluting browser history, and
    // — unlike setting `location.hash` directly — does not trigger the
    // browser's native scroll-to-anchor behavior.
    history.replaceState(history.state, "", newUrl);
    // VitePress's `hashRef` (app/data.js) only updates on a real
    // `hashchange` event, so nudge it manually.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  // The left sidebar (`.VPSidebar`) is its own scrollable region
  // (`overflow-y: auto; position: fixed`), independent from the document's
  // scroll. Highlighting the active item (via `applyHash` above) doesn't
  // bring it into view if it's scrolled out of the sidebar's visible area —
  // e.g. landing directly on a deep link far down a long FAQ section. `block:
  // "nearest"` scrolls only the sidebar's own scroll container, since that's
  // the nearest scrollable ancestor of the link, leaving the already-correct
  // main document scroll position untouched.
  //
  // The section-level group item (e.g. "Concepts & Features") also carries
  // `.is-active` whenever its own page is open, regardless of hash — only
  // the nested question link's `.is-active` corresponds to the actual
  // highlighted hash. `querySelectorAll` returns matches in document order,
  // and a nested item's node always comes after its ancestor's, so the last
  // match is the most specific (deepest) one actually worth scrolling to.
  function alignActiveSidebarItem(sidebar: HTMLElement) {
    const activeItems = sidebar.querySelectorAll<HTMLElement>(".VPSidebarItem.is-active");
    activeItems[activeItems.length - 1]?.scrollIntoView({ block: "nearest" });
  }

  function scrollActiveSidebarItemIntoView() {
    const sidebar = document.querySelector<HTMLElement>(".VPSidebar");
    if (!sidebar) return;

    alignActiveSidebarItem(sidebar);

    // In dev mode (`vitepress dev`), a FAQ section group can briefly render
    // with its `collapsed` class still applied before the config's
    // `collapsed: false` (see .vitepress/faqSidebar.ts) takes effect,
    // removing that class a moment later — which un-hides `.items` (see
    // `.VPSidebarItem.collapsed .items { display: none }` in VitePress's
    // VPSidebarItem.vue) and silently un-scrolls the target again. That's a
    // class (attribute) change, not a childList change, so watch for both;
    // re-align against freshly-queried elements for a short grace period
    // after navigation, then stop watching.
    const observer = new MutationObserver(() => alignActiveSidebarItem(sidebar));
    observer.observe(sidebar, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    setTimeout(() => observer.disconnect(), 2000);
  }

  function setActiveHeading() {
    // Only FAQ section pages have hash-based sidebar sub-items (generated by
    // .vitepress/faqSidebar.ts); everywhere else (Guide, Features, and the
    // FAQ overview page itself, which has no ### headings) there is nothing
    // for this to highlight, so skip entirely.
    if (!page.value.relativePath.startsWith("faq/")) return;
    if (!headers.length) return;

    const scrollY = window.scrollY;
    const innerHeight = window.innerHeight;
    const offsetHeight = document.body.offsetHeight;
    const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 1;

    // Page top: nothing has been scrolled past yet. Clear the hash rather
    // than force-highlight the first question — this mirrors VitePress's
    // own right-hand outline (`useActiveAnchor`'s `scrollY < 1` branch also
    // clears the active link), and it's harmless here because the *parent*
    // FAQ section's sidebar entry (e.g. "Concepts & Features") is a
    // hash-less link and stays highlighted via `hasActiveLink` regardless.
    if (scrollY < 1) {
      applyHash(null);
      return;
    }

    // Page bottom: highlight the last question even if its own top is still
    // below the scroll-offset threshold (short trailing section).
    if (isBottom) {
      applyHash(headers[headers.length - 1].id);
      return;
    }

    let candidate: string | null = null;
    for (const h of headers) {
      if (h.top > scrollY + getScrollOffset() + 4) break;
      candidate = h.id;
    }
    applyHash(candidate);
  }

  const onScroll = throttleAndDebounce(setActiveHeading, 100);

  onMounted(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener("scroll", onScroll);
  });

  // Rebuild the heading list (and immediately re-evaluate the active one)
  // every time markdown content is (re)rendered — i.e. on first load and
  // after every client-side FAQ navigation. `onContentUpdated` guarantees
  // the new page's `<h3 id>` elements are already in the DOM, unlike
  // watching `route.path` directly.
  onContentUpdated(() => {
    activeId = null; // force `applyHash` to re-run even if the new page's
                      // first computed id happens to match the old one
    collectHeaders();
    requestAnimationFrame(() => {
      setActiveHeading();
      // Only on real navigation (initial load or a route change) — not on
      // every scroll tick — so the sidebar aligns itself once instead of
      // jerking around while the user scrolls the main content. And only
      // when the URL actually points at a specific question (a hash present)
      // — a plain section-page load has nothing more specific than the
      // page's own nav entry to scroll to, so leave the sidebar alone.
      if (page.value.relativePath.startsWith("faq/") && location.hash) {
        nextTick(scrollActiveSidebarItemIntoView);
      }
    });
  });
}
