#!/usr/bin/env node
/**
 * gitlab-client.mjs - GitLab Merge Request API client
 * Handles all GitLab-specific PR/MR operations
 */

const GITLAB_API = process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || process.env.CI_JOB_TOKEN;
const CI_PROJECT_ID = process.env.CI_PROJECT_ID;
const CI_MERGE_REQUEST_IID = process.env.CI_MERGE_REQUEST_IID;

/**
 * GitLab API request helper
 */
async function gitlabRequest(endpoint, options = {}) {
  if (!GITLAB_TOKEN) {
    throw new Error('Missing GITLAB_TOKEN or CI_JOB_TOKEN');
  }
  
  const url = `${GITLAB_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'PRIVATE-TOKEN': GITLAB_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get current merge request
 */
export async function getMergeRequest() {
  if (!CI_PROJECT_ID || !CI_MERGE_REQUEST_IID) {
    throw new Error('Missing CI_PROJECT_ID or CI_MERGE_REQUEST_IID');
  }
  
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}`);
}

/**
 * Get merge request changes/diff
 */
export async function getMergeRequestChanges() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/changes`);
}

/**
 * Get merge request diff
 */
export async function getMergeRequestDiff() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}`);
}

/**
 * Get list of commits
 */
export async function getMergeRequestCommits() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/commits`);
}

/**
 * Get discussions (notes + inline comments)
 */
export async function getMergeRequestDiscussions() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/discussions`);
}

/**
 * Get notes (comments)
 */
export async function getMergeRequestNotes() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes`);
}

/**
 * Post a general note (comment)
 */
export async function postNote(body) {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

/**
 * Post an inline comment (discussion)
 */
export async function postInlineComment(body, position) {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/discussions`, {
    method: 'POST',
    body: JSON.stringify({
      body,
      position,
    }),
  });
}

/**
 * Post an inline comment with SHA context
 */
export async function postDiffComment(body, baseSha, startSha, headSha, position) {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/discussions`, {
    method: 'POST',
    body: JSON.stringify({
      body,
      position: {
        base_sha: baseSha,
        start_sha: startSha,
        head_sha: headSha,
        position_type: 'text',
        ...position,
      },
    }),
  });
}

/**
 * Get reviewers
 */
export async function getReviewers() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}`);
}

/**
 * Update MR labels
 */
export async function updateLabels(labels) {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}`, {
    method: 'PUT',
    body: JSON.stringify({ labels }),
  });
}

/**
 * Get CI pipeline status
 */
export async function getPipelineStatus() {
  const mrs = await gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}`);
  if (mrs.head_pipeline) {
    return {
      id: mrs.head_pipeline.id,
      status: mrs.head_pipeline.status,
      webUrl: mrs.head_pipeline.web_url,
    };
  }
  return null;
}

/**
 * Get CI jobs
 */
export async function getJobs() {
  const pipelines = await gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/pipelines`);
  if (pipelines.length > 0) {
    return gitlabRequest(`/projects/${CI_PROJECT_ID}/pipelines/${pipelines[0].id}/jobs`);
  }
  return [];
}

/**
 * Get awards (reactions)
 */
export async function getAwards() {
  return gitlabRequest(`/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/award_emoji`);
}
