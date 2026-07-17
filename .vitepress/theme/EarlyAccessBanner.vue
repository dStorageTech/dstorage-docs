<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const bannerEl = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;

function syncHeight() {
  const height = bannerEl.value?.offsetHeight ?? 0;
  document.documentElement.style.setProperty("--vp-layout-top-height", `${height}px`);
}

onMounted(() => {
  syncHeight();
  observer = new ResizeObserver(syncHeight);
  if (bannerEl.value) observer.observe(bannerEl.value);
});

onUnmounted(() => {
  observer?.disconnect();
  document.documentElement.style.removeProperty("--vp-layout-top-height");
});
</script>

<template>
  <div ref="bannerEl" class="early-access-banner">
    <span class="badge">Early Access</span>
    <span class="copy">
      The dStorage SDK is under active development (<code>v0.0.x</code>). APIs may still
      change — it's safe to follow the guides, but hold off on production use for now.
    </span>
  </div>
</template>

<style scoped>
.early-access-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: calc(var(--vp-z-index-nav) + 1);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 0.6rem;
  padding: 0.55rem 1.5rem;
  background: var(--vp-c-brand-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.82rem;
  line-height: 1.4;
  text-align: center;
}

.badge {
  flex-shrink: 0;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  color: #08090c;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.copy {
  color: var(--vp-c-text-2);
}

.copy code {
  font-size: 0.82em;
}
</style>
