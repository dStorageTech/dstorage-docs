<script setup lang="ts">
import { computed, ref } from "vue";
import { prompts } from "./prompts";

// `label` overrides the prompt entry's heading, e.g. when a guide's prompt is reused elsewhere.
// `compact` drops the "paste it into your agent" hint, for places that explain it already.
// `open` shows the prompt text expanded initially.
const props = defineProps<{ id: string; label?: string; compact?: boolean; open?: boolean }>();

const entry = computed(() => {
  const found = prompts[props.id];
  if (!found) throw new Error(`AgentPrompt: unknown prompt id "${props.id}"`);
  return found;
});

// The prompt text starts collapsed unless `open` is set; the copy and run buttons work either way.
const expanded = ref(props.open);
const promptId = computed(() => `agent-prompt-${props.id}`);

const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  await navigator.clipboard.writeText(entry.value.prompt);
  copied.value = true;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => (copied.value = false), 2000);
}

const claudeUrl = computed(
  () => `https://claude.ai/new?q=${encodeURIComponent(entry.value.prompt)}`,
);
const chatGptUrl = computed(
  () => `https://chatgpt.com/?prompt=${encodeURIComponent(entry.value.prompt)}`,
);
</script>

<template>
  <div class="agent-prompt">
    <div class="header">
      <span class="title">
        <span class="badge">AI prompt</span>
        <span class="label">{{ label ?? entry.label ?? "Let your AI agent follow this guide" }}</span>
      </span>
      <div class="actions">
        <button type="button" class="action" @click="copy">
          {{ copied ? "Copied" : "Copy prompt for your agent" }}
        </button>
        <a class="action" :href="claudeUrl" target="_blank" rel="noopener">Run in Claude</a>
        <a class="action" :href="chatGptUrl" target="_blank" rel="noopener">Run in ChatGPT</a>
      </div>
    </div>
    <p v-if="!compact" class="hint">
      Paste it into Claude Code, Cursor, Codex or any coding agent running in your project. The
      prompt points the agent at these docs, so it works from the current API rather than what it
      remembers.
    </p>
    <button
      type="button"
      class="toggle"
      :aria-expanded="expanded"
      :aria-controls="promptId"
      @click="expanded = !expanded"
    >
      <span class="chevron" :class="{ open: expanded }" aria-hidden="true">›</span>
      {{ expanded ? "Hide prompt" : "Show prompt" }}
    </button>
    <pre v-show="expanded" :id="promptId" class="prompt"><code>{{ entry.prompt }}</code></pre>
  </div>
</template>

<style scoped>
.agent-prompt {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-brand-soft);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  padding: 0.7rem 0.9rem 0.8rem;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  color: #08090c;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.label {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.action {
  padding: 0.2rem 0.65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.6;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.action:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.hint {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  margin: 0.4rem auto 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
}

.toggle:hover {
  color: var(--vp-c-brand-2);
}

.chevron {
  display: inline-block;
  width: 0.7em;
  font-size: 1.1em;
  line-height: 1;
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(90deg);
}

.prompt {
  margin: 0.5rem 0 0;
  max-height: 11rem;
  overflow: auto;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  background: var(--vp-code-block-bg);
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--vp-c-text-1);
}
</style>
