export function optionalEnv(name, fallback = '') {
  return process.env[name] ?? fallback;
}

export function isTruthyEnv(name, fallback = false) {
  const value = optionalEnv(name, fallback ? 'true' : '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(value);
}

export function extractMessageText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    const textPart = item.content.find((part) => part?.type === 'output_text');
    if (typeof textPart?.text === 'string') {
      return textPart.text;
    }
  }

  return '';
}

export function getFunctionCalls(payload) {
  return (Array.isArray(payload?.output) ? payload.output : []).filter(
    (item) => item?.type === 'function_call'
  );
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

export function buildXaiDocsMcpTool() {
  if (!isTruthyEnv('XAI_ENABLE_DOCS_MCP', true)) {
    return null;
  }

  return {
    type: 'mcp',
    server_label: 'xai-docs',
    server_description: 'Official xAI docs MCP server for current API and tool guidance.',
    server_url: 'https://docs.x.ai/api/mcp',
  };
}

export function buildOptionalRemoteMcpTools() {
  const raw = optionalEnv('XAI_REMOTE_MCP_TOOLS_JSON', '');
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (tool) =>
          tool &&
          typeof tool === 'object' &&
          (tool.type === 'mcp' || tool.type === 'remote_mcp') &&
          typeof tool.server_label === 'string' &&
          typeof tool.server_url === 'string'
      )
      .map((tool) => ({
        ...tool,
        type: 'mcp',
      }));
  } catch {
    return [];
  }
}

export function buildSearchTools({
  includeCodeInterpreter = false,
  includeDocsMcp = true,
  xHandles = [],
<<<<<<< HEAD
  allowedDomains = ['docs.github.com', 'docs.x.ai', 'docs.mergify.com'],
=======
  allowedDomains = ['docs.github.com', 'docs.x.ai'],
>>>>>>> 8205bca (feat(ci): build grok pr operator)
} = {}) {
  const tools = [
    {
      type: 'web_search',
      filters: {
        allowed_domains: allowedDomains,
      },
    },
  ];

  if (includeDocsMcp) {
    const docsMcpTool = buildXaiDocsMcpTool();
    if (docsMcpTool) {
      tools.push(docsMcpTool);
    }
  }

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

  tools.push(...buildOptionalRemoteMcpTools());

  if (includeCodeInterpreter) {
    tools.push({ type: 'code_interpreter' });
  }

  return tools;
}

export async function createXaiResponse({
  apiKey,
  model,
  input,
  tools = [],
  temperature = 0.1,
  maxTokens = 4000,
  text,
  previousResponseId,
  toolChoice = 'auto',
  parallelToolCalls = true,
  store = false,
}) {
  const payload = {
    model,
    store,
    temperature,
    max_tokens: maxTokens,
    input,
    tools,
    tool_choice: toolChoice,
    parallel_tool_calls: parallelToolCalls,
  };

  if (text) {
    payload.text = text;
  }

  if (previousResponseId) {
    payload.previous_response_id = previousResponseId;
  }

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`xAI Responses API request failed with ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

export async function runResponsesFunctionLoop({
  apiKey,
  model,
  input,
  tools = [],
  functionHandlers = {},
  temperature = 0.1,
  maxTokens = 4000,
  text,
  toolChoice = 'auto',
  parallelToolCalls = true,
  maxRounds = 6,
  store = false,
}) {
  let response = await createXaiResponse({
    apiKey,
    model,
    input,
    tools,
    temperature,
    maxTokens,
    text,
    toolChoice,
    parallelToolCalls,
    store,
  });

  for (let round = 0; round < maxRounds; round += 1) {
    const calls = getFunctionCalls(response);
    if (calls.length === 0) {
      return response;
    }

    const outputs = [];
    for (const call of calls) {
      const handler = functionHandlers[call.name];
      let output;
      if (!handler) {
        output = JSON.stringify({ ok: false, error: `Unknown function: ${call.name}` });
      } else {
        try {
          const args = call.arguments ? JSON.parse(call.arguments) : {};
          output = JSON.stringify(await handler(args, call));
        } catch (error) {
          output = JSON.stringify({
            ok: false,
            error: `Function arguments for ${call.name} could not be parsed or handled: ${String(error?.message ?? error)}`,
          });
        }
      }

      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output,
      });
    }

    response = await createXaiResponse({
      apiKey,
      model,
      input: outputs,
      tools,
      temperature,
      maxTokens,
      text,
      previousResponseId: response.id,
      toolChoice,
      parallelToolCalls,
      store,
    });
  }

  throw new Error(`xAI function-calling loop exceeded ${maxRounds} rounds.`);
}
