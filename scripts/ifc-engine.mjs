export const CONFIG = {
  maxFileSizeMB: 250,
};

export const MAX_FILE_SIZE = CONFIG.maxFileSizeMB * 1024 * 1024;

export function bytes(n) {
  if (!n) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = n;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function issue(message, nextStep) {
  return { ok: false, message, nextStep };
}

export function diagnosticText(result) {
  return result?.nextStep ? `${result.message}. ${result.nextStep}` : result?.message || 'Falha não identificada.';
}

export function ifcSchemaRaw(text) {
  const match = String(text || '').match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  return match ? match[1].toUpperCase().trim() : '';
}

export function detectIfcSchema(text) {
  const raw = ifcSchemaRaw(text);
  if (!raw) return 'Não identificado';
  if (raw.startsWith('IFC2X3')) return 'IFC2x3';
  if (raw.startsWith('IFC4X3')) return 'IFC4.3';
  if (raw.startsWith('IFC4')) return 'IFC4';
  return raw;
}

export function precheckFileBasics(file) {
  const name = file?.name || '';
  const size = Number(file?.size || 0);
  if (!/\.ifc$/i.test(name)) {
    return issue('Extensão inválida: use .ifc', 'Selecione um arquivo IFC STEP com extensão .ifc.');
  }
  if (size <= 0) {
    return issue('Arquivo vazio', 'Exporte novamente o IFC no software BIM e tente carregar o novo arquivo.');
  }
  if (size > MAX_FILE_SIZE) {
    return issue(
      `Bloqueado: tamanho acima do limite configurado de ${bytes(MAX_FILE_SIZE)}`,
      `Reduza ou divida o modelo antes da auditoria; o limite atual é ${CONFIG.maxFileSizeMB} MB.`
    );
  }
  return { ok: true, message: 'Básico aprovado' };
}

export function precheckIfcText(text) {
  const head = String(text || '').slice(0, 12000);
  if (!/^\s*(?:\uFEFF)?ISO-10303-21\s*;/i.test(head)) {
    return {
      ...issue(
        'Cabeçalho ISO-10303-21 ausente',
        'Confirme se o arquivo é IFC em formato STEP e não um arquivo compactado, XML ou outro formato renomeado.'
      ),
      schema: 'Não identificado',
    };
  }
  if (!/\bHEADER\s*;/i.test(head)) {
    return {
      ...issue('Bloco HEADER ausente', 'Exporte novamente o IFC incluindo o cabeçalho padrão do arquivo.'),
      schema: 'Não identificado',
    };
  }
  const schema = detectIfcSchema(text);
  if (schema === 'Não identificado') {
    return {
      ...issue('FILE_SCHEMA ausente', 'Reexporte o IFC informando um schema válido, como IFC2x3, IFC4 ou IFC4.3.'),
      schema,
    };
  }
  return { ok: true, schema, message: 'Aprovado' };
}

export function precheckIfcPayload({ name, size, text }) {
  const basic = precheckFileBasics({ name, size });
  if (!basic.ok) return { ok: false, schema: 'Não identificado', stage: 'file', diagnostic: diagnosticText(basic), basic };
  const content = precheckIfcText(text);
  if (!content.ok) return { ok: false, schema: content.schema, stage: 'content', diagnostic: diagnosticText(content), basic, content };
  return { ok: true, schema: content.schema, stage: 'ready', diagnostic: 'Arquivo aprovado no pre-check IFC.', basic, content };
}
