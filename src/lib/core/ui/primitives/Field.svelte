<script lang="ts">
  interface Props {
    label: string;
    id?: string;
    hint?: string;
    className?: string;
    children?: import('svelte').Snippet;
  }

  let { label, id, hint, className = '', children }: Props = $props();
</script>

<label class={`field ${className}`.trim()} for={id}>
  <span class="field__label">{label}</span>
  <div class="field__control">
    {@render children?.()}
  </div>
  {#if hint}
    <span class="field__hint">{hint}</span>
  {/if}
</label>

<style>
  .field {
    display: grid;
    gap: 0.5rem;
  }

  .field:focus-within .field__label {
    color: var(--phc-text);
  }

  .field__label {
    font: 600 0.68rem/1.2 var(--phc-font-ui);
    color: var(--phc-label);
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .field__control {
    display: grid;
  }

  .field__control :global(input),
  .field__control :global(select),
  .field__control :global(textarea) {
    width: 100%;
    box-sizing: border-box;
    min-height: 44px;
    padding: 0.85rem 0;
    border: 0;
    border-bottom: 0.5px solid var(--phc-border-soft);
    background: transparent;
    color: var(--phc-text);
    font: 400 0.95rem/1.45 var(--phc-font-ui);
    transition:
      border-color 180ms ease,
      background-color 180ms ease,
      color 180ms ease,
      box-shadow 180ms ease;
  }

  .field__control :global(input::placeholder),
  .field__control :global(textarea::placeholder) {
    color: var(--phc-muted);
    opacity: 0.7;
  }

  .field__control :global(input:focus),
  .field__control :global(select:focus),
  .field__control :global(textarea:focus) {
    outline: none;
    border-bottom-color: var(--phc-label);
    background: rgba(10, 60, 45, 0.14);
    box-shadow: inset 0 -1px 0 var(--phc-label);
  }

  .field__control :global(select) {
    cursor: pointer;
  }

  .field__control :global(select option) {
    background: var(--phc-surface);
    color: var(--phc-text);
  }

  .field__control :global(textarea) {
    min-height: 8rem;
    resize: vertical;
  }

  .field__hint {
    color: var(--phc-muted);
    font: 400 0.85rem/1.45 var(--phc-font-ui);
  }
</style>
