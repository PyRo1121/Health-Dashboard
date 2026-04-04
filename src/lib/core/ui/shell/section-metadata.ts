import type { RouteId } from '$app/types';

export type AppRouteId = Exclude<RouteId, `/api${string}`>;

export interface AppSectionMeta {
	label: string;
	href: AppRouteId;
	title: string;
	navDescription: string;
	pageHeadingTitle?: string;
	pageEyebrow?: string;
	pageDescription?: string;
	showInDesktopNav?: boolean;
	showInMobileNav?: boolean;
}

export const APP_SECTIONS: AppSectionMeta[] = [
	{
		label: 'Overview',
		href: '/',
		title: 'Overview',
		navDescription: 'Project overview and starting point.',
		pageHeadingTitle: 'Personal Health Cockpit',
		pageEyebrow: 'Foundation',
		pageDescription: 'The local-first shell is ready. Start with Today, Journal, and Review as the primary user loop.',
		showInDesktopNav: false,
		showInMobileNav: false
	},
	{
		label: 'Today',
		href: '/today',
		title: 'Today',
		navDescription: 'Quick daily check-in and same-day context.',
		pageEyebrow: 'Daily Loop',
		pageDescription: 'Quick mood, energy, stress, sleep, sobriety, and same-day context will live here.',
		showInDesktopNav: true,
		showInMobileNav: true
	},
	{
		label: 'Plan',
		href: '/plan',
		title: 'Plan',
		navDescription: 'Weekly planning, groceries, and workout intent.',
		pageEyebrow: 'Weekly Loop',
		pageDescription: 'Shape the week, turn recipes into groceries, and hand planned meals or workouts into Today.',
		showInDesktopNav: true,
		showInMobileNav: true
	},
	{
		label: 'Journal',
		href: '/journal',
		title: 'Journal',
		navDescription: 'Long-form entries and linked reflections.',
		pageEyebrow: 'Reflection',
		pageDescription: 'Long-form entries, prompts, and linked daily context will live here.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Health',
		href: '/health',
		title: 'Health',
		navDescription: 'Sleep, symptoms, anxiety, and medication context.',
		pageEyebrow: 'Body Signals',
		pageDescription: 'Track sleep context, symptoms, anxiety episodes, and medication or supplement use in one local loop.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Nutrition',
		href: '/nutrition',
		title: 'Nutrition',
		navDescription: 'Meal logging, recurring meals, and nutrient views.',
		pageEyebrow: 'Fuel',
		pageDescription: 'Meal logging, recurring meals, and nutrient summaries will live here.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Sobriety',
		href: '/sobriety',
		title: 'Sobriety',
		navDescription: 'Sobriety tracking, cravings, and recovery context.',
		pageEyebrow: 'Recovery',
		pageDescription: 'Sobriety status, cravings, lapse context, and recovery actions will live here.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Assessments',
		href: '/assessments',
		title: 'Assessments',
		navDescription: 'Structured questionnaires and safety-aware results.',
		pageEyebrow: 'Structured Check-ins',
		pageDescription: 'Validated instruments, scoring, and safety-aware follow-up will live here.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Timeline',
		href: '/timeline',
		title: 'Timeline',
		navDescription: 'Cross-domain event history and source traceability.',
		pageEyebrow: 'History',
		pageDescription: 'Cross-domain event history and source provenance. This is the proof surface for native companion imports.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Review',
		href: '/review',
		title: 'Review',
		navDescription: 'Weekly briefing, trends, and next-step experiments.',
		pageEyebrow: 'Weekly Briefing',
		pageDescription: 'Trends, correlations, and next-week experiments will live here.',
		showInDesktopNav: true,
		showInMobileNav: true
	},
	{
		label: 'Imports',
		href: '/imports',
		title: 'Imports',
		navDescription: 'Import center with staged previews and provenance.',
		pageEyebrow: 'Data Intake',
		pageDescription: 'Preview Shortcut JSON, SMART sandbox FHIR Bundles, native iPhone bundles, Apple Health XML, and Day One JSON before anything lands.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Integrations',
		href: '/integrations',
		title: 'Integrations',
		navDescription: 'Connection status and future aggregation paths.',
		pageEyebrow: 'Connections',
		pageDescription: 'Use this page to download the no-Mac iPhone kit, confirm connection status, and jump into the import center.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'Settings',
		href: '/settings',
		title: 'Settings',
		navDescription: 'Preferences, export controls, and app setup.',
		pageEyebrow: 'Controls',
		pageDescription: 'Preferences, export controls, and the no-Mac iPhone setup path live here.',
		showInDesktopNav: true,
		showInMobileNav: false
	},
	{
		label: 'More',
		href: '/settings',
		title: 'More',
		navDescription: 'Access lower-frequency areas on mobile.',
		showInDesktopNav: false,
		showInMobileNav: true
	}
];

export function getAppSectionMeta(href: AppRouteId): AppSectionMeta {
	const section = APP_SECTIONS.find((item) => item.href === href && item.title !== 'More');
	if (!section) {
		throw new Error(`Unknown app section for route: ${href}`);
	}
	return section;
}
