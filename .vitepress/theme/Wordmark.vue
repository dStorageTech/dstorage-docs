<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <a :href="withBase('/')" class="wordmark">
    <span class="wordmark-name"><span class="wordmark-d">d</span>Storage</span>
    <span class="wordmark-docs">docs</span>
  </a>
</template>

<style scoped>
.wordmark {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  font-family: "Nunito", sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  text-decoration: none;
  line-height: 1;
}

.wordmark-d {
  color: #5be9ff;
}

.wordmark-docs {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}
</style>
