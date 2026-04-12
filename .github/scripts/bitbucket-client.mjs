#!/usr/bin/env node
/**
 * bitbucket-client.mjs - Bitbucket Pull Request API client
 * Handles all Bitbucket-specific PR operations
 */

const BITBUCKET_WORKSPACE = process.env.BITBUCKET_WORKSPACE || process.env.BITBUCKET_REPO_OWNER;
const BITBUCKET_REPO_SLUG = process.env.BITBUCKET_REPO_SLUG || process.env.BITBUCKET_REPO_NAME;
const BITBUCKET_TOKEN = process.env.BITBUCKET_TOKEN || process.env.BB_API_TOKEN;
const BITBUCKET_PR_ID = process.env.BITBUCKET_PR_ID;

const BITBUCKET_API_BASE = `https://api.bitbucket.org/2.0`;

/**
 * Bitbucket API request helper
 */
async function bitbucketRequest(endpoint, options = {}) {
  if (!BITBUCKET_TOKEN) {
    throw new Error('Missing BITBUCKET_TOKEN or BB_API_TOKEN');
  }
  
  const url = `${BITBUCKET_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${BITBUCKET_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Bitbucket API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get current pull request
 */
export async function getPullRequest() {
  if (!BITBUCKET_WORKSPACE || !BITBUCKET_REPO_SLUG || !BITBUCKET_PR_ID) {
    throw new Error('Missing BITBUCKET_WORKSPACE, BITBUCKET_REPO_SLUG, or BITBUCKET_PR_ID');
  }
  
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}`);
}

/**
 * Get pull request diff
 */
export async function getPullRequestDiff() {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/diff`);
}

/**
 * Get pull request commits
 */
export async function getPullRequestCommits() {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/commits`);
}

/**
 * Get pull request comments
 */
export async function getPullRequestComments() {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/comments`);
}

/**
 * Get pull request activities (events)
 */
export async function getPullRequestActivities() {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/activity`);
}

/**
 * Get inline comments (diff comments)
 */
export async function getInlineComments() {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/comments?parent_id=0`);
}

/**
 * Post a general comment
 */
export async function postComment(body) {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content: { raw: body } }),
  });
}

/**
 * Post an inline comment
 */
export async function postInlineComment(body, line, path, fromLine) {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: { raw: body },
      inline: {
        path,
        to: fromLine || line,
        from: fromLine ? line : undefined,
      },
    }),
  });
}

/**
 * Get pull request reviewers
 */
export async function getReviewers() {
  const pr = await getPullRequest();
  return pr.reviewers || [];
}

/**
 * Request reviewers
 */
export async function requestReviewers(usernames) {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests/${BITBUCKET_PR_ID}`, {
    method: 'PUT',
    body: JSON.stringify({ reviewers: usernames.map(u => ({ username: u })) }),
  });
}

/**
 * Get build status for commit
 */
export async function getBuildStatus(commitHash) {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/commit/${commitHash}/statuses`);
}

/**
 * Post build status
 */
export async function postBuildStatus(commitHash, key, status, url, description) {
  return bitbucketRequest(`/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/commit/${commitHash}/statuses/build`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      url,
      state: status, // SUCCESS, FAILED, INPROGRESS, STOPPED
      description,
    }),
  });
}
