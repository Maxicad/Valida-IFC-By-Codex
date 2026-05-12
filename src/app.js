import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';
import { IFCLoader } from 'web-ifc-three';

const CHECKLIST_STORAGE_KEY = 'ifc-audit.saved-checklists.v1';
const MAX_VIEWER_OBJECTS = 650;
const WEB_IFC_WASM_PATH = 'https://cdn.jsdelivr.net/npm/web-ifc@0.0.59/';

const state = {
  files: [],
  criteria: [],
  criteriaLibrary: [],
  matrixSource: 'CritÃ©rios padrÃ£o',
  audit: null,
  loading: {
    active: false,
    overall: 0,
    status: 'Aguardando arquivos IFC.',
    files: [],
  },
  viewer: {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    group: null,
    ifcLoader: null,
    realModels: [],
    modelSignature: '',
    loadingSignature: '',
    status: 'Carregue um arquivo IFC para visualizar o modelo.',
    severityMaterials: {},
    selectionMaterial: null,
    selectedIfc: null,
    raycaster: null,
    pointer: null,
    selected: null,
    animationId: null,
  },
  project: {
    name: '',
    type: 'arquitetura',
    checklistName: '',
  },
  savedChecklists: loadSavedChecklists(),
};

const sampleCriteria = [
  {
    id: crypto.randomUUID(),
    name: 'Paredes possuem nÃ­vel da construÃ§Ã£o definido',
    type: 'wall-storey-defined',
    target: 'IFCWALL|IFCWALLSTANDARDCASE',
    pattern: 'IFCBUILDINGSTOREY',
    threshold: 100,
    projectType: 'todos',
    severity: 'high',
    category: 'NÃ­veis da ConstruÃ§Ã£o',
  },
];

const elements = {
  ifcFiles: document.querySelector('#ifcFiles'),
  dropZone: document.querySelector('#dropZone'),
  criteriaForm: document.querySelector('#criteriaForm'),
  criterionTemplate: document.querySelector('#criterionTemplate'),
  criteriaFile: document.querySelector('#criteriaFile'),
  projectName: document.querySelector('#projectName'),
  projectType: document.querySelector('#projectType'),
  checklistName: document.querySelector('#checklistName'),
  savedChecklistSelect: document.querySelector('#savedChecklistSelect'),
  loadByProjectType: document.querySelector('#loadByProjectType'),
  saveChecklist: document.querySelector('#saveChecklist'),
  loadSavedChecklist: document.querySelector('#loadSavedChecklist'),
  deleteSavedChecklist: document.querySelector('#deleteSavedChecklist'),
  exportChecklist: document.querySelector('#exportChecklist'),
  loadSample: document.querySelector('#loadSample'),
  runAudit: document.querySelector('#runAudit'),
  fileList: document.querySelector('#fileList'),
  criteriaList: document.querySelector('#criteriaList'),
  federatedFiles: document.querySelector('#federatedFiles'),
  federatedEntities: document.querySelector('#federatedEntities'),
  federatedSize: document.querySelector('#federatedSize'),
  downloadFederated: document.querySelector('#downloadFederated'),
  uploadProgress: document.querySelector('#uploadProgress'),
  progressBar: document.querySelector('#progressBar'),
  progressPercent: document.querySelector('#progressPercent'),
  progressStatus: document.querySelector('#progressStatus'),
  progressFiles: document.querySelector('#progressFiles'),
  modelViewer: document.querySelector('#modelViewer'),
  modelEmpty: document.querySelector('#modelEmpty'),
  modelLegend: document.querySelector('#modelLegend'),
  modelSelection: document.querySelector('#modelSelection'),
  kpiScore: document.querySelector('#kpiScore'),
  kpiPassed: document.querySelector('#kpiPassed'),
  kpiFailed: document.querySelector('#kpiFailed'),
  kpiFiles: document.querySelector('#kpiFiles'),
  criteriaChart: document.querySelector('#criteriaChart'),
  statusDonut: document.querySelector('#statusDonut'),
  auditTable: document.querySelector('#auditTable'),
  downloadJson: document.querySelector('#downloadJson'),
  downloadCsv: document.querySelector('#downloadCsv'),
  downloadHtml: document.querySelector('#downloadHtml'),
};


function loadSavedChecklists() {
  try {
    const stored = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function persistSavedChecklists() {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state.savedChecklists));
}

function syncProjectFromForm() {
  state.project = {
    name: elements.projectName.value.trim(),
    type: elements.projectType.value,
    checklistName: elements.checklistName.value.trim(),
  };
}

function cloneCriterion(criterion, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: criterion.name?.trim() || 'CritÃ©rio sem nome',
    type: normalizeCriterionType(criterion.type),
    target: (criterion.target || 'IFC*').trim().toUpperCase(),
    pattern: criterion.pattern?.trim() ?? '',
    threshold: Number(criterion.threshold) || 1,
    projectType: normalizeProjectType(criterion.projectType || overrides.projectType || state.project.type),
    category: criterion.category?.trim() || overrides.category || '',
    severity: normalizeSeverity(criterion.severity || criterion.criticality || criterion.risk || 'medium'),
    fileScope: criterion.fileScope || overrides.fileScope || '',
    fileName: criterion.fileName || overrides.fileName || '',
    source: criterion.source || overrides.source || '',
  };
}


