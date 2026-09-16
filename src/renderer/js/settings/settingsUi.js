/**
 * @file Responsável pelos eventos e comportamentos da interface do Menu de Configurações (Settings Drawer).
 */

import { toggleAppOverlay } from '../utils/helpers.js'; // Ajuste o caminho do import conforme necessário

/**
 * Abre a gaveta de configurações.
 */
export function openSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  drawer?.classList.add('open');
  
  // Aciona o overlay global usando a chave 'settings-drawer'
  toggleAppOverlay(true, 'settings-drawer');
}

/**
 * Fecha a gaveta de configurações.
 */
export function closeSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  drawer?.classList.remove('open');
  
  // Remove a chave 'settings-drawer' da pilha do overlay global
  toggleAppOverlay(false, 'settings-drawer');
}

/**
 * Registra os ouvintes de evento para os botões do menu de configurações.
 */
export function initSettingsEvents() {
  const btnOpenMenu = document.getElementById('btn-open-menu');
  const btnCloseMenu = document.getElementById('btn-close-menu');
  const globalOverlay = document.getElementById('app-modal-overlay');

  if (btnOpenMenu) btnOpenMenu.addEventListener('click', openSettingsDrawer);
  if (btnCloseMenu) btnCloseMenu.addEventListener('click', closeSettingsDrawer);
  
  // Ao clicar no overlay global, fecha a gaveta
  if (globalOverlay) globalOverlay.addEventListener('click', closeSettingsDrawer);
}