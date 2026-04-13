<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props {
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    type = 'button',
    variant = 'primary',
    disabled = false,
    onclick,
    children,
    ...rest
  }: Props & HTMLButtonAttributes = $props();
</script>

<button class={`button button--${variant}`} {type} {disabled} {onclick} {...rest}>
  {@render children?.()}
</button>

<style>
  .button {
    min-height: 44px;
    padding: 0.75rem 1rem;
    border: 0.5px solid transparent;
    font: 600 0.78rem/1 var(--phc-font-ui);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      transform 180ms ease,
      opacity 180ms ease,
      border-color 180ms ease,
      background-color 180ms ease,
      color 180ms ease;
  }

  .button--primary {
    background: var(--phc-label);
    color: #3c2f00;
  }

  .button--secondary {
    background: transparent;
    color: var(--phc-text);
    border-color: var(--phc-border-soft);
  }

  .button--ghost {
    background: transparent;
    color: var(--phc-label);
  }

  .button:hover {
    opacity: 0.94;
  }

  .button--secondary:hover,
  .button--ghost:hover {
    background: rgba(10, 60, 45, 0.22);
  }

  .button:focus-visible {
    outline: 2px solid var(--phc-focus);
    outline-offset: 2px;
  }

  .button:active {
    transform: translateY(1px);
  }

  .button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    transform: none;
  }
</style>
