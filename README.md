# Valida-IFC-By-Codex

Interface estatica para validar arquivos IFC no navegador com IFC.js, Web-IFC e Three.js.

Site: https://maxicad.github.io/Valida-IFC-By-Codex/

## O que faz

- Carrega um ou mais arquivos `.ifc`.
- Mostra progresso de carregamento.
- Renderiza geometria IFC real usando `three`, `web-ifc` e `web-ifc-three`.
- Permite orbit, pan, zoom, enquadrar e clique nos objetos.
- Permite selecionar multiplos criterios de auditoria.
- Calcula resultado por criterio e media final ponderada.
- Colore o modelo conforme o criterio selecionado.

## Estrutura

- `index.html`: aplicacao completa, com CSS e JavaScript embutidos.
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
