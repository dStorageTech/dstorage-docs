<script setup lang="ts">
import { VPButton } from "vitepress/theme";
import AgentPrompt from "./AgentPrompt.vue";
</script>

<template>
  <div class="hero-agent-prompt">
    <AgentPrompt id="mock-adapters" label="Get started with your AI agent" compact open />
    <VPButton
      class="build-with-ai"
      tag="a"
      size="medium"
      theme="alt"
      text="Build with AI →"
      href="/guide/build-with-ai"
    />
  </div>
</template>

<style scoped>
.hero-agent-prompt {
  position: relative;
  width: 100%;
  max-width: 480px;
  text-align: left;
}

.hero-agent-prompt :deep(.agent-prompt) {
  margin: 0 0 0.9rem;
}

.build-with-ai {
  display: block;
  width: fit-content;
  margin-left: auto;
}
</style>
