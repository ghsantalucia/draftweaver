# 🏷️ Especificação de Metadados — Draftweaver

Este documento estabelece o padrão de metadados utilizados na aplicação, cobrindo as configurações de pastas (`folder.yml`) e o Frontmatter dos arquivos Markdown (`.md`).

---

## 🔐 Matriz de Permissões

Tanto arquivos quanto pastas utilizam 4 chaves booleanas principais:

| Chave | Tipo | Descrição |
|---|---|---|
| `humanRead` | `boolean` | Permite exibição na interface do editor. |
| `humanWrite` | `boolean` | Permite edição direta do texto/campos pelo usuário. |
| `aiRead` | `boolean` | Inclui o item nas buscas do RAG e consultas do modelo. |
| `aiWrite` | `boolean` | Permite que a IA altere o arquivo ou sugira *diffs*. |

---

## 📁 1. Diretórios (`folder.yml`)

Cada pasta do projeto pode conter um arquivo `folder.yml` na raiz declarando regras para si e herdada por seus filhos.

```yaml
title: "Fichas de Personagens"
description: "Contém todas as informações biográficas e arcos dos personagens da obra."
advanced: false
humanRead: true
humanWrite: true
aiRead: true
aiWrite: true
```

## 📄 2. Arquivos (Frontmatter YAML)

Localizado no início dos arquivos .md, delimitado por ---.
YAML

```yaml
---
title: "Capítulo 1"
advanced: false
humanRead: true
humanWrite: true
aiRead: true
aiWrite: true
---
```

Campos dinâmicos mapeados para os formulários da Fase 2, são inseridos também no Frontmatter delimitado por ---, em pastas como Personagens e Mundo.

Estes dados podem ser editados pelo usuário por meio de um formulário/modal mas não podem ser apagados e modificados como o restante do arquivo MD. 

```yaml
data:
    name:
        title: "Nome"
        placeholder: "Nome do personagem"
        value: "Arthur"
        required: true        
    aliases:
        title: "Apelidos"
        placeholder: "Apelidos e títulos pelos quais o personagem é conhecido"
        value: "King Arthur"
        required: false        
---
```