function normalizeCriterionType(type) {
  const normalized = String(type || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const aliases = {
    entitycount: 'entity-count',
    quantidadeentidade: 'entity-count',
    contagementidade: 'entity-count',
    requiredtext: 'required-text',
    textoobrigatorio: 'required-text',
    propertyregex: 'property-regex',
    propriedadepadrao: 'property-regex',
    objectnameregex: 'object-name-regex',
    nomedoobjeto: 'object-name-regex',
    nomenclatura: 'object-name-regex',
    classificationregex: 'classification-regex',
    classificacao: 'classification-regex',
    wallstoreydefined: 'wall-storey-defined',
    paredescomniveldefinido: 'wall-storey-defined',
    nivelconstrucao: 'wall-storey-defined',
    niveisconstrucao: 'wall-storey-defined',
  };
  return aliases[normalized] || type || 'required-text';
}

function normalizeProjectType(projectType) {
  const normalized = String(projectType || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const aliases = {
    arquitetura: 'arquitetura',
    arquitetonico: 'arquitetura',
    estrutural: 'estrutural',
    estrutura: 'estrutural',
    instalacoes: 'instalacoes',
    instalacao: 'instalacoes',
    hidrossanitario: 'instalacoes',
    eletrica: 'instalacoes',
    infraestrutura: 'infraestrutura',
    coordenacao: 'coordenacao',
    coordenacaobim: 'coordenacao',
    customizado: 'customizado',
    todos: 'todos',
    geral: 'todos',
  };
  return aliases[normalized] || projectType || 'customizado';
}

function normalizeSeverity(severity) {
  const normalized = String(severity || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const aliases = {
    baixa: 'low',
    baixo: 'low',
    low: 'low',
    media: 'medium',
    medio: 'medium',
    medium: 'medium',
    moderada: 'medium',
    moderado: 'medium',
    alta: 'high',
    alto: 'high',
    high: 'high',
    critica: 'critical',
    critico: 'critical',
    critical: 'critical',
  };
  return aliases[normalized] || 'medium';
}

function labelSeverity(severity) {
  const labels = {
    approved: 'Aprovado',
    low: 'Baixa',
    medium: 'Media',
    high: 'Alta',
    critical: 'Critica',
    neutral: 'Sem auditoria',
  };
  return labels[severity] || labels.medium;
}

function severityRank(severity) {
  return {
    neutral: 0,
    approved: 1,
    low: 2,
    medium: 3,
    high: 4,
    critical: 5,
  }[severity] ?? 3;
}

function severityColor(severity) {
  return {
    neutral: '#6d7f96',
    approved: '#11a36a',
    low: '#f2c94c',
    medium: '#f2994a',
    high: '#eb5757',
    critical: '#9b1c31',
  }[severity] || '#f2994a';
}

function criteriaForProjectType(projectType) {
  const library = state.criteriaLibrary.length > 0 ? state.criteriaLibrary : sampleCriteria;
  return library
    .filter((criterion) => ['coordenacao', 'todos', projectType].includes(criterion.projectType))
    .map((criterion) => cloneCriterion(criterion, { projectType }));
}

function loadCriteriaByProjectType() {
  syncProjectFromForm();
  if (state.criteriaLibrary.length === 0) {
    state.criteriaLibrary = sampleCriteria.map((criterion) => cloneCriterion(criterion));
  }
  state.criteria = criteriaForProjectType(state.project.type);
  state.project.checklistName = state.project.checklistName || `Lista padrÃ£o - ${labelProjectType(state.project.type)}`;
  elements.checklistName.value = state.project.checklistName;
  state.audit = null;
  renderAll();
}

function saveCurrentChecklist() {
  syncProjectFromForm();
  if (state.criteria.length === 0) {
    alert('Cadastre ou importe critÃ©rios antes de salvar a lista.');
    return;
  }

  const checklist = {
    id: crypto.randomUUID(),
    name: state.project.checklistName || `Lista ${labelProjectType(state.project.type)}`,
    projectType: state.project.type,
    projectName: state.project.name,
    updatedAt: new Date().toISOString(),
    criteria: state.criteria.map((criterion) => ({ ...criterion, id: undefined })),
  };

  state.savedChecklists = [
    checklist,
    ...state.savedChecklists.filter((saved) => !(saved.name === checklist.name && saved.projectType === checklist.projectType)),
  ];
  persistSavedChecklists();
  renderSavedChecklists();
  elements.savedChecklistSelect.value = checklist.id;
}

function applySavedChecklist() {
  const checklist = state.savedChecklists.find((saved) => saved.id === elements.savedChecklistSelect.value);
  if (!checklist) return;

  state.project = {
    name: checklist.projectName || elements.projectName.value.trim(),
    type: checklist.projectType,
    checklistName: checklist.name,
  };
  elements.projectName.value = state.project.name;
  elements.projectType.value = state.project.type;
  elements.checklistName.value = state.project.checklistName;
  state.criteria = checklist.criteria.map((criterion) => cloneCriterion(criterion, { projectType: checklist.projectType }));
  state.audit = null;
  renderAll();
}

function deleteSavedChecklist() {
  const selectedId = elements.savedChecklistSelect.value;
  if (!selectedId) return;
  state.savedChecklists = state.savedChecklists.filter((saved) => saved.id !== selectedId);
  persistSavedChecklists();
  renderSavedChecklists();
}

function exportCurrentChecklist() {
  syncProjectFromForm();
  const payload = {
    project: state.project,
    criteria: state.criteria.map(({ id, ...criterion }) => criterion),
  };
  const slug = (state.project.checklistName || 'lista-verificacao').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  download(`${slug || 'lista-verificacao'}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function renderSavedChecklists() {
  if (state.savedChecklists.length === 0) {
    elements.savedChecklistSelect.innerHTML = '<option value="">Nenhuma lista salva</option>';
    return;
  }

  elements.savedChecklistSelect.innerHTML = [
    '<option value="">Selecione uma lista</option>',
    ...state.savedChecklists.map((checklist) => `
      <option value="${checklist.id}">${escapeHtml(checklist.name)} Â· ${labelProjectType(checklist.projectType)}</option>
    `),
  ].join('');
}

function labelProjectType(projectType) {
  const labels = {
    arquitetura: 'Arquitetura',
    estrutural: 'Estrutural',
    instalacoes: 'InstalaÃ§Ãµes',
    infraestrutura: 'Infraestrutura',
    coordenacao: 'CoordenaÃ§Ã£o BIM',
    customizado: 'Customizado',
    todos: 'Todos',
  };
  return labels[projectType] || projectType;
}

function normalizeIfcText(text) {
  return text.toUpperCase().replace(/\s+/g, ' ');
}

function extractIfcMetadata(fileName, content) {
  const normalized = normalizeIfcText(content);
  const entityMatches = normalized.match(/IFC[A-Z0-9_]+/g) ?? [];
  const entityCounts = entityMatches.reduce((accumulator, entity) => {
    accumulator[entity] = (accumulator[entity] ?? 0) + 1;
    return accumulator;
  }, {});

  const projectMatch = content.match(/IFCPROJECT\([^']*'([^']*)'/i);
  const schemaMatch = content.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  const stepRecords = extractStepRecords(content);
  const classifications = extractClassifications(stepRecords);
  const storeyAssignments = extractStoreyAssignments(stepRecords);
  const objects = extractObjects(stepRecords, classifications, storeyAssignments);

  return {
    id: crypto.randomUUID(),
    name: fileName,
    size: new Blob([content]).size,
    content,
    normalized,
    entities: entityCounts,
    entityTotal: entityMatches.length,
    objectTotal: objects.length,
    objects,
    projectName: projectMatch?.[1] || 'Projeto nÃ£o identificado',
    schema: schemaMatch?.[1] || 'Schema nÃ£o identificado',
  };
}

function extractStepRecords(content) {
  const records = [];
  const recordPattern = /#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([^;]*)\);/gi;
  let match = recordPattern.exec(content);

  while (match) {
    records.push({
      id: match[1],
      entity: match[2].toUpperCase(),
      raw: match[3],
      strings: extractStepStrings(match[3]),
      references: [...match[3].matchAll(/#(\d+)/g)].map((reference) => reference[1]),
    });
    match = recordPattern.exec(content);
  }

  return records;
}

function extractStepStrings(raw) {
  return [...raw.matchAll(/'((?:[^']|'')*)'/g)].map((match) => match[1].replaceAll("''", "'"));
}

function extractClassifications(records) {
  const references = new Map();
  const objectClassifications = new Map();

  records
    .filter((record) => record.entity === 'IFCCLASSIFICATIONREFERENCE')
    .forEach((record) => {
      references.set(record.id, record.strings.filter(Boolean).join(' | '));
    });

  records
    .filter((record) => record.entity === 'IFCRELASSOCIATESCLASSIFICATION')
    .forEach((record) => {
      const classificationReference = [...record.references].reverse()
        .find((reference) => references.has(reference));
      const classification = references.get(classificationReference) ?? '';

      record.references
        .filter((reference) => reference !== classificationReference)
        .forEach((reference) => {
          const current = objectClassifications.get(reference) ?? [];
          objectClassifications.set(reference, [...current, classification].filter(Boolean));
        });
    });

  return objectClassifications;
}

function extractStoreyAssignments(records) {
  const storeys = new Map();
  const assignments = new Map();

  records
    .filter((record) => record.entity === 'IFCBUILDINGSTOREY')
    .forEach((record) => {
      storeys.set(record.id, record.strings[1] || record.strings[0] || `NÃ­vel #${record.id}`);
    });

  records
    .filter((record) => record.entity === 'IFCRELCONTAINEDINSPATIALSTRUCTURE')
    .forEach((record) => {
      const storeyReference = [...record.references].reverse().find((reference) => storeys.has(reference));
      if (!storeyReference) return;

      record.references
        .filter((reference) => reference !== storeyReference)
        .forEach((reference) => {
          assignments.set(reference, {
            id: storeyReference,
            name: storeys.get(storeyReference),
          });
        });
    });

  return assignments;
}

function extractObjects(records, classifications, storeyAssignments) {
  return records
    .filter((record) => isAuditableObject(record.entity))
    .map((record) => ({
      id: record.id,
      entity: record.entity,
      name: record.strings[1] || record.strings[0] || '',
      classifications: classifications.get(record.id) ?? [],
      storey: storeyAssignments.get(record.id) ?? null,
    }));
}

function isAuditableObject(entity) {
  const ignoredPrefixes = [
    'IFCREL',
    'IFCPROPERTY',
    'IFCPROPERTYSET',
    'IFCQUANTITY',
    'IFCOWNERHISTORY',
    'IFCLOCALPLACEMENT',
    'IFCAXIS2PLACEMENT',
    'IFCCARTESIANPOINT',
    'IFCDIRECTION',
    'IFCSHAPE',
    'IFCGEOMETRIC',
    'IFCPRESENTATION',
    'IFCCLASSIFICATION',
  ];

  return entity.startsWith('IFC') && !ignoredPrefixes.some((prefix) => entity.startsWith(prefix));
}

async function handleIfcFiles(fileList) {
  const files = Array.from(fileList).filter((file) => /\.(ifc|txt)$/i.test(file.name));
  if (files.length === 0) return;

  startUploadProgress(files);
  const parsedFiles = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    state.loading.status = `Carregando ${file.name}`;
    renderUploadProgress();
    const { content, buffer } = await readIfcFile(file, index);
    state.loading.status = `Processando ${file.name}`;
    renderUploadProgress();
    parsedFiles.push({
      ...extractIfcMetadata(file.name, content),
      buffer,
    });
    state.loading.files[index].loaded = state.loading.files[index].total;
    state.loading.files[index].done = true;
    updateOverallProgress();
  }

  state.files = [...state.files, ...parsedFiles];
  state.audit = null;
  state.loading.active = false;
  state.loading.overall = 100;
  state.loading.status = `${parsedFiles.length} arquivo(s) IFC carregado(s).`;
  renderAll();
  loadRealIfcModels();
}

function startUploadProgress(files) {
  state.loading = {
    active: true,
    overall: 0,
    status: 'Preparando leitura dos arquivos IFC.',
    files: files.map((file) => ({
      name: file.name,
      loaded: 0,
      total: file.size || 1,
      done: false,
    })),
  };
  renderUploadProgress();
}

function readIfcFile(file, index) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      const loadingFile = state.loading.files[index];
      loadingFile.loaded = event.lengthComputable ? event.loaded : Math.min(file.size, loadingFile.loaded + file.size * 0.12);
      loadingFile.total = event.lengthComputable ? event.total : file.size || loadingFile.total;
      updateOverallProgress();
    };

    reader.onerror = () => reject(reader.error || new Error(`Falha ao ler ${file.name}`));
    reader.onload = () => {
      const loadingFile = state.loading.files[index];
      loadingFile.loaded = loadingFile.total;
      updateOverallProgress();
      const buffer = reader.result;
      const content = new TextDecoder('utf-8').decode(buffer);
      resolve({ content, buffer });
    };

    reader.readAsArrayBuffer(file);
  });
}

