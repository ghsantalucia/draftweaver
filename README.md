# 🖋️ Draftweaver

> **Assistente Literário e Editor Markdown Inteligente com Arquitetura Orientada à IA**

O **Draftweaver** é uma plataforma open-source desenvolvida para resolver um dos maiores desafios da escrita de romances longos e universos complexos: a **complexidade exponencial** e o risco de perder a coerência de mundo, a evolução dos personagens e a continuidade do enredo ao longo da linha do tempo.

Diferente de editores tradicionais ou ferramentas engessadas, o Draftweaver oferece um framework flexível que se adapta ao fluxo de trabalho de cada autor. Ele combina a integridade de dados via metadados estruturados com o poder de copilotos de IA, garantindo consistência narrativa automática sem limitar a liberdade criativa.

---

## 🌟 Modos de Operação

O software foi projetado para oferecer versatilidade total na criação, suportando três fluxos principais:

* **✍️ Assistente de Escrita (Humano-Centrado):** O autor redige todo o conteúdo e a IA atua como revisora de consistência, continuidade e tom.
* **🤝 Híbrido (Co-piloto):** O autor elabora a ideia ou rascunho bruto, a IA desenvolve a prosa e o humano revisa, ajusta e aprova bloco a bloco.
* **🤖 Autônomo (Geração Guiada):** O autor define as premissas, a filosofia e os arcos estratégicos, e a IA gera a estrutura e os capítulos sob supervisão de diretrizes.

---

## ✨ Principais Funcionalidades

### 📝 Editor & Navegação
* **Editor WYSIWYG Markdown:** Interface visual rica baseada em Toast UI Editor com alternância fluida entre código e visualização final.
* **Árvore de Arquivos Inteligente:** Navegação dinâmica com suporte a nomes amigáveis via YAML, herança de regras por pasta e filtro estrito para foco no texto.
* **Modo Escuro Nativo:** Layout escurinho e ajustado para longas sessões de escrita sem cansaço visual.
* **Controle de Permissões:** Proteção de arquivos críticos do sistema para leitura do usuário e IA sem risco de alterações acidentais na interface.

### 🧠 Arquitetura de Enredo & Consistência
* **Criação Progressiva de História:** Planejamento estruturado partindo da premissa e filosofia da obra até os pontos de início e fim.
* **Construção Dinâmica de Capítulos:** Os capítulos imediatos são detalhados enquanto os futuros mantêm esboços flexíveis, atualizando-se conforme a narrativa avança.
* **Matriz de Foreshadowing:** Gestão de pistas, ganchos e elementos inseridos com antecedência programada para garantir premeditação do enredo e evitar desvios aleatórios.
* **Sincronização de Lore:** Resolução de conflitos de continuidade em fichas de personagens, locais e regras de mundo quando o texto é alterado.

### ⚡ Otimização de Tokens & Bring Your Own Key (BYOK)
* **Arquitetura BYOK:** O software não possui IA embutida nem cobra assinaturas. Você utiliza a sua própria chave de API.
* **Foco em Gemini & Claude Code:** Utilização nativa de chamadas de funções (*Function Calling*) e *Prompt Caching* para reduzir custos drasticamente.
* **Índices Estruturados (RAG):** Leitura por metadados e resumos para que a IA consulte apenas os arquivos estritamente necessários, economizando tokens.
* **Suporte Futuro Ampliado:** Preparado para integração com outras APIs proprietárias e modelos auto-hospedados (como Llama).

---

## 🛠️ Tecnologias Utilizadas

* **Runtime & Desktop:** [Electron](https://www.electronjs.org/)
* **Linguagens & Estilo:** JavaScript (ES6+ Module), HTML5, CSS3 Custom Properties
* **Editor Visual:** [Toast UI Editor](https://nhn.github.io/tue.editor/)
* **Animações & UI:** GSAP (GreenSock)
* **Live Reloading (Dev):** Nodemon

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter o **Node.js** (versão 18 ou superior) instalado na sua máquina.

### Instalação (Ambiente de Desenvolvimento)

1. Clone este repositório:
```bash
   git clone [https://github.com/ghsantalucia/draftweaver.git](https://github.com/ghsantalucia/draftweaver.git)
```

Acesse a pasta do projeto:
```bash
    cd draftweaver
```

Instale as dependências:
```bash
    npm install
```

Execute a aplicação em modo de desenvolvimento:
```bash
    npm start
```

(Nota: Para usuários finais, executáveis compilados para Windows/Linux/macOS serão disponibilizados na aba de Releases das versões estáveis).

## 💖 Manifesto Open-Source

O Draftweaver é um projeto 100% de código aberto e sem fins lucrativos, nascido da paixão por literatura e tecnologia.

O objetivo não é comercializar uma ferramenta, mas construir uma base sólida e livre para a comunidade de escritores, entusiastas de worldbuilding e desenvolvedores. Toda contribuição é bem-vinda — seja enviando sugestões, reportando erros, melhorando a documentação ou submetendo Pull Requests.

Vamos juntos construir a melhor ferramenta de escrita assistida por IA!

## 📄 Licença

Distribuído sob a licença ISC. Veja LICENSE para mais informações.
