/**
 * @file Gerencia as animações da interface do usuário via GSAP, incluindo efeitos em botões, transições do drawer do assistente e a renderização do fundo de estrelas em canvas.
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


// Animação do fundo estrelado
// --- Funções Auxiliares de Construção e Desenho ---
function createStars(count, width, height) {
  const stars = [];

  for (let i = 0; i < count; i++) {
    const isBrightStar = Math.random() < 0.2;
    const zFactor = isBrightStar ? Math.random() * 0.4 + 0.8 : Math.random() * 0.5 + 0.2;

    const star = {
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      x: 0,
      y: 0,
      size: isBrightStar ? Math.random() * 0.3 + 0.7 : Math.random() * 0.4 + 0.3,
      alpha: Math.random() * 0.1 + 0.05,
      maxAlpha: isBrightStar ? 1.0 : Math.random() * 0.4 + 0.5,
      zFactor
    };

    stars.push(star);

    gsap.to(star, {
      alpha: star.maxAlpha,
      duration: Math.random() * 1.4 + 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: Math.random() * 3
    });
  }

  return stars;
}
function drawStar(ctx, star, mouseX, mouseY) {
  star.x = star.baseX + (mouseX * 35 * star.zFactor);
  star.y = star.baseY + (mouseY * 35 * star.zFactor);

  ctx.beginPath();
  ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
  ctx.fill();
}
function drawShootingStar(ctx, shootingStar) {
  shootingStar.x += shootingStar.dx * shootingStar.speed;
  shootingStar.y += shootingStar.dy * shootingStar.speed;

  const tailX = shootingStar.x - shootingStar.dx * shootingStar.length;
  const tailY = shootingStar.y - shootingStar.dy * shootingStar.length;

  const gradient = ctx.createLinearGradient(
    shootingStar.x, shootingStar.y, tailX, tailY
  );
  gradient.addColorStop(0, `rgba(255, 255, 255, ${shootingStar.alpha})`);
  gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

  ctx.beginPath();
  ctx.moveTo(shootingStar.x, shootingStar.y);
  ctx.lineTo(tailX, tailY);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
// --- Função Principal ---
export function initStarryBackground() {

  const canvas = document.getElementById('ai-bg-canvas');
  const bodyContainer = document.getElementById('ai-body-container');
  if (!canvas || !bodyContainer) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;

  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  let shootingStar = null;

  // 1. Inicia o array de estrelas vazio
  let stars = [];

  function updateDimensions() {
    const prevHeight = height;
    width = canvas.width = bodyContainer.clientWidth;
    height = canvas.height = bodyContainer.clientHeight;

    // Se o container não tinha altura e agora ganhou (abriu a drawer), 
    // ou se o array ainda está vazio, gera as estrelas com a nova altura
    if (height > 0 && (stars.length === 0 || prevHeight !== height)) {
      repositionStars();
    }
  }

  function repositionStars() {
    if (stars.length === 0) {
      // Cria as estrelas pela primeira vez
      stars = createStars(250, width, height);
    } else {
      // Se já existem, só redistribui as coordenadas baseY e baseX
      stars.forEach(star => {
        star.baseX = Math.random() * width;
        star.baseY = Math.random() * height;
      });
    }
  }

  // O ResizeObserver agora vai recalcular as posições assim que a drawer abrir!
  new ResizeObserver(updateDimensions).observe(bodyContainer);

  bodyContainer.addEventListener('mousemove', (e) => {
    const rect = bodyContainer.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / (width || 1)) - 0.5;
    targetY = ((e.clientY - rect.top) / (height || 1)) - 0.5;
  });

  window.resetStarsPosition = function() {
    updateDimensions();
    if (height <= 0) return;
    repositionStars();
  };

  function spawnShootingStar() {
    if (height <= 0) return;

    shootingStar = {
      x: Math.random() * (width * 0.8),
      y: Math.random() * (height * 0.4),
      length: Math.random() * 40 + 20,
      speed: Math.random() * 8 + 6,
      alpha: 1,
      dx: Math.cos(Math.PI / 4),
      dy: Math.sin(Math.PI / 4)
    };

    gsap.to(shootingStar, {
      alpha: 0,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        shootingStar = null;
        gsap.delayedCall(Math.random() * 10 + 8, spawnShootingStar);
      }
    });
  }

  gsap.delayedCall(3, spawnShootingStar);

  function render() {
    ctx.clearRect(0, 0, width, height);

    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    stars.forEach(star => drawStar(ctx, star, mouseX, mouseY));

    if (shootingStar) {
      drawShootingStar(ctx, shootingStar);
    }
  }

  gsap.ticker.add(render);
}