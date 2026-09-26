/**
 * @file Gerencia as animações da interface do usuário
 */

import { gsap } from 'gsap';

// BOTÃO SALVAR

// Módulo de Animação do Botão Salvar via GSAP
export function initSaveButtonAnimation() {
  const btn = document.getElementById('btn-save');
  if (!btn) return;

  // Animação ociosa contínua do fundo etéreo
  gsap.to(btn, {
    backgroundPosition: '-300% 0%',
    duration: 7,
    repeat: -1,
    ease: 'none'
  });

  // 2. CRESCER AO PRESSIONAR (mousedown)
  btn.addEventListener('mousedown', () => {
    gsap.to(btn, {
      scale: 1.08,
      boxShadow: '0px 0px 20px rgba(96, 165, 250, 0.5)',
      duration: 0.35,              // Transição suave para expandir
      ease: 'power2.out',
      overwrite: 'auto'
    });
  });

  // 3. REDUZIR AO SOLTAR O CLIQUE OU SAIR DO BOTÃO (mouseup / mouseleave)
  const shrinkButton = () => {
    gsap.to(btn, {
      scale: 1,
      boxShadow: '0px 0px 0px rgba(0, 0, 0, 0)',
      duration: 0.45,              // Desaceleração macia ao voltar ao normal
      ease: 'back.out(1.2)',       // Retorno suave com física amortecida
      overwrite: 'auto'
    });
  };

  btn.addEventListener('mouseup', shrinkButton);
  btn.addEventListener('mouseleave', shrinkButton);
}