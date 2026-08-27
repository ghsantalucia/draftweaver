# 🎛️ Mapeamento de Interface e Controles — Draftweaver

Este documento descreve todos os elementos interativos da interface do Draftweaver para orientação do usuário e consulta de contexto da IA.

---

## 1. Painel Lateral (Sidebar / Árvore de Arquivos)

| Elemento / Botão | Localização | Ação / Funcionalidade |
|---|---|---|
| **Seletor de Livro** (`#select-book`) | Topo da Sidebar | Abre o menu dropdown/modal para alternar entre obras em `books/`. |
| **Botão Criar Projeto** (`#btn-new-project`) | Topo da Sidebar | Abre o assistente da Fase 2 para clonar um modelo da pasta `templates/`. |
| **Engrenagem de Configurações** | Cabeçalho da Sidebar | Abre as configurações gerais do editor (tema, chave de API, preferências). |
| **Item de Pasta** (`.folder`) | Corpo da Árvore | Clique simples expande ou recolhe a pasta. |
| **Item de Arquivo** (`.file-name`) | Corpo da Árvore | Clique simples carrega o arquivo no editor central. |
| **Toggle Modo Avançado** (`#toggle-advanced`) | Rodapé da Sidebar | Exibe ou oculta os itens marcados com `advanced: true`. |

---

## 2. Editor Central (Área de Texto)

| Elemento / Botão | Localização | Ação / Funcionalidade |
|---|---|---|
| **Barra de Ferramentas** | Topo do Editor | Formatação Markdown (Negrito, Itálico, Listas, Títulos, Links). |
| **Modo Visual / Código** | Rodapé do Editor | Alterna entre a visualização WYSIWYG e o código fonte em Markdown puro. |
| **Indicador de Read-Only** | Barra de Status | Exibe um aviso quando o arquivo está com `humanWrite: false`. |

---

## 3. Modais e Formulários (Fase 2)

| Elemento / Botão | Localização | Ação / Funcionalidade |
|---|---|---|
| **Editar Dados Avançados** | Barra Superior do Documento | Abre o formulário gráfico com os campos do objeto `data` (YAML). |
| **Salvar Alterações** | Dentro dos Modais | Grava as alterações do formulário no Frontmatter sem alterar o corpo do texto. |