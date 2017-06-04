# Correr

Instalar dependências:

```
npm install
```

Iniciar um servidor local:

```
python -m http.server 8888
```
ou
```
python -m SimpleHTTPServer 8888
```

Abrir num browser a página inicial: `index.html`

# Geração de dados

A aplicação necessita de sejam gerados objectos JSON com os dados de pacientes.

Correr `data/templates/build.sh`.

# Documentação

Consultar `docs/HACKING.pdf`.

Para compilar, basta correr `docs/build.sh`.

Dependências:

```
npm install markdown-pdf
plantuml
```
