export function optionalEnv(name, fallback = '') {
  return process.env[name] ?? fallback;
}

export function buildOptionalCollectionTool() {
  const raw = optionalEnv('XAI_COLLECTION_IDS', '');
  const vectorStoreIds = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (vectorStoreIds.length === 0) {
    return null;
  }

  return {
    type: 'file_search',
    vector_store_ids: vectorStoreIds,
    max_num_results: 10,
  };
}

export function buildSearchTools({
  includeCodeInterpreter = false,
  xHandles = [],
  allowedDomains = ['docs.github.com', 'docs.x.ai', 'docs.mergify.com'],
} = {}) {
  const tools = [
    {
      type: 'web_search',
      filters: {
        allowed_domains: allowedDomains,
      },
    },
  ];

  if (xHandles.length) {
    tools.push({
      type: 'x_search',
      allowed_x_handles: xHandles,
    });
  }

  const collectionTool = buildOptionalCollectionTool();
  if (collectionTool) {
    tools.push(collectionTool);
  }

  if (includeCodeInterpreter) {
    tools.push({ type: 'code_interpreter' });
  }

  return tools;
}
