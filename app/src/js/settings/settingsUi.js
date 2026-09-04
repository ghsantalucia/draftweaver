/**
 * @file Responsável pelos eventos e comportamentos da interface do Menu de Configurações (Settings Drawer).
 */

/**
 * Abre a gaveta de configurações.
 */
export function openSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  drawer?.classList.add('open');
  drawerOverlay?.classList.remove('hidden');
}

/**
 * Fecha a gaveta de configurações.
 */
export function closeSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  drawer?.classList.remove('open');
  drawerOverlay?.classList.add('hidden');
}

/**
 * Registra os ouvintes de evento para os botões do menu de configurações.
 */
export function initSettingsEvents() {
  const btnOpenMenu = document.getElementById('btn-open-menu');
  const btnCloseMenu = document.getElementById('btn-close-menu');
  const drawerOverlay = document.getElementById('drawer-overlay');

  if (btnOpenMenu) btnOpenMenu.addEventListener('click', openSettingsDrawer);
  if (btnCloseMenu) btnCloseMenu.addEventListener('click', closeSettingsDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeSettingsDrawer);
}