function updateOverallProgress() {
  const total = state.loading.files.reduce((sum, file) => sum + file.total, 0) || 1;
  const loaded = state.loading.files.reduce((sum, file) => sum + Math.min(file.loaded, file.total), 0);
  state.loading.overall = Math.min(100, Math.round((loaded / total) * 100));
  renderUploadProgress();
}

function addCriterion(criterion) {
  syncProjectFromForm();
  state.criteria.push(cloneCriterion(criterion, { projectType: state.project.type }));
  state.audit = null;
  renderAll();
}

function removeCriterion(id) {
  state.criteria = state.criteria.filter((criterion) => criterion.id !== id);
  state.audit = null;
  renderAll();
}

function removeFile(id) {
  state.files = state.files.filter((file) => file.id !== id);
  state.audit = null;
  resetViewerModels();
  renderAll();
}

function buildFederatedModel() {
  const content = state.files
    .map((file, index) => [
      `/* FEDERATED_SOURCE ${index + 1}: ${file.name} | ${file.schema} | ${file.projectName} */`,
      file.content,
    ].join('\n'))
    .join('\n\n');

  return {
    fileCount: state.files.length,
    entityTotal: state.files.reduce((sum, file) => sum + file.entityTotal, 0),
    size: state.files.reduce((sum, file) => sum + file.size, 0),
    content,
  };
}

function evaluateCriterion(criterion, federated) {
  const target = criterion.target.toUpperCase();
  const filesToEvaluate = criterion.fileScope
    ? state.files.filter((file) => file.id === criterion.fileScope || file.name === criterion.fileName)
    : state.files;
  const evidenceByFile = filesToEvaluate.map((file) => {
    if (criterion.type === 'wall-storey-defined') {
      return evaluateWallStoreyDefined(file, criterion);
    }

    if (criterion.type === 'object-name-regex') {
      return evaluateObjectPattern(file, criterion, 'name');
    }

    if (criterion.type === 'classification-regex') {
      return evaluateObjectPattern(file, criterion, 'classification');
    }

    if (criterion.type === 'entity-count') {
      const count = file.entities[target] ?? 0;
      return { file: file.name, count, passed: count >= criterion.threshold };
    }

    if (criterion.type === 'property-regex') {
      let count = 0;
      try {
        count = (file.normalized.match(new RegExp(target, 'g')) ?? []).length;
      } catch {
        count = file.normalized.includes(target) ? 1 : 0;
      }
      return { file: file.name, count, passed: count >= criterion.threshold };
    }

    const count = file.normalized.includes(target) ? 1 : 0;
    return { file: file.name, count, passed: count >= 1 };
  });

  const total = evidenceByFile.reduce((sum, item) => sum + item.count, 0);
  const applicableTotal = evidenceByFile.reduce((sum, item) => sum + (item.applicable ?? 0), 0);
  const percent = applicableTotal ? Math.round((total / applicableTotal) * 100) : 0;
  const percentualCriteria = ['object-name-regex', 'classification-regex', 'wall-storey-defined'];
  const passed = percentualCriteria.includes(criterion.type)
    ? applicableTotal > 0 && percent >= criterion.threshold
    : criterion.type === 'required-text'
      ? total >= 1
      : total >= criterion.threshold;

  return {
    ...criterion,
    passed,
    severity: passed ? 'approved' : normalizeSeverity(criterion.severity),
    total,
    evidence: evidenceByFile,
    message: percentualCriteria.includes(criterion.type)
      ? `${percent}% aderente (${total}/${applicableTotal} objetos aplicÃ¡veis).`
      : passed
        ? `Encontrado ${total} ocorrÃªncia(s) no modelo federado.`
        : `Esperado mÃ­nimo ${criterion.threshold}; encontrado ${total}.`,
    federatedSize: federated.size,
  };
}


function evaluateObjectPattern(file, criterion, mode) {
  const objects = file.objects.filter((object) => matchesEntityFilter(object.entity, criterion.target));
  const expression = buildExpression(criterion.pattern || criterion.target);
  const failures = [];
  const failedObjects = [];
  let count = 0;

  objects.forEach((object) => {
    const value = mode === 'classification'
      ? object.classifications.join(' | ')
      : object.name;
    const passed = expression.test(value);

    if (passed) {
      count += 1;
    } else {
      failedObjects.push({
        id: object.id,
        entity: object.entity,
        name: object.name,
        value,
      });
      if (failures.length < 3) {
        failures.push(`${object.entity} #${object.id}: ${value || 'sem valor'}`);
      }
    }
  });

  return {
    file: file.name,
    count,
    applicable: objects.length,
    passed: objects.length > 0 && Math.round((count / objects.length) * 100) >= criterion.threshold,
    failures,
    failedObjects,
  };
}

