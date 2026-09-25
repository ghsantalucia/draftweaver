# Mini-Framework de Delegação de Eventos

Um sistema leve e desacoplado baseado em atributos declarativos e em um barramento de eventos pub/sub (`Mitt`), projetado para manter a separação estrita entre a UI e a lógica de negócios.

## Como Funciona

O script monitora globalmente o documento (`document`) para eventos comuns do DOM (`click`, `change`, `input`, `submit`, `focus`). Quando um elemento contendo um atributo `event-{tipo}` é acionado, o mini-framework intercepta a ação, extrai o contexto relevante (como dados dataset e valores de inputs) e despacha o payload para o canal correspondente no barramento de UI (`uiBus`).

## Atributos Suportados

Você pode declarar a intenção de evento diretamente no HTML usando o prefixo `event-` seguido do tipo de evento desejado:

```HTML
event-click="..."
event-change="..."
event-input="..."
event-submit="..."
event-focus="..."
```

## Exemplo de Uso no HTML
```HTML
<!-- Exemplo com um Botão de Ação -->
<button event-click="settings:open" data-id="123">Abrir Configurações</button>

<!-- Exemplo com um Checkbox (Switch) -->
<input type="checkbox" id="theme-toggle" event-change="theme:toggle">
```

## Objeto de Contexto Retornado

Quando o evento é emitido no barramento (`uiBus`), um objeto de contexto rico é repassado automaticamente para os ouvintes:

```JavaScript
{
    value: true,              // Valor extraído se for input/select (ex: .checked para checkboxes)
    data: { id: "123" },      // Todos os atributos `data-*` convertidos em objeto
    nativeEvent: PointerEvent,// O evento nativo original do navegador
    target: HTMLElement       // O elemento DOM exato que disparou a ação
}
```

## Exemplo de Uso em Componentes / Managers
```JavaScript
import { uiBus } from './events/eventUi.js';

// Ouvindo o evento disparado de forma declarativa pelo DOM
uiBus.on('theme:toggle', (context) => {
    const isDark = context.value; // true ou false
    console.log("Alternar tema para escuro?", isDark);
});
```

## Modo de Depuração (Debug)

O sistema conta com um ouvinte coringa (*) ativado por padrão para monitorar todo o fluxo de eventos em tempo real no console do navegador:
```JavaScript
[UI Debug] Evento disparado: "theme:toggle" { value: true, data: {}, ... }
```
