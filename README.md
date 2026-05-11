# IFC Auditoria - teste na nuvem

Interface estatica para testar arquivos IFC no navegador.

## O que faz

- Carrega um ou mais arquivos `.ifc`.
- Mostra progresso de carregamento.
- Renderiza geometria IFC real usando `three`, `web-ifc` e `web-ifc-three`.
- Permite orbit, pan, zoom, enquadrar e clique nos objetos.
- Executa o criterio simples: paredes `IFCWALL` / `IFCWALLSTANDARDCASE` devem estar vinculadas a `IFCBUILDINGSTOREY`.

## GitHub Pages

O workflow em `.github/workflows/pages.yml` publica o conteudo estatico do branch `main` no GitHub Pages.

Se Pages estiver habilitado para GitHub Actions, a URL sera exibida na aba **Actions** depois do deploy.
