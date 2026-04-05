#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name] ?? fallback;
}

async function xaiApi(path, init = {}) {
  const response = await fetch(`https://api.x.ai${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${requiredEnv('XAI_API_KEY')}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`xAI API ${path} failed with ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

async function xaiManagement(path, init = {}) {
  const response = await fetch(`https://management-api.x.ai${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${requiredEnv('XAI_MANAGEMENT_API_KEY')}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `xAI management API ${path} failed with ${response.status}: ${await response.text()}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function listCollections() {
  const response = await xaiManagement('/v1/collections?limit=100');
  return response?.collections ?? response?.data ?? [];
}

async function ensureCollection(name, description) {
  const existing = (await listCollections()).find((collection) => collection.name === name);
  if (existing) {
    return existing;
  }

  return await xaiManagement('/v1/collections', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

async function uploadFile(filePath) {
  const form = new FormData();
  const content = readFileSync(filePath);
  form.append('file', new Blob([content]), basename(filePath));

  return await xaiApi('/v1/files', {
    method: 'POST',
    body: form,
  });
}

async function addFileToCollection(collectionId, fileId) {
  return await xaiManagement(`/v1/collections/${collectionId}/files`, {
    method: 'POST',
    body: JSON.stringify({ file_id: fileId }),
  });
}

function parseFileList() {
  return requiredEnv('COLLECTION_SOURCE_FILES')
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function main() {
  const repo = requiredEnv('GITHUB_REPOSITORY');
  const collectionName = optionalEnv('XAI_COLLECTION_NAME', `${repo} PR Manager Policy`);
  const description = optionalEnv(
    'XAI_COLLECTION_DESCRIPTION',
    'Repo policy, automation, and security documents for Grok PR automation.'
  );

  const collection = await ensureCollection(collectionName, description);
  const collectionId = collection.id ?? collection.collection_id;
  const files = parseFileList();
  const uploaded = [];

  for (const filePath of files) {
    const file = await uploadFile(filePath);
    const fileId = file.id ?? file.file_id;
    await addFileToCollection(collectionId, fileId);
    uploaded.push({ source: filePath, fileId });
  }

  process.stdout.write(
    [
      `Collection: ${collection.name ?? collectionName}`,
      `Collection ID: ${collectionId}`,
      '',
      'Uploaded files:',
      ...uploaded.map((item) => `- ${item.source} -> ${item.fileId}`),
      '',
      `Set XAI_COLLECTION_IDS=${collectionId} in repo secrets or variables to enable file_search grounding.`,
    ].join('\n')
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
