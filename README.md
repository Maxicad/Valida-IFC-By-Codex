# Valida-IFC-By-Codex

Interface estatica para validar arquivos IFC no navegador com xeokit e web-ifc.

Site: https://maxicad.github.io/Valida-IFC-By-Codex/

## O que faz

- Carrega um ou mais arquivos `.ifc`.
- Executa pre-check antes do processamento, validando extensao, tamanho, cabecalho IFC e `FILE_SCHEMA`.
- Mostra progresso de carregamento.
- Exibe o schema IFC detectado no arquivo, como `IFC2x3`, `IFC4` ou `IFC4.3`.
- Renderiza geometria IFC real usando `xeokit SDK` e `web-ifc`, sem upload do IFC para servidor.
- Permite orbit, pan, zoom, enquadrar e clique nos objetos, com selecao azul no item clicado.
- Permite selecionar multiplos criterios de auditoria.
- Permite validar por criterio digitado com interpretacao local por palavras-chave.
- Relaciona qualquer criterio digitado em uma lista de verificacao chamada **Criterios customizados**, com ativar/desativar.
- Desabilita a edicao dos criterios padrao quando houver criterios customizados na lista.
- Carrega lista de criterios customizados a partir de Excel (`.xlsx`, `.xls`) ou CSV.
- Calcula resultado por criterio e media final ponderada.
- Classifica os resultados como `Error`, `Warning`, `Requirement Failure` e `Info`, com rotulos ajustados ao idioma do navegador.
- Colore o modelo conforme o criterio selecionado.
- Inclui criterio local para localizar `IfcWindow` com altura menor que 50cm.

## IA e login

O uso de LLM/ChatGPT foi removido da interface de teste por enquanto. O campo de texto atual usa apenas interpretacao local por palavras-chave.

## A fazer

- Adicionar backend/conector autenticado para usar LLMs com login do usuario.
- Implementar fluxo seguro de autenticacao para ChatGPT/LLM sem expor chave de API ou token no HTML estatico.
- Conectar a validacao por criterio digitado ao backend quando o viewer, upload e criterios estiverem estaveis.

## Estrutura

- `index.html`: aplicacao completa, com viewer principal em xeokit, CSS e JavaScript embutidos.
- `docs/`: exemplos de matriz/criterios.
- `scripts/serve-local.mjs`: servidor local simples para teste.
- `scripts/sync-to-cloud.ps1`: sincroniza alteracoes locais com o GitHub.

## Linguagens

- HTML, CSS e JavaScript no frontend estatico.
- JavaScript/Node.js no servidor local de teste.
- PowerShell no script de sincronizacao local com GitHub.

## Lista de criterios em Excel

Use uma planilha com uma coluna chamada `criterio`, `descricao`, `nome`, `titulo`, `criterion` ou `description`. Se esses cabecalhos nao existirem, o app usa a primeira celula preenchida de cada linha da primeira aba.

## Teste Local

```powershell
node scripts/serve-local.mjs
```

Abra `http://localhost:4173/`.

## GitHub Pages

O GitHub Pages publica o conteudo estatico da branch `main`, pasta `/`.

Depois de um commit local, o hook `post-commit` envia automaticamente para o GitHub.
