import { danger, warn, message } from 'danger';

const pr = danger.github.pr;
const body = pr.body || '';

if (body.length < 10) {
  warn('PR description is empty');
}

if (pr.additions + pr.deletions > 500) {
  warn('This PR is very large (>500 lines). Consider splitting it.');
}

if (pr.additions > 1000) {
  warn('This PR adds more than 1000 lines. Consider breaking it down.');
}

const changedFiles = [...danger.git.modified_files, ...danger.git.created_files];

const hasTests = changedFiles.some((f) => f.includes('.test.') || f.includes('.spec.'));
const hasCode = changedFiles.some(
  (f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.svelte')
);

if (hasCode && !hasTests) {
  warn('PR includes code changes but no test updates');
}

message(`PR by ${pr.user.login}: ${pr.title}`);
