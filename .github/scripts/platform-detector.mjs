#!/usr/bin/env node
/**
 * platform-detector.mjs - Multi-platform PR detection
 * Detects which git platform (GitHub, GitLab, Bitbucket) and provides context
 */

/**
 * Detect current platform from environment variables
 */
export function detectPlatform() {
  // GitHub Actions
  if (process.env.GITHUB_ACTIONS === 'true' || process.env.GITHUB_REPOSITORY) {
    return 'github';
  }
  
  // GitLab CI
  if (process.env.GITLAB_CI === 'true' || process.env.CI_PROJECT_URL) {
    return 'gitlab';
  }
  
  // Bitbucket
  if (process.env.BITBUCKET_BUILD_NUMBER || process.env.BITBUCKET_REPO_FULL_NAME) {
    return 'bitbucket';
  }
  
  // Jenkins
  if (process.env.JENKINS_URL || process.env.BUILD_NUMBER) {
    return 'jenkins';
  }
  
  // Azure DevOps
  if (process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI) {
    return 'azure';
  }
  
  return 'unknown';
}

/**
 * Get platform-specific configuration
 */
export function getPlatformConfig() {
  const platform = detectPlatform();
  
  const configs = {
    github: {
      name: 'GitHub',
      icon: '🐙',
      prTerm: 'pull request',
      prAbbr: 'PR',
      commentsTerm: 'comments',
      reviewTerm: 'review',
      apiBase: 'https://api.github.com',
      envTokens: ['GITHUB_TOKEN', 'GH_TOKEN'],
    },
    gitlab: {
      name: 'GitLab',
      icon: '🔶',
      prTerm: 'merge request',
      prAbbr: 'MR',
      commentsTerm: 'notes',
      reviewTerm: 'review',
      apiBase: process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4',
      envTokens: ['GITLAB_TOKEN', 'CI_JOB_TOKEN'],
    },
    bitbucket: {
      name: 'Bitbucket',
      icon: '📦',
      prTerm: 'pull request',
      prAbbr: 'PR',
      commentsTerm: 'comments',
      reviewTerm: 'review',
      apiBase: `https://api.bitbucket.org/2.0`,
      envTokens: ['BITBUCKET_TOKEN', 'BB_API_TOKEN'],
    },
  };
  
  return configs[platform] || { name: 'Unknown', icon: '❓', prTerm: 'PR', prAbbr: 'PR' };
}

/**
 * Normalize PR object from any platform to a common format
 */
export function normalizePR(pr, platform) {
  switch (platform) {
    case 'github':
      return {
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        author: pr.user?.login || pr.user?.login,
        headRef: pr.head?.ref || pr.head?.branch_name,
        baseRef: pr.base?.ref || pr.base?.ref,
        headSha: pr.head?.sha || pr.head?.sha,
        isDraft: pr.draft || false,
        mergeable: pr.mergeable,
        merged: pr.merged,
        labels: (pr.labels || []).map(l => typeof l === 'string' ? l : l.name),
        requestedReviewers: (pr.requested_reviewers || []).map(r => r.login || r.username),
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url || pr.web_url,
      };
    
    case 'gitlab':
      return {
        number: pr.iid,
        title: pr.title,
        body: pr.description || '',
        state: pr.state,
        author: pr.author?.username || pr.author?.username,
        headRef: pr.source_branch,
        baseRef: pr.target_branch,
        headSha: pr.sha,
        isDraft: pr.work_in_progress || pr.draft || false,
        mergeable: pr.merge_status === 'can_be_merged',
        merged: pr.state === 'merged',
        labels: pr.labels || [],
        requestedReviewers: (pr.reviewers || []).map(r => r.username || r.name),
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.web_url,
      };
    
    case 'bitbucket':
      return {
        number: pr.id,
        title: pr.title,
        body: pr.description || '',
        state: pr.state,
        author: pr.author?.username || pr.author?.display_name,
        headRef: pr.source?.branch?.name,
        baseRef: pr.destination?.branch?.name,
        headSha: pr.source?.commit?.hash,
        isDraft: pr.is_draft || false,
        mergeable: pr.mergeable,
        merged: pr.state === 'MERGED',
        labels: [],
        requestedReviewers: (pr.reviewers || []).map(r => r.user?.username || r.username),
        createdAt: pr.created_on,
        updatedAt: pr.updated_on,
        url: pr.links?.html || pr.url,
      };
    
    default:
      return pr;
  }
}

/**
 * Get platform-specific API client
 * For GitHub: returns null (uses actions/github natively in workflows)
 * For GitLab/Bitbucket: returns the imported client module
 */
export async function getPlatformClient(platform) {
  switch (platform) {
    case 'github':
      // GitHub uses actions/github natively in workflows - no separate client needed
      return null;
    case 'gitlab':
      return await import('./gitlab-client.mjs');
    case 'bitbucket':
      return await import('./bitbucket-client.mjs');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
