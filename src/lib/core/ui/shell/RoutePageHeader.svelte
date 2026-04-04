<script lang="ts">
	import { documentTitleFor } from './navigation';
	import type { AppRouteId } from './section-metadata';
	import SectionHeader from './SectionHeader.svelte';
	import { getAppSectionMeta } from './section-metadata';

	interface Props {
		href: AppRouteId;
	}

	let { href }: Props = $props();
	let section = $derived(getAppSectionMeta(href));
	let headingTitle = $derived(section.pageHeadingTitle ?? section.title);
</script>

<svelte:head>
	<title>{documentTitleFor(section.title)}</title>
</svelte:head>

<SectionHeader
	eyebrow={section.pageEyebrow}
	title={headingTitle}
	description={section.pageDescription ?? ''}
/>
