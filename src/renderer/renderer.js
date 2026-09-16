/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

/**
 * Ponto de entrada da interface de usuário gerenciado pelo Vite.
 * Importa folhas de estilo locais e o módulo de orquestração do frontend.
 */

// Importa o Font Awesome via JS para que o Vite processe todas as fontes .woff2 automaticamente
import '@fortawesome/fontawesome-free/css/all.min.css';

// Importa os estilos CSS locais (a rota parte da pasta src/renderer/)
import './assets/css/main.css';

// Importa e inicializa o script principal da interface
import './js/app.js';


// console.log('👋 This message is being logged by "renderer.js", included via Vite');
