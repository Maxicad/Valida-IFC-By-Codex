# API Specification

## Disponível

GET /api/health

Retorna o estado da API e o caminho do armazenamento local de histórico.

POST /api/ifc/precheck

Executa o pre-check técnico do conteúdo IFC enviado em JSON ou corpo bruto.

GET /api/validations

Lista o histórico salvo de validações.

GET /api/validations/:id

Retorna uma validação salva pelo ID.

POST /api/validations

Salva o relatório atual da auditoria no histórico local.

## Planejado

POST /api/ifc/upload
POST /api/ifc/process
GET /api/reports/:id
