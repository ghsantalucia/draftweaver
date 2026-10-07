// Importa o Font Awesome via JS para que o Vite processe todas as fontes .woff2 automaticamente
import "@fortawesome/fontawesome-free/css/all.min.css";

// Importa os estilos CSS locais (a rota parte da pasta src/renderer/)
import "./assets/css/main.css";

// Importa e inicializa o script principal da interface
import "./app.js";

// Transmite eventos do FileWatcher para o DomainBus
import { domainBus } from "./events/domainBus.js";

window.api.onFileWatcher((eventType, data) => {
  domainBus.emit(`fs:${eventType}`, data);
  // console.log(`[DomainBus] Evento de disco capturado: fs:${eventType}`, data);
});

console.log("[RENDERER]");
