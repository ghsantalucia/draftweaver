# 🏛️ Arquitetura do Sistema — Draftweaver

O **Draftweaver** é uma plataforma de escrita literária orientada por dados estruturados e assistida por IA. O projeto adota uma arquitetura desacoplada em **4 Fases (Camadas)**, garantindo que a aplicação seja funcional, estável e testável de forma independente antes de receber o motor de inteligência artificial.

---

## 📐 Visão Geral da Arquitetura

O sistema é construído sobre o ecossistema **Electron** (Node.js + Chromium), operando arquivos **Markdown (`.md`)** e **YAML** locais em disco. A separação em camadas garante que a IA atue estritamente como um cliente da aplicação, manipulando estruturas padronizadas sem ter controle direto ou irrestrito sobre a interface do usuário.

```
+-------------------------------------------------------------+
|                     FASE 1: O EDITOR                        |
|   (Interface de Usuário, ToastUI, Árvore de Arquivos, CSS)  |
+-------------------------------------------------------------+
▲
│ Leitura / Exibição
▼
+-------------------------------------------------------------+
|                    FASE 2: O FRAMEWORK                      |
| (Frontmatter YAML, Templates, Formulários, Schemas de Dados)|
+-------------------------------------------------------------+
▲
│ Dispara Eventos / Manipula Dados
▼
+-------------------------------------------------------------+
|                    FASE 3: O PIPELINE                       |
| (Gatilhos de Negócio, Validação de Consistência, Diffs)    |
+-------------------------------------------------------------+
▲
│ Executa Ações Solicitadas
▼
+-------------------------------------------------------------+
|                 FASE 4: INTEGRAÇÃO COM IA                   |
|  (Orquestração de Prompts, RAG, API Calls, Function Call)   |
+-------------------------------------------------------------+
```

---

## 🧱 As 4 Camadas do Sistema

### 1. Fase 1 — O Editor (Interface e Operação Local)
A base do projeto. É a camada responsável pela experiência visual e navegação no disco, funcionando 100% offline como um editor Markdown de alta performance.

* **Responsabilidades:**
  * Renderização WYSIWYG via Toast UI Editor.
  * Gerenciamento de temas (Modo Escuro) e animações de interface (GSAP).
  * Renderização da árvore de arquivos (`tree.js`) com suporte a nomes amigáveis.
  * Aplicação estrita de regras de visualização e bloqueio de edição baseadas nas permissões granulares (`humanRead`, `humanWrite`).
  * Manipulação de eventos do DOM (bloqueio de drag-and-drop, seleção e atalhos indisponíveis).

### 2. Fase 2 — O Framework (Estrutura de Dados do Romance)
A camada que estabelece o "contrato de dados" da obra. Organiza o livro em estruturas previsíveis utilizando metadados YAML (Frontmatter em arquivos e `folder.yml` em pastas) e modelos padronizados.

* **Responsabilidades:**
  * Provisionamento de novos projetos copiando a pasta de modelos (`editor/assets/templates/`).
  * Padronização das fichas de personagens, elementos de mundo, locais e capítulos.
  * Disponibilização de formulários visuais para alteração de propriedades no YAML (`data`) sem risco de corrupção de sintaxe pelo usuário.
  * Garantia da taxonomia de permissões (`advanced`, `title`, `humanRead`, `humanWrite`, `aiRead`, `aiWrite`).

### 3. Fase 3 — O Pipeline (Motor de Regras de Negócio)
A camada lógica que define **o que acontece quando algo muda**. Mapeia a ordem dos processos do sistema e os fluxos de sincronização sem depender diretamente da conexão com as APIs de IA.

* **Responsabilidades:**
  * **Sincronização de Estado:** Determinar quais arquivos precisam de reavaliação quando uma ficha ou capítulo é modificado.
  * **Gerenciamento de Rascunhos (`.temp`):** Isolamento de alterações em arquivos temporários antes da confirmação do usuário ou da sincronização com o sistema.
  * **Histórico e Rollback:** Controle de revisões e gestão de estados anteriores do texto.
  * **Interface de Diffs:** Mecanismo visual para apresentação de adições e remoções de texto no formato aceitar/rejeitar por blocos.
  * **Acompanhamento de Arcos e Pistas:** Manutenção da matriz de *foreshadowing* e ganchos narrativos entre capítulos.

### 4. Fase 4 — Integração com IA (Motor Executivo)
A camada responsável por conectar os modelos de linguagem (LLMs) ao Pipeline da Fase 3. A IA atua como uma operadora que consome e produz dados respeitando estritamente as permissões `aiRead` e `aiWrite`.

* **Responsabilidades:**
  * Chamadas de funções nativas (*Function Calling*) em modelos como Gemini e Claude Code.
  * **Economia de Tokens (RAG):** Consulta inteligente a índices de metadados para ler apenas os arquivos estritamente necessários onde `aiRead: true`.
  * Utilização de *Prompt Caching* para otimização de custo e tempo de resposta.
  * Resolução e sugestão de continuidade narrativa enviadas diretamente para o fluxo de Diffs do Pipeline.

---

## 🔄 Fluxos de Dados Principais

### Fluxo de Criação de Projeto
1. O usuário aciona o comando de novo projeto na Fase 1.
2. A Fase 2 lê o diretório `editor/assets/templates/default/`.
3. O sistema clona a estrutura de pastas e arquivos `.md`/`.yml` para o diretório de destino em `books/`.
4. A árvore de arquivos na Fase 1 é reconstruída e atualizada no painel lateral.

### Fluxo de Alteração e Consistência (Pipeline + IA)
1. Uma alteração ocorre em uma ficha (ex: atributo alterado no Frontmatter de um personagem).
2. A Fase 3 (Pipeline) registra a mudança e identifica quais capítulos possuem dependência desse personagem.
3. A Fase 4 (IA) é acionada via *Function Calling* enviando apenas o resumo do personagem e os capítulos afetados que permitam `aiRead: true`.
4. A IA gera propostas de ajuste em arquivos rascunho (`.temp`).
5. A Fase 3 apresenta os *diffs* na interface da Fase 1 para revisão do autor.
6. Ao aceitar, os arquivos finais são atualizados em disco via salvamento seguro.

---

## 🔒 Segurança e Integridade dos Dados

* **Desacoplamento Total:** Falhas na API de IA não afetam a escrita offline nem a integridade dos arquivos `.md` locais.
* **Leitura e Escrita Restritas:** As chaves `humanWrite: false` e `aiWrite: false` garantem proteção contra edições acidentais do usuário ou da IA em arquivos e metadados críticos.
* **Herança por Pasta (`folder.yml`):** Pastas que definem bloqueios de leitura/escrita aplicam as restrições a todo o conteúdo interno, com a regra do arquivo podendo apenas restringir ainda mais (regra mais segura sempre prevalece).
* **Arquivos Temporários:** Nenhuma alteração gerada automaticamente sobrescreve o texto original sem passar pela validação do Pipeline de rascunhos.
