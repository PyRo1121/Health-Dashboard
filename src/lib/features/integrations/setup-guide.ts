export interface NoMacSetupStep {
	title: string;
	detail: string;
}

export const NO_MAC_SETUP_STEPS: NoMacSetupStep[] = [
	{
		title: 'Download the Shortcut kit',
		detail:
			'Start with the served template JSON and blueprint so the iPhone export matches the healthkit-companion contract exactly.'
	},
	{
		title: 'Build the Shortcut on iPhone',
		detail:
			'Use Apple Shortcuts to collect sleep-duration, step-count, and resting-heart-rate, then save the JSON file to Files.'
	},
	{
		title: 'Import the JSON file',
		detail:
			'Open `/imports`, upload or drop the file, review the inferred source and summary, then preview before commit.'
	},
	{
		title: 'Verify the result',
		detail:
			'Check Timeline and Review so the imported device signals are visible before treating the integration as trustworthy.'
	}
];

export const NO_MAC_T9_SHIPS = [
	'Shared `healthkit-companion` bridge contract',
	'Shortcut-first no-Mac iPhone flow',
	'Apple Health XML fallback',
	'Timeline and Review proof surfaces after import'
] as const;
