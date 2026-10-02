# DraftWeaver: Memória de Arquitetura e Padrões de Projeto

Esta documentação serve como o nosso "manual de sobrevivência" e fonte única de verdade para o projeto. Escrevi este registro para consolidar o conhecimento técnico, as escolhas arquiteturais e os padrões que estamos adotando, garantindo que o contexto e a consistência do projeto se mantenham intactos independentemente dos limites de memória dos logs.

---

## 1. O Que é o DraftWeaver?

O **DraftWeaver** é um editor de livros assistido por IA, desenvolvido para manter a rigidez e a consistência em universos narrativos complexos. O aplicativo possui três modos de operação:

- **Auxílio de Escrita:** O usuário comanda a IA, que redige trechos sujeitos a revisão humana direta.
- **Criação Guiada:** A IA gera capítulo a capítulo com revisão e prompts do usuário.
- **Criação Autônoma:** A IA opera de forma autônoma do início ao fim a partir de um _prompt_ estruturado inicial.

- **Modelo "Bring-Your-Key":** A inteligência artificial não vem embutida; o usuário conecta suas próprias chaves de API. Inicialmente, focamos no **Gemini** (aproveitando seu suporte a cacheamento de contexto e _function calling_, além de tokens gratuitos de teste), mas preparamos a arquitetura para múltiplos _providers_, incluindo alternativas focadas em texto livre, como a _Puter_.
- O projeto também prioriza a eficiência de tokens e arquitetura **RAG (Retrieval-Augmented Generation)** para alimentar a IA apenas com o contexto estritamente necessário do livro.

---

## 2. Tecnologias e Ferramentas (Stack Tecnológica)

Para manter o projeto moderno e altamente profissional — visando inclusive o meu portfólio para o mercado de desenvolvimento —, adotamos a seguinte stack:

- **Node.js:** Ambiente de execução base para o ecossistema e manipulação do sistema de arquivos no processo principal.
- **Electron Forge & Electron (v44.2.0):** Framework para criar o aplicativo desktop nativo.
- **Vite:** _Bundler_ de altíssima performance usado para compilar tanto o processo principal quanto a interface (renderer).
- **Handlebars:** Motor de templates (template engine) utilizado para renderização dinâmica e modular das estruturas HTML dos componentes visuais.
- **Toast-UI Editor (v3.2.2):** O núcleo visual do editor Markdown integrado na interface.
- **Chokidar (v5.0.0):** Nosso observador (_file watcher_) de alta performance para monitorar alterações na pasta `/books` em tempo real.
- **Mitt (v3.0.1):** Biblioteca leve de _Pub-Sub_ utilizada para implementar nossos barramentos de eventos (`uiBus` e `domainBus`).
- **GSAP (v3.15.0):** Motor de animações profissional para transições fluidas e efeitos visuais na interface.
- **FontAwesome:** Biblioteca de ícones vetoriais.
- **Prettier:** Para garantir consistência visual e eliminar qualquer atrito de estilo entre os arquivos do projeto, adotamos o Prettier como formatador automático de código.

---

## 3. Arquitetura e Organização do Sistema

### Separação de Processos (Main, Preload, Renderer)

Diferente do modelo tradicional MVC monolítico, nossa aplicação opera sob o modelo de segurança e arquitetura do Electron:

- **Processo Main:** Controla o ciclo de vida da janela do app e integra o acesso direto ao sistema operacional e de arquivos (onde residem o Chokidar e os handlers IPC).
- **Processo Preload:** Atua como uma ponte segura e isolada (_context isolation_), expondo APIs estritas via IPC para o frontend sem expor o Node.js globalmente.
- **Processo Renderer:** A camada visual (frontend) onde rodam os componentes da interface.

### Arquitetura Orientada a Eventos (Pub-Sub)

Abandonamos chamadas diretas e acopladas entre funções. A comunicação do sistema flui por eventos desacoplados divididos em dois barramentos principais:

- **`domainBus`:** Gerencia fatos do sistema, dados e regras de negócio puras (ex: alterações de arquivos no disco via Chokidar).
- **`uiBus`:** Gerencia intenções do usuário, comandos visuais, animações e estados de componentes de tela.
- **Controllers e Handlers:** Atuam como intermediários inteligentes que escutam os barramentos, processam dados e despacham as ações correspondentes.

### Estrutura de Pastas baseada em Componentes e Modularidade JS

- Adotamos **ES6 Modules** nativos (`export async function ...`).
- A interface é construída seguindo o princípio de **co-locação**: cada elemento visual possui sua própria pasta isolada contendo sua classe em JS, arquivos de template HTML compilados via Handlebars, estilo em CSS isolado e estrutura própria, garantindo alta independência.
- Aplicamos o padrão de **Inversão de Controle (IoC)** que gerencia a criação de componentes em um único local em `appContainer.js`.
- O ecossistema utiliza importações diretas de CSS por componente. O CSS geral utiliza o padrão moderno com variáveis root globais (`variables.css`, `reset.css`, `global.css`).

### Persistência de Dados

- **Ausência de Banco de Dados (File-Driven):** O projeto não utiliza nenhum tipo de banco de dados tradicional. Toda a persistência de dados, estados e conteúdos é feita diretamente no sistema de arquivos local, utilizando arquivos estruturados em formato **JSON** (para configurações, metadados e árvore) e **Markdown (.md)** (para os capítulos e anotações literárias).
- **Comunicação IPC Segura:** Vale ressaltar que os eventos do Chokidar no Main chegam ao Renderer através do padrão `webContents.send` ➔ `preload.js` ➔ `ipcRenderer.on` ➔ `domainBus.emit()`, mantendo o isolamento de contexto exigido pelo Electron.

### Documentação e Padrões de Código (JSDoc)

- O projeto adota o padrão JSDoc para a documentação inline de funções, parâmetros e comportamentos em todo o código-fonte localizado na pasta /src. Essa padronização permite tanto a extração automatizada de metadados arquiteturais quanto a geração de portais web estáticos de referência de API, garantindo alta clareza na manutenção e legibilidade técnica.

---

## 4. Princípios de Engenharia Aplicados

- **Única Fonte da Verdade (Single Source of Truth):** O disco rígido (arquivos `.md` e `config.json` dentro da pasta `/books`) é a verdade absoluta do sistema. A interface apenas reflete o que o disco dita.
- **DRY (Don't Repeat Yourself):** Evitamos duplicação de código utilizando serviços utilitários reutilizáveis (como leituras padronizadas de arquivos JSON).

---

## 5. Planejamento Futuro (Roadmap Técnico)

- **Tailwind CSS:** Adoção gradual de classes utilitárias para modernizar a estilização dos componentes e coexistir de forma segura com o CSS atual.
- **Testes Automatizados:**
  - _Vitest_ para testes unitários e de integração integrados ao Vite.
  - _Playwright_ para testes end-to-end (E2E) de interface.

---
