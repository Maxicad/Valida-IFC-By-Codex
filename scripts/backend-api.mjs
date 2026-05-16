import { createServer } from 'node:http';
import { precheckIfcPayload } from './ifc-engine.mjs';
import { getValidation, historyPath, listValidations, saveValidation } from './history-store.mjs';

const port = Number(process.env.API_PORT || 4174);

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-File-Name,X-File-Size',
  });
  res.end(JSON.stringify(body, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  return JSON.parse(body.toString('utf8') || '{}');
}

async function parsePayload(req) {
  const body = await readBody(req);
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    const payload = JSON.parse(body.toString('utf8') || '{}');
    return {
      name: payload.name || 'modelo.ifc',
      size: Number(payload.size || Buffer.byteLength(payload.text || '', 'utf8')),
      text: String(payload.text || ''),
    };
  }
  return {
    name: req.headers['x-file-name'] || 'modelo.ifc',
    size: Number(req.headers['x-file-size'] || body.length),
    text: body.toString('utf8'),
  };
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, service: 'valida-ifc-backend-api', historyPath });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/ifc/precheck') {
      const payload = await parsePayload(req);
      const result = precheckIfcPayload(payload);
      sendJson(res, result.ok ? 200 : 422, { file: payload.name, size: payload.size, ...result });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/validations') {
      sendJson(res, 200, { ok: true, validations: await listValidations() });
      return;
    }
    const validationMatch = url.pathname.match(/^\/api\/validations\/([^/]+)$/);
    if (req.method === 'GET' && validationMatch) {
      const validation = await getValidation(decodeURIComponent(validationMatch[1]));
      sendJson(res, validation ? 200 : 404, validation ? { ok: true, validation } : { ok: false, message: 'Validação não encontrada.' });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/validations') {
      const payload = await readJson(req);
      const validation = await saveValidation(payload);
      sendJson(res, 201, { ok: true, validation });
      return;
    }
    sendJson(res, 404, { ok: false, message: 'Rota não encontrada.' });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: 'Falha ao processar a requisição.',
      detail: error?.message || String(error),
    });
  }
}).listen(port, () => {
  console.log(`Valida IFC Backend API: http://localhost:${port}/api/health`);
});