function evaluateWallStoreyDefined(file, criterion) {
  const walls = file.objects.filter((object) => matchesEntityFilter(object.entity, criterion.target));
  const failures = [];
  const failedObjects = [];
  let count = 0;

  walls.forEach((wall) => {
    if (wall.storey?.name) {
      count += 1;
      return;
    }

    failedObjects.push({
      id: wall.id,
      entity: wall.entity,
      name: wall.name,
      value: 'sem nÃ­vel da construÃ§Ã£o',
    });

    if (failures.length < 3) {
      failures.push(`${wall.entity} #${wall.id}: ${wall.name || 'sem nome'} sem nÃ­vel da construÃ§Ã£o`);
    }
  });

  return {
    file: file.name,
    count,
    applicable: walls.length,
    passed: walls.length > 0 && Math.round((count / walls.length) * 100) >= criterion.threshold,
    failures,
    failedObjects,
  };
}

function matchesEntityFilter(entity, filter) {
  if (!filter || filter === 'IFC*') return true;
  const alternatives = filter.split(/[|,;]/).map((item) => item.trim()).filter(Boolean);

  return alternatives.some((alternative) => {
    if (alternative.endsWith('*')) return entity.startsWith(alternative.slice(0, -1));
    return entity === alternative;
  });
}

function buildExpression(pattern) {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return new RegExp(escapeRegExp(pattern), 'i');
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runAudit() {
  if (state.files.length === 0 || state.criteria.length === 0) {
    alert('Carregue ao menos um arquivo IFC e cadastre ao menos um critÃ©rio.');
    return;
  }

  const federated = buildFederatedModel();
  const results = state.criteria.map((criterion) => evaluateCriterion(criterion, federated));
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const score = Math.round((passed / results.length) * 100);

  syncProjectFromForm();
  state.audit = {
    generatedAt: new Date().toISOString(),
    project: { ...state.project },
    federated,
    score,
    passed,
    failed,
    results,
  };

  renderAll();
}

function renderUploadProgress() {
  if (!elements.uploadProgress) return;

  const percent = state.loading.overall || 0;
  elements.uploadProgress.classList.toggle('is-idle', !state.loading.active && percent === 0);
  elements.uploadProgress.classList.toggle('is-complete', !state.loading.active && percent === 100);
  elements.progressBar.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressStatus.textContent = state.loading.status;

  if (state.loading.files.length === 0) {
    elements.progressFiles.textContent = 'Nenhum arquivo em leitura.';
    return;
  }

  elements.progressFiles.innerHTML = state.loading.files.map((file) => {
    const filePercent = Math.min(100, Math.round((file.loaded / Math.max(file.total, 1)) * 100));
    return `
      <span>
        <strong>${escapeHtml(file.name)}</strong>
        ${file.done ? 'concluido' : `${filePercent}%`} Â· ${formatBytes(file.loaded)} / ${formatBytes(file.total)}
      </span>
    `;
  }).join('');
}

function renderFileList() {
  if (state.files.length === 0) {
    elements.fileList.className = 'list empty';
    elements.fileList.textContent = 'Nenhum arquivo IFC carregado.';
    return;
  }

  elements.fileList.className = 'list';
  elements.fileList.innerHTML = state.files.map((file) => `
    <div class="item">
      <button type="button" data-remove-file="${file.id}">Remover</button>
      <strong>${escapeHtml(file.name)}</strong>
      <small>${escapeHtml(file.schema)} Â· ${escapeHtml(file.projectName)} Â· ${formatBytes(file.size)} Â· ${file.entityTotal} entidades Â· ${file.objectTotal} objetos auditÃ¡veis</small>
    </div>
  `).join('');
}

function renderCriteriaList() {
  if (state.criteria.length === 0) {
    elements.criteriaList.className = 'list empty';
    elements.criteriaList.textContent = 'Nenhum critÃ©rio cadastrado.';
    return;
  }

  elements.criteriaList.className = 'list';
  elements.criteriaList.innerHTML = state.criteria.map((criterion) => `
    <div class="item">
      <button type="button" data-remove-criterion="${criterion.id}">Remover</button>
      <strong>${escapeHtml(criterion.name)}</strong>
      <small>${criterion.type} Â· ${labelProjectType(criterion.projectType)}${criterion.category ? ` Â· ${escapeHtml(criterion.category)}` : ''} Â· severidade: ${labelSeverity(criterion.severity)} Â· alvo: ${escapeHtml(criterion.target)}${criterion.fileName ? ` Â· arquivo: ${escapeHtml(criterion.fileName)}` : ''}${criterion.pattern ? ` Â· padrÃ£o: ${escapeHtml(criterion.pattern)}` : ''} Â· mÃ­nimo: ${criterion.threshold}</small>
    </div>
  `).join('');
}

function renderCriteriaComposer() {
  renderCriterionTemplateOptions();
  renderCategoryOptions();
  renderTargetOptions();
}

function renderCriterionTemplateOptions() {
  if (!elements.criterionTemplate) return;
  const selected = elements.criterionTemplate.value;
  const templates = criteriaLibraryForSelectedProject();

  elements.criterionTemplate.innerHTML = [
    `<option value="">Selecione um critÃ©rio da matriz (${escapeHtml(state.matrixSource)})</option>`,
    ...templates.map((criterion, index) => `
      <option value="${index}">${escapeHtml(criterion.name)} Â· ${labelProjectType(criterion.projectType)} Â· ${labelSeverity(criterion.severity)}</option>
    `),
  ].join('');

  if ([...elements.criterionTemplate.options].some((option) => option.value === selected)) {
    elements.criterionTemplate.value = selected;
  }
}

function renderCategoryOptions() {
  const categorySelect = document.querySelector('#criterionCategory');
  if (!categorySelect) return;
  const selected = categorySelect.value;
  const categories = uniqueStrings([
    ...criteriaLibraryForSelectedProject().map((criterion) => criterion.category),
    ...state.criteria.map((criterion) => criterion.category),
    labelProjectType(state.project.type),
  ]);

  categorySelect.innerHTML = [
    '<option value="">Selecione uma disciplina/categoria</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
  ].join('');

  if (categories.includes(selected)) {
    categorySelect.value = selected;
  }
}

function renderTargetOptions() {
  const targetSelect = document.querySelector('#criterionTarget');
  if (!targetSelect) return;
  const selected = targetSelect.value;
  const matrixTargets = uniqueStrings(criteriaLibraryForSelectedProject().map((criterion) => criterion.target));

  if (state.files.length === 0) {
    targetSelect.innerHTML = [
      '<option value="IFC*">Todas as classes IFC</option>',
      ...matrixTargets.map((target) => `<option value="${escapeHtml(target)}">${escapeHtml(target)} Â· matriz</option>`),
    ].join('');
    targetSelect.value = selected || 'IFC*';
    return;
  }

  const allClasses = getIfcClassSummary(state.files);
  const options = [
    '<option value="IFC*">Todos os arquivos Â· todas as classes IFC</option>',
    ...allClasses.map(({ entity, count }) => `<option value="${entity}">Todos os arquivos Â· ${entity} (${count})</option>`),
  ];

  if (state.files.length > 1) {
    state.files.forEach((file) => {
      const fileClasses = getIfcClassSummary([file]);
      options.push(`<optgroup label="${escapeHtml(file.name)}">`);
      options.push(...fileClasses.map(({ entity, count }) => (
        `<option value="${entity}" data-file-scope="${file.id}" data-file-name="${escapeHtml(file.name)}">${entity} Â· ${escapeHtml(file.name)} (${count})</option>`
      )));
      options.push('</optgroup>');
    });
  }

  targetSelect.innerHTML = options.join('');
  if ([...targetSelect.options].some((option) => option.value === selected)) {
    targetSelect.value = selected;
  }
}

function criteriaLibraryForSelectedProject() {
  const library = state.criteriaLibrary.length > 0 ? state.criteriaLibrary : sampleCriteria;
  return library.filter((criterion) => (
    !criterion.projectType
    || criterion.projectType === state.project.type
    || criterion.projectType === 'coordenacao'
    || criterion.projectType === 'todos'
  ));
}

function getIfcClassSummary(files) {
  const counts = files.reduce((summary, file) => {
    Object.entries(file.entities)
      .filter(([entity]) => entity.startsWith('IFC'))
      .forEach(([entity, count]) => {
        summary[entity] = (summary[entity] || 0) + count;
      });
    return summary;
  }, {});

  return Object.entries(counts)
    .map(([entity, count]) => ({ entity, count }))
    .sort((a, b) => a.entity.localeCompare(b.entity, 'pt-BR'));
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function renderFederation() {
  const federated = buildFederatedModel();
  elements.federatedFiles.textContent = federated.fileCount;
  elements.federatedEntities.textContent = federated.entityTotal;
  elements.federatedSize.textContent = formatBytes(federated.size);
  elements.downloadFederated.disabled = state.files.length === 0;
  renderModelViewer();
}

function initModelViewer() {
  if (!elements.modelViewer || state.viewer.renderer) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fbff);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(52, 42, 68);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  elements.modelViewer.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  configureViewerControls(controls);

  const group = new THREE.Group();
  scene.add(group);

  const grid = new THREE.GridHelper(110, 22, 0xb6c4d8, 0xdce6f2);
  scene.add(grid);
  scene.add(new THREE.AmbientLight(0xffffff, 1.7));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
  keyLight.position.set(60, 90, 50);
  scene.add(keyLight);

  const ifcLoader = new IFCLoader();
  ifcLoader.ifcManager.setWasmPath(WEB_IFC_WASM_PATH);

  state.viewer = {
    ...state.viewer,
    scene,
    camera,
    renderer,
    controls,
    group,
    ifcLoader,
    severityMaterials: createSeverityMaterials(),
    selectionMaterial: createSelectionMaterial(),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
  };

  renderer.domElement.addEventListener('click', selectViewerObject);
  window.addEventListener('resize', resizeModelViewer);
  resizeModelViewer();
  animateModelViewer();
}

function configureViewerControls(controls) {
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.2;
  controls.maxDistance = 100000;
  if ('zoomToCursor' in controls) controls.zoomToCursor = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.target.set(0, 6, 0);
}

function setViewerMode(mode) {
  if (!state.viewer.controls) return;
  if (mode === 'pan') {
    state.viewer.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
  } else {
    state.viewer.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }
  document.querySelectorAll('[data-viewer-action="orbit"], [data-viewer-action="pan"]')
    .forEach((button) => button.classList.toggle('is-active', button.dataset.viewerAction === mode));
}

function zoomViewer(multiplier) {
  if (!state.viewer.camera || !state.viewer.controls) return;
  const direction = state.viewer.camera.position.clone().sub(state.viewer.controls.target);
  direction.multiplyScalar(multiplier);
  state.viewer.camera.position.copy(state.viewer.controls.target.clone().add(direction));
  state.viewer.camera.updateProjectionMatrix();
  state.viewer.controls.update();
}

function fitViewerToScene() {
  if (!state.viewer.group) return;
  fitGroupToCamera(state.viewer.group);
}

function resetViewerCamera() {
  if (!state.viewer.camera || !state.viewer.controls) return;
  state.viewer.camera.position.set(52, 42, 68);
  state.viewer.controls.target.set(0, 6, 0);
  state.viewer.camera.near = 0.1;
  state.viewer.camera.far = 2000;
  state.viewer.camera.updateProjectionMatrix();
  state.viewer.controls.update();
}

function resizeModelViewer() {
  if (!state.viewer.renderer || !elements.modelViewer) return;
  const { clientWidth, clientHeight } = elements.modelViewer;
  const width = Math.max(clientWidth, 320);
  const height = Math.max(clientHeight, 320);
  state.viewer.camera.aspect = width / height;
  state.viewer.camera.updateProjectionMatrix();
  state.viewer.renderer.setSize(width, height);
}

function animateModelViewer() {
  if (!state.viewer.renderer) return;
  state.viewer.animationId = requestAnimationFrame(animateModelViewer);
  state.viewer.controls.update();
  state.viewer.renderer.render(state.viewer.scene, state.viewer.camera);
}

function renderModelViewer() {
  initModelViewer();
  renderModelLegend();

  if (!state.viewer.group) return;
  state.viewer.selected = null;
  elements.modelSelection.textContent = 'Nenhum objeto selecionado.';

  const objects = state.files.flatMap((file) => file.objects.map((object) => ({ file, object })));
  elements.modelEmpty.hidden = state.files.length > 0;

  if (state.files.length === 0) {
    clearViewerGroup();
    state.viewer.realModels = [];
    state.viewer.modelSignature = '';
    elements.modelEmpty.textContent = 'Carregue um arquivo IFC para visualizar o modelo.';
    return;
  }

  const signature = state.files.map((file) => `${file.id}:${file.size}`).join('|');
  if (state.viewer.realModels.length > 0 && state.viewer.modelSignature === signature) {
    applyAuditColorsToRealModels();
    return;
  }

  if (state.viewer.realModels.length > 0 && state.viewer.modelSignature !== signature) {
    resetViewerModels();
  }

  renderFallbackModelViewer(objects);
  loadRealIfcModels();
}

function renderFallbackModelViewer(objects) {
  clearViewerGroup();
  elements.modelEmpty.hidden = objects.length > 0;
  if (objects.length === 0) return;

  const severityByObject = buildObjectSeverityMap();
  const visibleObjects = objects.slice(0, MAX_VIEWER_OBJECTS);
  const columns = Math.ceil(Math.sqrt(visibleObjects.length));
  const spacing = 5.2;
  const offset = ((columns - 1) * spacing) / 2;

  visibleObjects.forEach(({ file, object }, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const status = state.audit
      ? severityByObject.get(objectKey(file.id, object.id)) || { severity: 'approved', reason: 'Aprovado' }
      : { severity: 'neutral', reason: 'Sem auditoria' };
    const size = viewerObjectSize(object.entity);
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(severityColor(status.severity)),
      roughness: 0.62,
      metalness: 0.04,
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(column * spacing - offset, size.height / 2, row * spacing - offset);
    mesh.userData = {
      fileName: file.name,
      entity: object.entity,
      objectName: object.name || `#${object.id}`,
      objectId: object.id,
      severity: status.severity,
      reason: status.reason,
    };

    state.viewer.group.add(mesh);
  });

  fitViewerCamera(visibleObjects.length, columns, spacing);
  elements.modelSelection.textContent = 'RepresentaÃ§Ã£o simplificada exibida enquanto a geometria IFC real Ã© gerada.';
}

async function loadRealIfcModels() {
  initModelViewer();
  if (!state.viewer.ifcLoader || state.files.length === 0) return;

  const signature = state.files.map((file) => `${file.id}:${file.size}`).join('|');
  if (state.viewer.modelSignature === signature || state.viewer.loadingSignature === signature) return;

  state.viewer.loadingSignature = signature;
  state.viewer.status = 'Gerando geometria IFC real...';
  elements.modelEmpty.hidden = false;
  elements.modelEmpty.textContent = state.viewer.status;
  elements.modelSelection.textContent = 'Convertendo IFC para geometria 3D real no navegador.';

  try {
    disposeRealModels();
    clearViewerGroup();

    const realModels = [];
    for (const file of state.files) {
      if (!file.buffer) continue;
      const model = await state.viewer.ifcLoader.parse(file.buffer.slice(0));
      model.name = file.name;
      model.userData = {
        fileId: file.id,
        fileName: file.name,
        isIfcModel: true,
      };
      normalizeIfcModelMaterial(model, state.audit ? 'approved' : 'neutral');
      state.viewer.group.add(model);
      realModels.push({ fileId: file.id, fileName: file.name, model });
    }

    state.viewer.realModels = realModels;
    state.viewer.modelSignature = signature;
    state.viewer.loadingSignature = '';
    elements.modelEmpty.hidden = realModels.length > 0;
    elements.modelSelection.textContent = realModels.length > 0
      ? 'Modelo IFC real carregado. Clique na geometria para identificar o elemento.'
      : 'NÃ£o foi possÃ­vel gerar geometria IFC real para os arquivos carregados.';
    fitGroupToCamera(state.viewer.group);
    applyAuditColorsToRealModels();
  } catch (error) {
    console.error(error);
    state.viewer.realModels = [];
    state.viewer.modelSignature = '';
    state.viewer.loadingSignature = '';
    elements.modelEmpty.hidden = true;
    elements.modelSelection.textContent = 'NÃ£o foi possÃ­vel converter a geometria IFC real; mantendo a representaÃ§Ã£o simplificada.';
    renderFallbackModelViewer(state.files.flatMap((file) => file.objects.map((object) => ({ file, object }))));
  }
}

function normalizeIfcModelMaterial(model, severity) {
  model.material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(severityColor(severity)),
    transparent: true,
    opacity: severity === 'neutral' ? 0.76 : 0.42,
    side: THREE.DoubleSide,
  });
}

