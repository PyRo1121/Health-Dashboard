#!/usr/bin/env node
/**
 * grok-timeline.mjs - PR timeline generator
 * Creates a visual timeline of PR events
 */

import { readFileSync, writeFileSync } from 'node:fs';

const TIMELINE_MARKER = '<!-- grok-timeline -->';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function parseEvents(reviews, comments, commits, checks) {
  const events = [];
  
  // Add commits
  for (const commit of commits) {
    events.push({
      type: 'commit',
      date: commit.commit.author.date,
      actor: commit.commit.author.name,
      title: commit.commit.message.split('\n')[0].slice(0, 100),
      sha: commit.sha.slice(0, 7),
    });
  }
  
  // Add reviews
  for (const review of reviews) {
    events.push({
      type: 'review',
      date: review.submitted_at,
      actor: review.user?.login || 'unknown',
      state: review.state,
      body: review.body?.slice(0, 200) || '',
    });
  }
  
  // Add comments
  for (const comment of comments) {
    if (comment.user?.login?.includes('[bot]')) continue;
    events.push({
      type: 'comment',
      date: comment.created_at,
      actor: comment.user?.login || 'unknown',
      body: comment.body?.slice(0, 200) || '',
    });
  }
  
  // Add CI checks
  for (const check of checks) {
    if (check.conclusion) {
      events.push({
        type: 'ci',
        date: check.completed_at || check.started_at,
        actor: check.runner?.name || 'CI',
        state: check.conclusion,
        name: check.name,
      });
    }
  }
  
  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return events;
}

function renderTimeline(events) {
  const icons = {
    commit: '📝',
    review: '👀',
    comment: '💬',
    ci: checkState('success'),
  };
  
  function checkState(state) {
    const map = {
      success: '✅',
      failure: '❌',
      neutral: '⚪',
      cancelled: '🚫',
      skipped: '⏭️',
      timed_out: '⏱️',
      action_required: '⚠️',
      waiting: '⏳',
      queued: '📤',
      in_progress: '🔄',
      requested: '📢',
      pending: '⏳',
    };
    return map[state?.toLowerCase()] || '❓';
  }
  
  let md = `${TIMELINE_MARKER}
## 📅 PR Timeline

**Total events:** ${events.length}

\`\`\`
`;
  
  for (const event of events) {
    const date = new Date(event.date).toLocaleString();
    const icon = event.type === 'ci' ? checkState(event.state) : icons[event.type] || '📌';
    
    switch (event.type) {
      case 'commit':
        md += `${date} ${icon} ${event.actor} committed ${event.sha}\n`;
        md += `         "${event.title}"\n`;
        break;
      case 'review':
        md += `${date} ${icon} ${event.actor} reviewed (${event.state})\n`;
        break;
      case 'comment':
        md += `${date} ${icon} ${event.actor} commented\n`;
        break;
      case 'ci':
        md += `${date} ${icon} ${event.name}: ${event.state}\n`;
        break;
    }
  }
  
  md += `\`\`\`
`;
  
  // Build summary stats
  const commits = events.filter(e => e.type === 'commit').length;
  const reviews = events.filter(e => e.type === 'review').length;
  const comments = events.filter(e => e.type === 'comment').length;
  const ci = events.filter(e => e.type === 'ci').length;
  
  md += `
### Summary
| Type | Count |
|------|-------|
| Commits | ${commits} |
| Reviews | ${reviews} |
| Comments | ${comments} |
| CI Runs | ${ci} |
`;
  
  return md;
}

async function main() {
  const reviewsPath = requiredEnv('REVIEWS_JSON_PATH');
  const commentsPath = requiredEnv('COMMENTS_JSON_PATH');
  const commitsPath = requiredEnv('COMMITS_JSON_PATH');
  const checksPath = requiredEnv('CHECKS_JSON_PATH');
  const outputPath = requiredEnv('TIMELINE_MARKDOWN_PATH');

  const reviews = JSON.parse(readFileSync(reviewsPath, 'utf8'));
  const comments = JSON.parse(readFileSync(commentsPath, 'utf8'));
  const commits = JSON.parse(readFileSync(commitsPath, 'utf8'));
  const checks = JSON.parse(readFileSync(checksPath, 'utf8'));

  const events = parseEvents(reviews, comments, commits, checks);
  const timeline = renderTimeline(events);

  writeFileSync(outputPath, timeline);
  console.log(`✅ Timeline: ${events.length} events`);
}

main().catch((error) => {
  console.error('❌ Timeline failed:', error.message);
  process.exit(1);
});
