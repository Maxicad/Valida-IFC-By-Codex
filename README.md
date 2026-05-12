# Valida-IFC-By-Codex

Interface estatica para validar arquivos IFC no navegador com xeokit e web-ifc.

Site: https://maxicad.github.io/Valida-IFC-By-Codex/

## O que faz

- Carrega um ou mais arquivos `.ifc`.
- Mostra progresso de carregamento.
- Renderiza geometria IFC real usando `xeokit SDK` e `web-ifc`, sem upload do IFC para servidor.
- Permite orbit, pan, zoom, enquadrar e clique nos objetos, com selecao azul no item clicado.
- Inclui duas paginas comparativas de viewer para avaliacao: That Open Components e xeokit SDK.
- Permite selecionar multiplos criterios de auditoria.
- Permite validar por criterio digitado com interpretacao local por palavras-chave.
- Calcula resultado por criterio e media final ponderada.
- Colore o modelo conforme o criterio selecionado.

## IA e login

O uso de LLM/ChatGPT foi removido da interface de teste por enquanto. O campo de texto atual usa apenas interpretacao local por palavras-chave.

## A fazer

- Adicionar backend/conector autenticado para usar LLMs com login do usuario.
- Implementar fluxo seguro de autenticacao para ChatGPT/LLM sem expor chave de API ou token no HTML estatico.
- Conectar a validacao por criterio digitado ao backend quando o viewer, upload e criterios estiverem estaveis.

## Estrutura

- `index.html`: aplicacao completa, com viewer principal em xeokit, CSS e JavaScript embutidos.
- `viewer-thatopen.html`: viewer experimental com That Open Components, Fragments e `web-ifc`.
- `viewer-xeokit.html`: viewer experimental com xeokit SDK e `WebIFCLoaderPlugin`.
- `docs/`: exemplos de matriz/criterios.
- `scripts/serve-local.mjs`: servidor local simples para teste.
- `scripts/sync-to-cloud.ps1`: sincroniza alteracoes locais com o GitHub.

## Teste Local

```powershell
node scripts/serve-local.mjs
```

Abra `http://localhost:4173/`.

## GitHub Pages

O GitHub Pages publica o conteudo estatico da branch `main`, pasta `/`.

Depois de um commit local, o hook `post-commit` envia automaticamente para o GitHub.