function applyAuditColorsToRealModels() {
  if (state.viewer.realModels.length === 0) return;

  state.viewer.realModels.forEach(({ model }) => {
    normalizeIfcModelMaterial(model, state.audit ? 'approved' : 'neutral');
  });

  clearAuditSubsets();
  if (!state.audit) return;

  const failedIds = buildFailedIdsByFileAndSeverity();
  state.viewer.realModels.forEach(({ fileId, fileName, model }) => {
    ['low', 'medium', 'high', 'critical'].forEach((severity) => {
      const ids = failedIds.get(`${fileId}:${severity}`) || [];
      const material = state.viewer.severityMaterials[severity];
      try {
        if (ids.length > 0) {
          const subset = model.createSubset({
            ids,
            material,
            scene: state.viewer.group,
            removePrevious: true,
            customID: `audit-${severity}`,
          });
          if (subset) {
            subset.userData = {
              fileId,
              fileName,
              isIfcModel: true,
            };
          }
        }
      } catch (error) {
        console.warn(`Falha ao colorir subset ${severity}`, error);
      }
    });
  });
}

function clearAuditSubsets() {
  state.viewer.realModels.forEach(({ model }) => {
    ['low', 'medium', 'high', 'critical'].forEach((severity) => {
      try {
        model.removeSubset(state.viewer.severityMaterials[severity], `audit-${severity}`);
      } catch {
        // Alguns modelos podem ainda nÃ£o ter subsets de auditoria.
      }
    });
  });
}

