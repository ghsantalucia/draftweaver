# Documentação da Classe [Component](/src/renderer/components/Component.js)

A classe Component serve como a base abstrata para todos os elementos de interface (UI) do DraftWeaver. Ela implementa o padrão de projeto Composite (para gerenciar relações de pai e filho) combinado com o padrão Template Method (para padronizar o ciclo de vida).

---

## Métodos Nativos (Gerenciados pela Classe Pai)

Estes métodos já vêm prontos na classe Component e não precisam (nem devem) ser reescritos nas classes filhas, pois controlam a infraestrutura e a ordem de execução.

**`constructor(selector, parent, templateHtml)`** \[Método Construtor]

Inicializa o seletor CSS, guarda o template HTML, define elementos de DOM como null, cria o array de children e executa o auto-registro no pai, caso ele seja fornecido.

### `setChildren(child)` \[Utilitário]

Adiciona um componente filho à lista interna this.children do componente atual (usado pelo padrão Composite).

### `init()` \[Ciclo de Vida]

O Orquestrador: Localiza o elemento no DOM, executa render(), dispara o gancho onInit(), configura os ouvintes via setupListeners() e inicia em cascata todos os filhos armazenados.

### `render()` \[Renderização]

O Motor Handlebars: Verifica se o container e o template existem, busca os dados via getContext() (ou usa {} por padrão), compila o template e injeta o HTML final no DOM.

### `setupListeners()` \[Eventos]

Método base padrão (vazio). É chamado automaticamente pelo init().

---

## Ganchos e Métodos Opcionais (Implementados pelas Classes Filhas)

Estes são os métodos que você pode (ou deve) criar nas classes que estendem Component para personalizar o comportamento delas:

### `getContext()` (Opcional)

Quando usar: Quando o seu componente precisa de dados dinâmicos para preencher o template Handlebars.

Retorno: Deve retornar um objeto JavaScript com as variáveis do template.

Exemplo:
```JavaScript

    getContext() {
      return { title: "Meu Livro", count: 5 };
    }
```

### `onInit()` (Opcional)

Quando usar: Quando você precisa executar alguma lógica específica logo após o componente ser renderizado na tela e antes de seus filhos iniciarem (ex: buscar dados em uma API, carregar estados locais).

Exemplo:
```JavaScript
    onInit() {
      console.log("O chat terminou de montar o HTML inicial!");
    }
```

### `setupListeners()` (Sobrescrita opcional)

Quando usar: Para registrar escutadores de eventos de clique, teclado ou formulários (addEventListener) nos elementos internos do componente.

Exemplo:
```JavaScript
    setupListeners() {
      const btn = this.element.querySelector('#send-btn');
      btn.addEventListener('click', () => this.handleSend());
    }
```

---

## Resumo do Fluxo de Execução de um Componente (init)

Quando o AppContainer ou um componente pai chama `.init()` em um componente:

1. Ele busca o elemento no `DOM` usando o selector.
2. Compila o template HTML injetando o contexto obtido em `getContext()`.
3. Executa o método `onInit()` (se a filha o possuir).
4. Configura todos os eventos definidos em `setupListeners()`.
5. Percorre a lista de filhos (`this.children`) e chama o `init()` de cada um deles automaticamente.