import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const historyPath = process.env.HISTORY_STORE_PATH || join(process.cwd(), 'data', 'validation-history.json');

async function readHistory() {
  try {
    const raw = await readFile(historyPath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data?.validations) ? data.validations : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeHistory(validations) {
  await mkdir(dirname(historyPath), { recursive: true });
  await writeFile(historyPath, JSON.stringify({ validations }, null, 2), 'utf8');
}

export async function listValidations() {
  const validations = await readHistory();
  return validations
    .map(item => ({
      id: item.id,
      createdAt: item.createdAt,
      projectId: item.projectId,
      projectName: item.projectName,
      fileCount: item.report?.summary?.files || 0,
      schema: item.report?.summary?.schema || 'Não identificado',
      score: item.report?.summary?.score ?? null,
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getValidation(id) {
  const validations = await readHistory();
  return validations.find(item => item.id === id) || null;
}

export async function saveValidation(payload) {
  const validations = await readHistory();
  const now = new Date().toISOString();
  const record = {
    id: payload.id || `val-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    projectId: payload.projectId || 'default',
    projectName: payload.projectName || 'Projeto sem nome',
    report: payload.report || payload,
  };
  validations.push(record);
  await writeHistory(validations);
  return record;
}

export { historyPath };