function buildFailedIdsByFileAndSeverity() {
  const failedIds = new Map();
  if (!state.audit) return failedIds;

  state.audit.results
    .filter((result) => !result.passed)
    .forEach((result) => {
      result.evidence.forEach((evidence) => {
        const file = state.files.find((item) => item.name === evidence.file);
        if (!file || evidence.passed) return;
        const objects = evidence.failedObjects?.length
          ? evidence.failedObjects
          : file.objects;
        const key = `${file.id}:${result.severity}`;
        const ids = failedIds.get(key) || [];
        objects.forEach((object) => ids.push(Number(object.id)));
        failedIds.set(key, [...new Set(ids.filter(Number.isFinite))]);
      });
    });

  return failedIds;
}

function createSeverityMaterials() {
  return Object.fromEntries(['low', 'medium', 'high', 'critical'].map((severity) => [
    severity,
    new THREE.MeshLambertMaterial({
      color: new THREE.Color(severityColor(severity)),
      transparent: false,
      opacity: 1,
      side: THREE.DoubleSide,
    }),
  ]));
}

function createSelectionMaterial() {
  return new THREE.MeshLambertMaterial({
    color: new THREE.Color('#23d4ff'),
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
  });
}

function clearViewerGroup() {
  if (!state.viewer.group) return;
  while (state.viewer.group.children.length > 0) {
    const child = state.viewer.group.children[0];
    state.viewer.group.remove(child);
    disposeThreeObject(child);
  }
}

function resetViewerModels() {
  disposeRealModels();
  clearViewerGroup();
  state.viewer.modelSignature = '';
  state.viewer.loadingSignature = '';
}

function disposeRealModels() {
  clearAuditSubsets();
  clearIfcSelection();
  state.viewer.realModels.forEach(({ model }) => {
    model.removeFromParent();
    disposeThreeObject(model);
  });
  state.viewer.realModels = [];
}

function disposeThreeObject(object) {
  object.traverse?.((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        if (!isSharedViewerMaterial(material)) material.dispose?.();
      });
    } else if (!isSharedViewerMaterial(child.material)) {
      child.material?.dispose?.();
    }
  });
}

function isSharedViewerMaterial(material) {
  return Object.values(state.viewer.severityMaterials || {}).includes(material)
    || material === state.viewer.selectionMaterial;
}

function fitGroupToCamera(group) {
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDimension * 1.3;
  state.viewer.controls.target.copy(center);
  state.viewer.camera.position.set(center.x + distance, center.y + distance * 0.7, center.z + distance);
  state.viewer.camera.near = Math.max(distance / 1000, 0.1);
  state.viewer.camera.far = distance * 12;
  state.viewer.camera.updateProjectionMatrix();
  state.viewer.controls.update();
}

function viewerObjectSize(entity) {
  if (/WALL/.test(entity)) return { width: 4.8, height: 2.8, depth: 1.2 };
  if (/SLAB|ROOF|PLATE/.test(entity)) return { width: 4.2, height: 0.7, depth: 4.2 };
  if (/COLUMN|PILE/.test(entity)) return { width: 1.4, height: 5.4, depth: 1.4 };
  if (/BEAM|MEMBER/.test(entity)) return { width: 4.8, height: 1.2, depth: 1.2 };
  if (/DOOR|WINDOW/.test(entity)) return { width: 2.2, height: 2.6, depth: 0.7 };
  return { width: 2.4, height: 2.4, depth: 2.4 };
}

function fitViewerCamera(count, columns, spacing) {
  const rows = Math.ceil(count / columns);
  const span = Math.max(columns, rows) * spacing;
  state.viewer.camera.position.set(span * 0.75, Math.max(34, span * 0.58), span * 0.95);
  state.viewer.controls.target.set(0, 5, 0);
  state.viewer.controls.update();
}

function selectViewerObject(event) {
  const rect = state.viewer.renderer.domElement.getBoundingClientRect();
  state.viewer.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.viewer.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  state.viewer.raycaster.setFromCamera(state.viewer.pointer, state.viewer.camera);

  const [hit] = state.viewer.raycaster.intersectObjects(state.viewer.group.children, true);
  if (!hit) return;

  if (state.viewer.selected) {
    state.viewer.selected.material?.emissive?.setHex(0x000000);
  }

  state.viewer.selected = hit.object;
  hit.object.material?.emissive?.setHex(0x223344);

  const ifcHit = getIfcHitData(hit);
  if (ifcHit) {
    highlightIfcSelection(ifcHit);
    elements.modelSelection.innerHTML = `
      <strong>${escapeHtml(ifcHit.objectName)}</strong>
      <span>${escapeHtml(ifcHit.entity)} #${escapeHtml(ifcHit.objectId)} Â· ${escapeHtml(ifcHit.fileName)}</span>
      <span class="severity-dot ${ifcHit.severity}"></span>
      ${labelSeverity(ifcHit.severity)} Â· ${escapeHtml(ifcHit.reason)}
    `;
    return;
  }

  const data = hit.object.userData;
  if (!data?.objectName) {
    elements.modelSelection.textContent = 'Elemento IFC selecionado na geometria real.';
    return;
  }

  elements.modelSelection.innerHTML = `
    <strong>${escapeHtml(data.objectName)}</strong>
    <span>${escapeHtml(data.entity)} #${escapeHtml(data.objectId)} Â· ${escapeHtml(data.fileName)}</span>
    <span class="severity-dot ${data.severity}"></span>
    ${labelSeverity(data.severity)} Â· ${escapeHtml(data.reason)}
  `;
}

