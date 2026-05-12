# Valida-IFC-By-Codex

Interface estatica para validar arquivos IFC no navegador com web-ifc e Three.js.

Site: https://maxicad.github.io/Valida-IFC-By-Codex/

## O que faz

- Carrega um ou mais arquivos `.ifc`.
- Mostra progresso de carregamento.
- Renderiza geometria IFC real usando `three` e `web-ifc`, sem upload do IFC para servidor.
- Permite orbit, pan, zoom, enquadrar e clique nos objetos.
- Inclui duas paginas comparativas de viewer para avaliacao: That Open Components e xeokit SDK.
- Permite selecionar multiplos criterios de auditoria.
- Permite solicitar verificacoes em linguagem natural com interpretacao local.
- Calcula resultado por criterio e media final ponderada.
- Colore o modelo conforme o criterio selecionado.

## IA e login

O GitHub Pages e estatico, entao nao deve guardar chave de API ou token ChatGPT no HTML. Para usar LLM com login, configure um backend seguro/OAuth e exponha na pagina:

- `window.VALIDA_IFC_AI_AUTH_URL`: URL de login.
- `window.VALIDA_IFC_AI_ENDPOINT`: endpoint que recebe `{ text, criteria }` e retorna os criterios selecionados.

Sem esse backend, o botao usa a interpretacao local por palavras-chave.

## A fazer

- Adicionar backend/conector autenticado para usar LLMs com login do usuario.
- Implementar fluxo seguro de autenticacao para ChatGPT/LLM sem expor chave de API ou token no HTML estatico.
- Conectar a solicitacao em linguagem natural ao backend quando o viewer, upload e criterios estiverem estaveis.

## Estrutura

- `index.html`: aplicacao completa, com CSS e JavaScript embutidos.
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
