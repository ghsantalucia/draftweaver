# DraftWeaver

<p align="left">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
  <a href="https://www.electronjs.org"><img src="https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://vitest.dev"><img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest"></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright"></a>
  <a href="https://git-scm.com"><img src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white" alt="Git"></a>
</p>

> Editor de livros desktop assistido por inteligência artificial, estruturado para manter consistência e integridade em universos narrativos complexos. Desenvolvido com arquitetura moderna e foco em boas práticas de engenharia de software para portfólio.

## Visão Geral

O **DraftWeaver** é uma aplicação desktop nativa desenvolvida para resolver os desafios de gerenciamento de dados e continuidade textual em grandes projetos literários. A ferramenta utiliza uma arquitetura baseada no sistema de arquivos local (_file-driven_), eliminando a necessidade de bancos de dados tradicionais, e implementa um modelo flexível de integração com APIs de IA (_Bring-Your-Key_).

### Modos de Operação

- **Auxílio de Escrita:** Redação humana com suporte pontual da IA para revisão de consistência e tom.
- **Criação Guiada:** Geração estruturada de capítulos com validação e controle de prompts pelo usuário.
- **Criação Autônoma:** Execução autônoma orientada por diretrizes estratégicas e metadados estruturados.

## Arquitetura e Decisões de Projeto

O projeto foi construído seguindo rigorosos padrões de arquitetura de software para garantir escalabilidade, desacoplamento e segurança:

- **Separação de Processos (Electron):** Isolamento estrito entre o Processo Principal (_Main_), a ponte segura de comunicação (_Preload_ com _context isolation_) e a camada visual (_Renderer_).
- **Tipagem Estrita (TypeScript):** Utilização de interfaces e tipos robustos para garantir contratos seguros entre o fluxo de dados do sistema de arquivos e os componentes visuais.
- **Arquitetura Orientada a Eventos (Pub-Sub):** Utilização da biblioteca `Mitt` dividida em dois barramentos independentes (`domainBus` para regras de negócio e sistema de arquivos, e `uiBus` para intenções de interface e animações).
- **Padrão de Co-locação de Componentes:** Estruturação modular da interface onde cada componente encapsula sua lógica, templates e estilos isolados, instanciados centralmente via Inversão de Controle (IoC).
- **Estilização Moderna (Tailwind CSS):** Aplicação de classes utilitárias performáticas para consistência visual e design responsivo.
- **Monitoramento em Tempo Real:** Integração de alta performance com a biblioteca `Chokidar` no processo principal para observar alterações no sistema de arquivos e propagá-las de forma reativa para o frontend via IPC.
- **Qualidade e Testes (Vitest & Playwright):** Suporte a testes unitários e de integração rápidos com Vitest, além de testes ponta a ponta (E2E) de interface com Playwright.

## Stack Tecnológica

### Core & Desktop

- **Node.js:** Ambiente de execução base.
- **Electron (v44.2.0) & Electron Forge:** Framework para empacotamento e criação do aplicativo desktop nativo.
- **TypeScript:** Superset JavaScript com tipagem estática.
- **Vite:** _Builder_ de alta performance para compilação do processo principal e da interface.

### Interface & Frontend

- **Tailwind CSS:** Framework utilitário de estilização.
- **Handlebars:** Motor de templates para renderização modular e dinâmica.
- **Toast-UI Editor (v3.2.2):** Núcleo visual do editor Markdown.
- **GSAP (v3.15.0):** Motor de animações para transições fluidas.
- **FontAwesome:** Biblioteca de ícones vetoriais.

### Utilitários, Qualidade & Arquitetura

- **Chokidar (v5.0.0):** Observador de eventos do sistema de arquivos.
- **Mitt (v3.0.1):** Barramento leve de eventos Pub-Sub.
- **Vitest:** Framework de testes unitários.
- **Playwright:** Automação e testes E2E.
- **Prettier:** Padronização e consistência de estilo de código.

## Estrutura do Projeto

```text
.
├── forge.config.js
├── jsdoc.json
├── package.json
├── [src]
│   ├── [main]          # Processo principal (Electron, Chokidar, IPC Handlers)
│   ├── [preload]       # Ponte de segurança e isolamento de contexto (IPC)
│   └── [renderer]      # Camada visual (Components, Controllers, Events, Core, AI)
├── [books]             # Base de dados dos projetos do usuário
└── [templates]         # Templates estruturais de livros e metadados por projeto
```

## Como Executar o Projeto

### Pré-requisitos

Certifique-se de ter o **Node.js** (versão 18 ou superior) instalado em sua máquina.

### Instalação e Execução

1. Clone o repositório:

```bash
git clone https://github.com/ghsantalucia/draftweaver.git
```

2. Acesse a pasta do projeto:

```bash
cd draftweaver
```

3. Instale as dependências:

```bash
npm install
```

4. Execute a aplicação em modo de desenvolvimento:

```bash
npm start
```

## Licença

Distribuído sob a licença ISC. Consulte o arquivo [LICENCE](LICENCE) para mais detalhes.