function getIfcHitData(hit) {
  const modelInfo = findRealModelInfo(hit.object);
  if (!modelInfo || typeof hit.object.getExpressId !== 'function' || hit.faceIndex === undefined) return null;

  const objectId = hit.object.getExpressId(hit.object.geometry, hit.faceIndex);
  const file = state.files.find((item) => item.id === modelInfo.fileId);
  const object = file?.objects.find((item) => Number(item.id) === Number(objectId));
  const severityByObject = buildObjectSeverityMap();
  const status = state.audit
    ? severityByObject.get(objectKey(modelInfo.fileId, String(objectId))) || { severity: 'approved', reason: 'Aprovado' }
    : { severity: 'neutral', reason: 'Sem auditoria' };

  return {
    fileId: modelInfo.fileId,
    fileName: modelInfo.fileName,
    objectId,
    entity: object?.entity || 'IFC',
    objectName: object?.name || `Elemento #${objectId}`,
    severity: status.severity,
    reason: status.reason,
  };
}

function highlightIfcSelection(selection) {
  const modelInfo = state.viewer.realModels.find((item) => item.fileId === selection.fileId);
  if (!modelInfo || !state.viewer.selectionMaterial) return;

  clearIfcSelection();
  try {
    const subset = modelInfo.model.createSubset({
      ids: [Number(selection.objectId)],
      material: state.viewer.selectionMaterial,
      scene: state.viewer.group,
      removePrevious: true,
      customID: 'selection',
    });
    if (subset) {
      subset.userData = {
        fileId: selection.fileId,
        fileName: selection.fileName,
        isIfcModel: true,
      };
    }
    state.viewer.selectedIfc = {
      fileId: selection.fileId,
      objectId: Number(selection.objectId),
    };
  } catch (error) {
    console.warn('Falha ao destacar elemento IFC selecionado', error);
  }
}

function clearIfcSelection() {
  state.viewer.realModels.forEach(({ model }) => {
    try {
      model.removeSubset(state.viewer.selectionMaterial, 'selection');
    } catch {
      // Alguns modelos podem ainda nÃ£o ter subset de seleÃ§Ã£o.
    }
  });
  state.viewer.selectedIfc = null;
}

function findRealModelInfo(object) {
  let current = object;
  while (current) {
    if (current.userData?.isIfcModel) return current.userData;
    current = current.parent;
  }
  return null;
}

function buildObjectSeverityMap() {
  const map = new Map();
  if (!state.audit) return map;

  state.audit.results
    .filter((result) => !result.passed)
    .forEach((result) => {
      result.evidence.forEach((evidence) => {
        const file = state.files.find((item) => item.name === evidence.file);
        if (!file || evidence.passed) return;

        if (evidence.failedObjects?.length) {
          evidence.failedObjects.forEach((object) => {
            assignObjectSeverity(map, objectKey(file.id, object.id), result.severity, result.name);
          });
          return;
        }

        file.objects.forEach((object) => {
          assignObjectSeverity(map, objectKey(file.id, object.id), result.severity, result.name);
        });
      });
    });

  return map;
}

function assignObjectSeverity(map, key, severity, reason) {
  const current = map.get(key);
  if (!current || severityRank(severity) > severityRank(current.severity)) {
    map.set(key, { severity, reason });
  }
}

function objectKey(fileId, objectId) {
  return `${fileId}:${objectId}`;
}

function renderModelLegend() {
  if (!elements.modelLegend) return;
  elements.modelLegend.innerHTML = ['approved', 'low', 'medium', 'high', 'critical']
    .map((severity) => `<span><i style="background:${severityColor(severity)}"></i>${labelSeverity(severity)}</span>`)
    .join('');
}

function renderDashboard() {
  const audit = state.audit;
  elements.kpiScore.textContent = audit ? `${audit.score}%` : '0%';
  elements.kpiPassed.textContent = audit?.passed ?? 0;
  elements.kpiFailed.textContent = audit?.failed ?? 0;
  elements.kpiFiles.textContent = state.files.length;

  elements.downloadJson.disabled = !audit;
  elements.downloadCsv.disabled = !audit;
  elements.downloadHtml.disabled = !audit;

  renderChart(audit?.results ?? []);
  renderDonut(audit);
  renderTable(audit?.results ?? []);
}

function renderChart(results) {
  const canvas = elements.criteriaChart;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#65738a';
  context.font = '16px sans-serif';

  if (results.length === 0) {
    context.fillText('Sem dados de auditoria.', 24, 48);
    return;
  }

  const max = Math.max(...results.map((result) => result.total), 1);
  const barHeight = 28;
  const gap = 18;
  const left = 190;

  results.forEach((result, index) => {
    const y = 28 + index * (barHeight + gap);
    const width = Math.max(12, (result.total / max) * (canvas.width - left - 36));
    context.fillStyle = '#162033';
    context.fillText(truncate(result.name, 24), 16, y + 20);
    context.fillStyle = severityColor(result.severity);
    context.fillRect(left, y, width, barHeight);
    context.fillStyle = '#162033';
    context.fillText(String(result.total), left + width + 10, y + 20);
  });
}

function renderDonut(audit) {
  const score = audit?.score ?? 0;
  elements.statusDonut.style.setProperty('--passed', `${score * 3.6}deg`);
  elements.statusDonut.dataset.label = `${score}%`;
}

function renderTable(results) {
  if (results.length === 0) {
    elements.auditTable.innerHTML = '<tr><td colspan="5">Execute a auditoria para visualizar o relatÃ³rio.</td></tr>';
    return;
  }

  elements.auditTable.innerHTML = results.map((result) => `
    <tr>
      <td>${escapeHtml(result.name)}</td>
      <td>${result.type}</td>
      <td>${escapeHtml(result.target)}</td>
      <td><span class="badge ${result.severity}">${result.passed ? 'Aprovado' : labelSeverity(result.severity)}</span></td>
      <td>${escapeHtml(result.message)}<br><small>${escapeHtml(formatEvidence(result.evidence))}</small></td>
    </tr>
  `).join('');
}

function renderAll() {
  renderUploadProgress();
  renderSavedChecklists();
  renderCriteriaComposer();
  renderFileList();
  renderCriteriaList();
  renderFederation();
  renderDashboard();
}

