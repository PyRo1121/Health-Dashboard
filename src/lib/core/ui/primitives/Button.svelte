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
    border-radius: 999px;
    border: 1px solid transparent;
    font:
      600 0.95rem/1 Manrope,
      system-ui,
      sans-serif;
    cursor: pointer;
  }

  .button--primary {
    background: #1f5c4a;
    color: #fbf8f3;
  }

  .button--secondary {
    background: #f1ebe2;
    color: #1f1d1a;
    border-color: rgba(31, 29, 26, 0.08);
  }

  .button--ghost {
    background: transparent;
    color: #1f5c4a;
  }
</style>
