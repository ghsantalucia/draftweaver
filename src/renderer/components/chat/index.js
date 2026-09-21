/**
 * @file Barrel do módulo Chat, exportando funções e componentes essenciais para a interface e controle da IA.
 */

export { injectMessageIntoChat, handleUserPrompt } from './chatPipeline.js';
export { loadChatHistory, saveChatMessage } from './chatStorage.js';
export {
  setupAiDrawerEvents,
  toggleAiDrawer,
  reloadChatForCurrentBook,
  renderChatMessage,
  clearChatContainer,
} from './chatUi.js';
export { initStarryBackground } from './chatAnimations.js';