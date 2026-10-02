# Padrão de Nomenclatura e Arquitetura de Eventos

Este documento define a taxonomia oficial para o barramento de eventos (`uiBus` e `domainBus`) do projeto. O objetivo é garantir o desacoplamento total entre componentes de UI, controllers e serviços, mantendo a previsibilidade do fluxo de dados e o isolamento de responsabilidades.

---

## 1. Categorias de Eventos

O barramento de eventos opera estritamente sob três categorias fundamentais:

### A. Intenção / Ordem (`sujeito:ordem`)

- **Propósito:** Expressa uma ação originada por um componente ou entidade que deseja que algo seja feito, sem esperar retorno direto de dados na mesma chamada (Fire-and-Forget).
- **Definição dos Termos:** O _sujeito_ é o ator ou componente gerador da ação (ex: `editor`, `explorer`, `user`), seguido pela _ordem_ em verbo imperativo ou infinitivo.
- **Exemplos:**
  - `editor:open-file` (O explorer ou o editor solicita a abertura de um arquivo).
  - `sidebar:toggle` (Ordem para alternar o estado da sidebar).

### B. Requisição / Resposta (`objeto:req:atributo` e `objeto:res:atributo`)

- **Propósito:** Utilizado para operações assíncronas do tipo Request-Response onde a UI ou um handler precisa buscar dados processados pelo backend/serviço através do barramento, mantendo o componente desacoplado de arquivos de serviço.
- **Definição dos Termos:** O _objeto_ representa a entidade de domínio manipulada (ex: `books`, `file`, `config`), seguido pelo canal de tráfego (`req` para solicitação, `res` para entrega) e o _atributo_ ou ação específica.
- **Exemplos:**
  - `books:req:fetch-list` (Solicita a listagem de livros).
  - `books:res:fetch-list` (Retorna a listagem de livros obtida).
  - `file:req:content` / `file:res:content` (Busca e entrega o conteúdo de um arquivo).

### C. Notificação / Status (`objeto|sujeito:status`)

- **Propósito:** Informa a quem estiver ouvindo que um estado mudou no sistema. É um aviso unidirecional de broadcast para que componentes interessados reajam visualmente (ex: atualizar UI, trocar temas, exibir toasts).
- **Definição dos Termos:** O prefixo indica o _objeto_ ou _sujeito_ que sofreu a alteração ou gerou o aviso, seguido pelo _status_ ou evento ocorrido.
- **Exemplos:**
  - `book:selected` (Informa que o livro atual mudou).
  - `temp-file:saved` (Avisa que um arquivo temporário foi gravado com sucesso).
  - `theme:changed` (Notifica a alteração do tema global da aplicação).

---

## 2. Diretrizes de Implementação

1. **Componentes de UI são "burros":** Componentes nunca importam ou chamam serviços diretamente. Eles apenas emitem **Intenções** (`sujeito:ordem`) ou **Requisições** (`objeto:req:...`), e escutam **Respostas** ou **Notificações**.
2. **Controllers como Orquestradores:** Os controllers e handlers escutam as intenções e requisições, interagem com as camadas de serviço (ou Electron API) e disparam as respostas ou notificações correspondentes no barramento.
3. **Prevenção de Conflitos (Race Conditions):** Sempre que utilizar o fluxo de `req`/`res`, garanta o uso de identificadores de correlação (`requestId`) no payload se houver possibilidade de múltiplos componentes solicitarem o mesmo recurso simultaneamente.