function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportCsv() {
  const rows = [
    ['criterio', 'tipo', 'alvo', 'status', 'severidade', 'ocorrencias', 'evidencia'],
    ...state.audit.results.map((result) => [
      result.name,
      result.type,
      result.target,
      result.passed ? 'aprovado' : 'reprovado',
      labelSeverity(result.severity),
      result.total,
      formatEvidence(result.evidence),
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  download('relatorio-auditoria-ifc.csv', csv, 'text/csv');
}

function exportHtml() {
  const report = document.querySelector('#dashboard').cloneNode(true);
  report.querySelectorAll('button').forEach((button) => button.remove());
  const html = `<!doctype html><html lang="pt-BR"><meta charset="UTF-8"><title>RelatÃ³rio IFC</title>
    <link rel="stylesheet" href="src/styles.css"><body>${report.outerHTML}</body></html>`;
  download('relatorio-auditoria-ifc.html', html, 'text/html');
}

function formatEvidence(evidence) {
  return evidence.map((item) => {
    const base = item.applicable === undefined
      ? `${item.file}: ${item.count}`
      : `${item.file}: ${item.count}/${item.applicable} aderentes`;
    const failures = item.failures?.length ? ` Â· exemplos: ${item.failures.join('; ')}` : '';

    return `${base}${failures}`;
  }).join(' | ');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}â€¦` : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


async function importCriteriaFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  const imported = ['xlsx', 'xls'].includes(extension)
    ? await parseCriteriaXlsx(file)
    : extension === 'csv'
      ? parseCriteriaCsv(await file.text())
      : parseCriteriaJson(await file.text());
  if (imported.project) {
    state.project = {
      name: imported.project.name || state.project.name,
      type: imported.project.type || state.project.type,
      checklistName: imported.project.checklistName || imported.project.name || state.project.checklistName,
    };
    elements.projectName.value = state.project.name;
    elements.projectType.value = state.project.type;
    elements.checklistName.value = state.project.checklistName;
  } else {
    syncProjectFromForm();
  }

  const importedCriteria = imported.criteria.map((criterion) => cloneCriterion(criterion, {
    projectType: criterion.projectType || state.project.type,
    source: file.name,
  }));
  state.criteriaLibrary = importedCriteria;
  state.matrixSource = file.name;
  const criteriaForSelectedType = importedCriteria.filter((criterion) => (
    !criterion.projectType
    || criterion.projectType === state.project.type
    || criterion.projectType === 'coordenacao'
    || criterion.projectType === 'todos'
  ));

  state.criteria = criteriaForSelectedType.length > 0 ? criteriaForSelectedType : importedCriteria;
  state.audit = null;
  renderAll();
}

async function parseCriteriaXlsx(file) {
  const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const [firstSheetName] = workbook.SheetNames;
  if (!firstSheetName) return { criteria: [] };
  const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName], { FS: ';' });
  return parseCriteriaCsv(csv);
}

function parseCriteriaJson(text) {
  const imported = JSON.parse(text);
  return {
    project: imported.project,
    criteria: Array.isArray(imported) ? imported : imported.criteria ?? [],
  };
}

function parseCriteriaCsv(text) {
  const [headerRow, ...rows] = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (!headerRow) return { criteria: [] };
  const headers = headerRow.map(normalizeHeader);
  const criteria = rows.map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? '']));
    return {
      name: record.name,
      type: record.type,
      target: record.target,
      pattern: record.pattern,
      threshold: record.threshold,
      projectType: record.projectType,
      category: record.category,
      severity: record.severity,
      fileName: record.fileName,
      source: record.source,
    };
  }).filter((criterion) => criterion.name);

  return { criteria };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeHeader(header) {
  const normalized = header.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const aliases = {
    criterio: 'name',
    item: 'name',
    nome: 'name',
    name: 'name',
    tipodeverificacao: 'type',
    tipo: 'type',
    type: 'type',
    alvo: 'target',
    target: 'target',
    filtro: 'target',
    padrao: 'pattern',
    pattern: 'pattern',
    regex: 'pattern',
    minimo: 'threshold',
    limite: 'threshold',
    percentual: 'threshold',
    threshold: 'threshold',
    tipodeprojeto: 'projectType',
    projecttype: 'projectType',
    disciplina: 'category',
    categoria: 'category',
    grupo: 'category',
    severidade: 'severity',
    criticidade: 'severity',
    risco: 'severity',
    severity: 'severity',
    arquivo: 'fileName',
    filename: 'fileName',
    file: 'fileName',
    modelo: 'fileName',
    fonte: 'source',
    source: 'source',
  };
  return aliases[normalized] || normalized;
}


elements.ifcFiles.addEventListener('change', async (event) => {
  await handleIfcFiles(event.target.files);
  event.target.value = '';
});
elements.dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  elements.dropZone.classList.add('dragging');
});
elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('dragging'));
elements.dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove('dragging');
  handleIfcFiles(event.dataTransfer.files);
});

elements.criteriaForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const targetSelect = document.querySelector('#criterionTarget');
  const selectedTarget = targetSelect.selectedOptions[0];
  addCriterion({
    name: document.querySelector('#criterionName').value,
    type: document.querySelector('#criterionType').value,
    target: targetSelect.value,
    pattern: document.querySelector('#criterionPattern').value,
    threshold: document.querySelector('#criterionThreshold').value,
    category: document.querySelector('#criterionCategory').value,
    severity: document.querySelector('#criterionSeverity').value,
    fileScope: selectedTarget?.dataset.fileScope || '',
    fileName: selectedTarget?.dataset.fileName || '',
    projectType: elements.projectType.value,
  });
  elements.criteriaForm.reset();
  document.querySelector('#criterionThreshold').value = 1;
  document.querySelector('#criterionSeverity').value = 'medium';
  renderCriteriaComposer();
});

elements.criteriaFile.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  await importCriteriaFile(file);
  event.target.value = '';
});

elements.criterionTemplate.addEventListener('change', () => {
  const templates = criteriaLibraryForSelectedProject();
  const template = templates[Number(elements.criterionTemplate.value)];
  if (!template) return;

  document.querySelector('#criterionName').value = template.name;
  document.querySelector('#criterionType').value = template.type;
  document.querySelector('#criterionPattern').value = template.pattern || '';
  document.querySelector('#criterionThreshold').value = template.threshold || 1;
  document.querySelector('#criterionSeverity').value = normalizeSeverity(template.severity);

  renderCategoryOptions();
  const categorySelect = document.querySelector('#criterionCategory');
  if (template.category && [...categorySelect.options].some((option) => option.value === template.category)) {
    categorySelect.value = template.category;
  }

  renderTargetOptions();
  const targetSelect = document.querySelector('#criterionTarget');
  const targetOption = [...targetSelect.options].find((option) => option.value === template.target);
  if (targetOption) {
    targetSelect.value = template.target;
  }
});

elements.projectName.addEventListener('input', syncProjectFromForm);
elements.projectType.addEventListener('change', () => {
  syncProjectFromForm();
  renderCriteriaComposer();
});
elements.checklistName.addEventListener('input', syncProjectFromForm);
elements.loadByProjectType.addEventListener('click', loadCriteriaByProjectType);
elements.saveChecklist.addEventListener('click', saveCurrentChecklist);
elements.loadSavedChecklist.addEventListener('click', applySavedChecklist);
elements.deleteSavedChecklist.addEventListener('click', deleteSavedChecklist);
elements.exportChecklist.addEventListener('click', exportCurrentChecklist);

elements.loadSample.addEventListener('click', loadCriteriaByProjectType);
elements.runAudit.addEventListener('click', runAudit);
elements.downloadFederated.addEventListener('click', () => {
  download('modelo-federado.ifc', buildFederatedModel().content, 'application/x-step');
});
elements.downloadJson.addEventListener('click', () => {
  download('relatorio-auditoria-ifc.json', JSON.stringify(state.audit, null, 2), 'application/json');
});
elements.downloadCsv.addEventListener('click', exportCsv);
elements.downloadHtml.addEventListener('click', exportHtml);

document.addEventListener('click', (event) => {
  const removeFileId = event.target.dataset?.removeFile;
  const removeCriterionId = event.target.dataset?.removeCriterion;
  const viewerAction = event.target.dataset?.viewerAction;
  if (removeFileId) removeFile(removeFileId);
  if (removeCriterionId) removeCriterion(removeCriterionId);
  if (viewerAction) {
    if (viewerAction === 'orbit' || viewerAction === 'pan') setViewerMode(viewerAction);
    if (viewerAction === 'zoom-in') zoomViewer(0.78);
    if (viewerAction === 'zoom-out') zoomViewer(1.28);
    if (viewerAction === 'fit') fitViewerToScene();
    if (viewerAction === 'reset') resetViewerCamera();
  }
});

renderAll();
