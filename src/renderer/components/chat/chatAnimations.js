/**
 * @file Gerencia as animações da interface do chat de IA
 */

import {gsap} from 'gsap';


/** 
 * Inicializa o canvas e o loop de renderização do fundo estrelado interativo.
 */
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

/** 
 * Cria e retorna a coleção inicial de objetos de estrelas com animações de brilho via GSAP.
 * @param {number} count - Quantidade de estrelas a serem geradas.
 * @param {number} width - Largura atual da área de renderização.
 * @param {number} height - Altura atual da área de renderização.
 */
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

/** 
 * Desenha uma estrela individual no canvas considerando o efeito de paralaxe do mouse.
 * @param {CanvasRenderingContext2D} ctx - Contexto de renderização 2D do canvas.
 * @param {Object} star - Objeto contendo as propriedades da estrela.
 * @param {number} mouseX - Posição horizontal suavizada do mouse.
 * @param {number} mouseY - Posição vertical suavizada do mouse.
 */
function drawStar(ctx, star, mouseX, mouseY) {
  star.x = star.baseX + (mouseX * 35 * star.zFactor);
  star.y = star.baseY + (mouseY * 35 * star.zFactor);

  ctx.beginPath();
  ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
  ctx.fill();
}

/** 
 * Renderiza o efeito de estrela cadente com rastro em gradiente no canvas.
 * @param {CanvasRenderingContext2D} ctx - Contexto de renderização 2D do canvas.
 * @param {Object} shootingStar - Objeto contendo as propriedades da estrela cadente.
 */
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
