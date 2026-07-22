// components/rain-effect.js
// ─────────────────────────────────────────────
// Cleo Chang Portfolio — Hero Rain Effect
// WebGL Refraction + Canvas-stamp Rain Physics
// ─────────────────────────────────────────────
(function () {
  'use strict';

  var canvas = document.getElementById('rain-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;

  // ── Tunables ──
  var RAIN_AMOUNT = 0.4;
  var REFRACTION = 1.0;

  // ── DPR (限制最大為 2 以兼顧效能與清晰度) ──
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ── Pause / reduced motion ──
  var paused = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
  });

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  function random(from, to, interp) {
    if (from == null) { from = 0; to = 1; }
    else if (to == null) { to = from; from = 0; }
    if (typeof to === 'function') { interp = to; to = from; from = 0; }
    var delta = to - from;
    if (!interp) interp = function(n) { return n; };
    return from + (interp(Math.random()) * delta);
  }

  function chance(c) { return Math.random() <= c; }

  function createCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // ═══════════════════════════════════════════════
  // PROCEDURAL DROP TEXTURE GENERATION
  // ═══════════════════════════════════════════════

  var dropSize = 64;

  function generateDropAlpha(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var imgData = ctx.createImageData(size, size);
    var d = imgData.data;
    var cx = size / 2, cy = size / 2;

    for (var py = 0; py < size; py++) {
      for (var px = 0; px < size; px++) {
        var dx = (px - cx) / cx;
        var dy = (py - cy) / cy;
        dy *= 1.0 + dy * 0.15;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) continue;

        var alpha = Math.max(0, 1.0 - Math.pow(dist / 0.35, 6)) * 255;
        var idx = (py * size + px) * 4;
        d[idx] = d[idx + 1] = d[idx + 2] = 255;
        d[idx + 3] = Math.round(Math.min(255, Math.max(0, alpha)));
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  function generateDropColor(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var imgData = ctx.createImageData(size, size);
    var d = imgData.data;
    var cx = size / 2, cy = size / 2;

    for (var py = 0; py < size; py++) {
      for (var px = 0; px < size; px++) {
        var dx = (px - cx) / cx;
        var dy = (py - cy) / cy;
        dy *= 1.0 + dy * 0.15;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) continue;

        var nx = dist > 0.001 ? dx / dist : 0;
        var ny = dist > 0.001 ? dy / dist : 0;
        var strength = dist;

        var r = Math.round(ny * 60 * strength + 128);
        var g = Math.round(nx * 60 * strength + 128);
        var depth = Math.sqrt(Math.max(0, 1.0 - dist * dist)) * 255;

        var idx = (py * size + px) * 4;
        d[idx] = Math.max(0, Math.min(255, r));
        d[idx + 1] = Math.max(0, Math.min(255, g));
        d[idx + 2] = Math.round(depth);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  var dropAlphaTex = generateDropAlpha(dropSize);
  var dropColorTex = generateDropColor(dropSize);

  // ═══════════════════════════════════════════════
  // SAGE 配色背景產生器 (模擬原 index.html 的淡綠配色與 Blob)
  // ═══════════════════════════════════════════════

  function generateSageBg(w, h, blurPx) {
    var c = createCanvas(w, h);
    var ctx = c.getContext('2d');

    // 1. 滿塗柔亮米白背景色 #FAF9F6
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);

    // 2. 模擬網頁 floating blobs，繪製淡綠色 #A8B8A5 的大模糊圓
    // blob 1 (偏左上)
    var g1 = ctx.createRadialGradient(w * 0.15, h * 0.15, 0, w * 0.15, h * 0.15, w * 0.45);
    g1.addColorStop(0, 'rgba(168, 184, 165, 0.4)');
    g1.addColorStop(1, 'rgba(168, 184, 165, 0)');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.arc(w * 0.15, h * 0.15, w * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // blob 2 (偏右下)
    var g2 = ctx.createRadialGradient(w * 0.85, h * 0.85, 0, w * 0.85, h * 0.85, w * 0.45);
    g2.addColorStop(0, 'rgba(168, 184, 165, 0.4)');
    g2.addColorStop(1, 'rgba(168, 184, 165, 0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.85, w * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (blurPx > 0) {
      var tmp = createCanvas(w, h);
      var tctx = tmp.getContext('2d');
      tctx.drawImage(c, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.filter = 'blur(' + blurPx + 'px)';
      ctx.drawImage(tmp, 0, 0);
      ctx.filter = 'none';
    }
    return c;
  }

  // 預設比例下的背景 Canvas (會隨 resize 動態更新)
  var textureFgCanvas = generateSageBg(96, 64, 1);
  var textureBgCanvas = generateSageBg(384, 256, 4);

  // ═══════════════════════════════════════════════
  // DROP GRAPHICS — Canvas-stamp approach
  // ═══════════════════════════════════════════════

  var dropsGfx = [];
  var clearDropletsGfx = null;

  function renderDropsGfx() {
    var dropBuffer = createCanvas(dropSize, dropSize);
    var dropBufferCtx = dropBuffer.getContext('2d');
    dropsGfx = [];

    for (var i = 0; i < 255; i++) {
      var drop = createCanvas(dropSize, dropSize);
      var dropCtx = drop.getContext('2d');
      dropBufferCtx.clearRect(0, 0, dropSize, dropSize);

      dropBufferCtx.globalCompositeOperation = 'source-over';
      dropBufferCtx.drawImage(dropColorTex, 0, 0, dropSize, dropSize);

      dropBufferCtx.globalCompositeOperation = 'screen';
      dropBufferCtx.fillStyle = 'rgba(0,0,' + i + ',1)';
      dropBufferCtx.fillRect(0, 0, dropSize, dropSize);

      dropCtx.globalCompositeOperation = 'source-over';
      dropCtx.drawImage(dropAlphaTex, 0, 0, dropSize, dropSize);

      dropCtx.globalCompositeOperation = 'source-in';
      dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize);

      dropsGfx.push(drop);
    }

    clearDropletsGfx = createCanvas(128, 128);
    var clearCtx = clearDropletsGfx.getContext('2d');
    clearCtx.fillStyle = '#000';
    clearCtx.beginPath();
    clearCtx.arc(64, 64, 64, 0, Math.PI * 2);
    clearCtx.fill();
  }

  // ═══════════════════════════════════════════════
  // RAINDROPS — Physics model
  // ═══════════════════════════════════════════════

  var Drop = {
    x: 0, y: 0, r: 0,
    spreadX: 0, spreadY: 0,
    momentum: 0, momentumX: 0,
    lastSpawn: 0, nextSpawn: 0,
    parent: null, isNew: true,
    killed: false, shrink: 0
  };

  var options = {
    minR: 20,
    maxR: 50,
    maxDrops: 900,
    rainChance: 0.08,
    rainLimit: 3,
    dropletsRate: 5,
    dropletsSize: [2, 5],
    dropletsCleaningRadiusMultiplier: 0.28,
    raining: true,
    globalTimeScale: 1,
    trailRate: 0.1,
    autoShrink: true,
    spawnArea: [-0.1, 0.95],
    trailScaleRange: [0.25, 0.35],
    collisionRadius: 0.45,
    collisionRadiusIncrease: 0.0002,
    dropFallMultiplier: 1,
    collisionBoostMultiplier: 0.05,
    collisionBoost: 1
  };

  var rdWidth = 0, rdHeight = 0, rdScale = 1;
  var rdCanvas, rdCtx;
  var dropletsCanvas, dropletsCtx;
  var dropletsPixelDensity = 1;
  var dropletsCounter = 0;
  var drops = [];
  var textureCleaningIterations = 0;
  var rdLastRender = null;

  function deltaR() { return options.maxR - options.minR; }
  function area() { return (rdWidth * rdHeight) / rdScale; }
  function areaMultiplier() { return Math.sqrt(area() / (1024 * 768)); }

  function drawDrop(ctx, drop) {
    if (dropsGfx.length <= 0) return;
    var x = drop.x, y = drop.y, r = drop.r;
    var spreadX = drop.spreadX, spreadY = drop.spreadY;
    var scaleX = 1, scaleY = 1.5;

    var d = Math.max(0, Math.min(1, ((r - options.minR) / deltaR()) * 0.9));
    d *= 1 / (((spreadX + spreadY) * 0.5) + 1);
    d = Math.floor(d * (dropsGfx.length - 1));

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      dropsGfx[d],
      (x - (r * scaleX * (spreadX + 1))) * rdScale,
      (y - (r * scaleY * (spreadY + 1))) * rdScale,
      (r * 2 * scaleX * (spreadX + 1)) * rdScale,
      (r * 2 * scaleY * (spreadY + 1)) * rdScale
    );
  }

  function drawDroplet(x, y, r) {
    drawDrop(dropletsCtx, {
      x: x * dropletsPixelDensity,
      y: y * dropletsPixelDensity,
      r: r * dropletsPixelDensity,
      spreadX: 0, spreadY: 0
    });
  }

  function clearDroplets(x, y, r) {
    if (!r) r = 30;
    dropletsCtx.globalCompositeOperation = 'destination-out';
    dropletsCtx.drawImage(
      clearDropletsGfx,
      (x - r) * dropletsPixelDensity * rdScale,
      (y - r) * dropletsPixelDensity * rdScale,
      (r * 2) * dropletsPixelDensity * rdScale,
      (r * 2) * dropletsPixelDensity * rdScale * 1.5
    );
  }

  function rdCreateDrop(opts) {
    if (drops.length >= options.maxDrops * areaMultiplier()) return null;
    var d = {};
    for (var k in Drop) { if (Drop.hasOwnProperty(k)) d[k] = Drop[k]; }
    for (var k2 in opts) { if (opts.hasOwnProperty(k2)) d[k2] = opts[k2]; }
    return d;
  }

  function updateRain(timeScale) {
    var rainDrops = [];
    if (options.raining) {
      var limit = options.rainLimit * timeScale * areaMultiplier() * RAIN_AMOUNT;
      var count = 0;
      while (chance(options.rainChance * timeScale * areaMultiplier() * RAIN_AMOUNT) && count < limit) {
        count++;
        var r = random(options.minR, options.maxR, function(n) { return Math.pow(n, 3); });
        var rd = rdCreateDrop({
          x: random(rdWidth / rdScale),
          y: random((rdHeight / rdScale) * options.spawnArea[0], (rdHeight / rdScale) * options.spawnArea[1]),
          r: r,
          momentum: 1 + ((r - options.minR) * 0.1) + random(2),
          spreadX: 1.5, spreadY: 1.5
        });
        if (rd != null) rainDrops.push(rd);
      }
    }
    return rainDrops;
  }

  function updateDroplets(timeScale) {
    if (textureCleaningIterations > 0) {
      textureCleaningIterations -= 1 * timeScale;
      dropletsCtx.globalCompositeOperation = 'destination-out';
      dropletsCtx.fillStyle = 'rgba(0,0,0,' + (0.05 * timeScale) + ')';
      dropletsCtx.fillRect(0, 0, rdWidth * dropletsPixelDensity, rdHeight * dropletsPixelDensity);
    }
    if (options.raining) {
      dropletsCounter += options.dropletsRate * timeScale * areaMultiplier() * RAIN_AMOUNT;
      var totalToSpawn = Math.floor(dropletsCounter);
      dropletsCounter -= totalToSpawn;

      while (totalToSpawn > 0) {
        if (chance(0.8) && totalToSpawn >= 4) {
          var clusterSize = Math.min(totalToSpawn, 4 + Math.floor(Math.random() * 5));
          var cx = random(rdWidth / rdScale);
          var cy = random(rdHeight / rdScale);
          var clusterSpread = 4 + Math.random() * 8;
          for (var ci = 0; ci < clusterSize; ci++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = Math.random() * clusterSpread;
            drawDroplet(
              cx + Math.cos(angle) * dist,
              cy + Math.sin(angle) * dist,
              random(options.dropletsSize[0], options.dropletsSize[1], function(n) { return n * n; })
            );
          }
          totalToSpawn -= clusterSize;
        } else {
          drawDroplet(
            random(rdWidth / rdScale),
            random(rdHeight / rdScale),
            random(options.dropletsSize[0], options.dropletsSize[1], function(n) { return n * n; })
          );
          totalToSpawn--;
        }
      }
    }
    rdCtx.drawImage(dropletsCanvas, 0, 0, rdWidth, rdHeight);
  }

  function updateDrops(timeScale) {
    var newDrops = [];
    updateDroplets(timeScale);
    var rainDrops = updateRain(timeScale);
    newDrops = newDrops.concat(rainDrops);

    drops.sort(function(a, b) {
      var va = (a.y * (rdWidth / rdScale)) + a.x;
      var vb = (b.y * (rdWidth / rdScale)) + b.x;
      return va > vb ? 1 : va === vb ? 0 : -1;
    });

    for (var i = 0; i < drops.length; i++) {
      var drop = drops[i];
      if (drop.killed) continue;

      if (chance((drop.r - (options.minR * options.dropFallMultiplier)) * (0.1 / deltaR()) * timeScale)) {
        drop.momentum += random((drop.r / options.maxR) * 4);
      }
      if (options.autoShrink && drop.r <= options.minR && chance(0.05 * timeScale)) {
        drop.shrink += 0.01;
      }
      drop.r -= drop.shrink * timeScale;
      if (drop.r <= 0) { drop.killed = true; continue; }

      if (options.raining) {
        drop.lastSpawn += drop.momentum * timeScale * options.trailRate;
        if (drop.lastSpawn > drop.nextSpawn) {
          var trailDrop = rdCreateDrop({
            x: drop.x + (random(-drop.r, drop.r) * 0.1),
            y: drop.y - (drop.r * 0.01),
            r: drop.r * random(options.trailScaleRange[0], options.trailScaleRange[1]),
            spreadY: drop.momentum * 0.1,
            parent: drop
          });
          if (trailDrop != null) {
            newDrops.push(trailDrop);
            drop.r *= Math.pow(0.97, timeScale);
            drop.lastSpawn = 0;
            drop.nextSpawn = random(options.minR, options.maxR) - (drop.momentum * 2 * options.trailRate) + (options.maxR - drop.r);
          }
        }
      }

      drop.spreadX *= Math.pow(0.4, timeScale);
      drop.spreadY *= Math.pow(0.7, timeScale);

      var moved = drop.momentum > 0;
      if (moved && !drop.killed) {
        drop.y += drop.momentum * options.globalTimeScale;
        drop.x += drop.momentumX * options.globalTimeScale;
        if (drop.y > (rdHeight / rdScale) + drop.r) { drop.killed = true; }
      }

      var checkCollision = (moved || drop.isNew) && !drop.killed;
      drop.isNew = false;

      if (checkCollision) {
        var end = Math.min(i + 70, drops.length);
        for (var j = i + 1; j < end; j++) {
          var drop2 = drops[j];
          if (drop === drop2 || drop.r <= drop2.r || drop.parent === drop2 || drop2.parent === drop || drop2.killed) continue;
          var dx = drop2.x - drop.x;
          var dy = drop2.y - drop.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (drop.r + drop2.r) * (options.collisionRadius + (drop.momentum * options.collisionRadiusIncrease * timeScale))) {
            var r1 = drop.r, r2 = drop2.r;
            var a1 = Math.PI * r1 * r1;
            var a2 = Math.PI * r2 * r2;
            var targetR = Math.sqrt((a1 + (a2 * 0.8)) / Math.PI);
            if (targetR > options.maxR) targetR = options.maxR;
            drop.r = targetR;
            drop.momentumX += dx * 0.1;
            drop.spreadX = 0;
            drop.spreadY = 0;
            drop2.killed = true;
            drop.momentum = Math.max(drop2.momentum, Math.min(40, drop.momentum + (targetR * options.collisionBoostMultiplier) + options.collisionBoost));
          }
        }
      }

      drop.momentum -= Math.max(1, (options.minR * 0.5) - drop.momentum) * 0.1 * timeScale;
      if (drop.momentum < 0) drop.momentum = 0;
      drop.momentumX *= Math.pow(0.7, timeScale);

      if (!drop.killed) {
        newDrops.push(drop);
        if (moved && options.dropletsRate > 0) clearDroplets(drop.x, drop.y, drop.r * options.dropletsCleaningRadiusMultiplier);
        drawDrop(rdCtx, drop);
      }
    }

    drops = newDrops;
  }

  function rdUpdate() {
    rdCtx.clearRect(0, 0, rdWidth, rdHeight);
    var now = Date.now();
    if (rdLastRender == null) rdLastRender = now;
    var deltaT = now - rdLastRender;
    var timeScale = deltaT / ((1 / 60) * 1000);
    if (timeScale > 1.1) timeScale = 1.1;
    timeScale *= options.globalTimeScale;
    rdLastRender = now;
    updateDrops(timeScale);
  }

  function initRaindrops(width, height, scale) {
    rdWidth = width;
    rdHeight = height;
    rdScale = scale;
    rdCanvas = createCanvas(rdWidth, rdHeight);
    rdCtx = rdCanvas.getContext('2d');
    dropletsCanvas = createCanvas(rdWidth * dropletsPixelDensity, rdHeight * dropletsPixelDensity);
    dropletsCtx = dropletsCanvas.getContext('2d');
    drops = [];
    dropletsCounter = 0;
    rdLastRender = null;
    renderDropsGfx();
  }

  // ═══════════════════════════════════════════════
  // WEBGL RENDERER — Refraction shader
  // ═══════════════════════════════════════════════

  var vertSrc = [
    'precision mediump float;',
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fragSrc = [
    'precision mediump float;',
    '',
    'uniform sampler2D u_waterMap;',
    'uniform sampler2D u_textureShine;',
    'uniform sampler2D u_textureFg;',
    'uniform sampler2D u_textureBg;',
    '',
    'uniform vec2 u_resolution;',
    'uniform vec2 u_parallax;',
    'uniform float u_parallaxFg;',
    'uniform float u_parallaxBg;',
    'uniform float u_textureRatio;',
    'uniform bool u_renderShine;',
    'uniform bool u_renderShadow;',
    'uniform float u_minRefraction;',
    'uniform float u_refractionDelta;',
    'uniform float u_brightness;',
    'uniform float u_alphaMultiply;',
    'uniform float u_alphaSubtract;',
    '',
    'vec4 blend(vec4 bg, vec4 fg) {',
    '  vec3 bgm = bg.rgb * bg.a;',
    '  vec3 fgm = fg.rgb * fg.a;',
    '  float ia = 1.0 - fg.a;',
    '  float a = (fg.a + bg.a * ia);',
    '  vec3 rgb;',
    '  if (a != 0.0) {',
    '    rgb = (fgm + bgm * ia) / a;',
    '  } else {',
    '    rgb = vec3(0.0, 0.0, 0.0);',
    '  }',
    '  return vec4(rgb, a);',
    '}',
    '',
    'vec2 pixel() {',
    '  return vec2(1.0, 1.0) / u_resolution;',
    '}',
    '',
    'vec2 parallax(float v) {',
    '  return u_parallax * pixel() * v;',
    '}',
    '',
    'vec2 texCoord() {',
    '  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;',
    '}',
    '',
    'vec2 scaledTexCoord() {',
    '  float ratio = u_resolution.x / u_resolution.y;',
    '  vec2 scale = vec2(1.0, 1.0);',
    '  vec2 offset = vec2(0.0, 0.0);',
    '  float ratioDelta = ratio - u_textureRatio;',
    '  if (ratioDelta >= 0.0) {',
    '    scale.y = (1.0 + ratioDelta);',
    '    offset.y = ratioDelta / 2.0;',
    '  } else {',
    '    scale.x = (1.0 - ratioDelta);',
    '    offset.x = -ratioDelta / 2.0;',
    '  }',
    '  return (texCoord() + offset) / scale;',
    '}',
    '',
    'vec4 fgColor(float x, float y) {',
    '  float p2 = u_parallaxFg * 2.0;',
    '  vec2 scale = vec2(',
    '    (u_resolution.x + p2) / u_resolution.x,',
    '    (u_resolution.y + p2) / u_resolution.y',
    '  );',
    '  vec2 scaledTC = texCoord() / scale;',
    '  vec2 offset = vec2(',
    '    (1.0 - (1.0 / scale.x)) / 2.0,',
    '    (1.0 - (1.0 / scale.y)) / 2.0',
    '  );',
    '  return texture2D(u_waterMap,',
    '    (scaledTC + offset) + (pixel() * vec2(x, y)) + parallax(u_parallaxFg)',
    '  );',
    '}',
    '',
    'void main() {',
    '  vec4 bg = texture2D(u_textureBg, scaledTexCoord() + parallax(u_parallaxBg));',
    '',
    '  vec4 cur = fgColor(0.0, 0.0);',
    '',
    '  float d = cur.b;',
    '  float x = cur.g;',
    '  float y = cur.r;',
    '',
    '  float a = clamp(cur.a * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);',
    '',
    '  vec2 refraction = (vec2(x, y) - 0.5) * 2.0;',
    '  vec2 refractionParallax = parallax(u_parallaxBg - u_parallaxFg);',
    '  vec2 refractionPos = scaledTexCoord()',
    '    + (pixel() * refraction * (u_minRefraction + (d * u_refractionDelta)))',
    '    + refractionParallax;',
    '',
    '  vec4 fgTexVal = texture2D(u_textureFg, refractionPos);',
    '  vec4 tex = mix(fgTexVal, bg, 0.5); // 混合 50% 模糊背景使雨滴折射模糊化',
    '',
    '  if (u_renderShine) {',
    '    float maxShine = 490.0;',
    '    float minShine = maxShine * 0.18;',
    '    vec2 shinePos = vec2(0.5, 0.5) + ((1.0 / 512.0) * refraction) * -(minShine + ((maxShine - minShine) * d));',
    '    vec4 shine = texture2D(u_textureShine, shinePos);',
    '    tex = blend(tex, shine);',
    '  }',
    '',
    '  vec4 fg = vec4(tex.rgb * u_brightness, a);',
    '',
    '  if (u_renderShadow) {',
    '    float borderAlpha = fgColor(0.0, 0.0 - (d * 6.0)).a;',
    '    borderAlpha = borderAlpha * u_alphaMultiply - (u_alphaSubtract + 0.5);',
    '    borderAlpha = clamp(borderAlpha, 0.0, 1.0);',
    '    borderAlpha *= 0.22;',
    '    vec4 border = vec4(0.0, 0.0, 0.0, borderAlpha);',
    '    fg = blend(border, fg);',
    '  }',
    '',
    '  gl_FragColor = blend(bg, fg);',
    '}'
  ].join('\n');

  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
    }
    return s;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  var quadVertices = new Float32Array([
    -1.0, -1.0,  1.0, -1.0,  -1.0, 1.0,
    -1.0,  1.0,  1.0, -1.0,   1.0, 1.0
  ]);
  var posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uniforms = {
    resolution: gl.getUniformLocation(prog, 'u_resolution'),
    textureRatio: gl.getUniformLocation(prog, 'u_textureRatio'),
    renderShine: gl.getUniformLocation(prog, 'u_renderShine'),
    renderShadow: gl.getUniformLocation(prog, 'u_renderShadow'),
    minRefraction: gl.getUniformLocation(prog, 'u_minRefraction'),
    refractionDelta: gl.getUniformLocation(prog, 'u_refractionDelta'),
    brightness: gl.getUniformLocation(prog, 'u_brightness'),
    alphaMultiply: gl.getUniformLocation(prog, 'u_alphaMultiply'),
    alphaSubtract: gl.getUniformLocation(prog, 'u_alphaSubtract'),
    parallaxBg: gl.getUniformLocation(prog, 'u_parallaxBg'),
    parallaxFg: gl.getUniformLocation(prog, 'u_parallaxFg'),
    parallax: gl.getUniformLocation(prog, 'u_parallax'),
    waterMap: gl.getUniformLocation(prog, 'u_waterMap'),
    textureShine: gl.getUniformLocation(prog, 'u_textureShine'),
    textureFg: gl.getUniformLocation(prog, 'u_textureFg'),
    textureBg: gl.getUniformLocation(prog, 'u_textureBg')
  };

  var bgRatio = textureBgCanvas.width / textureBgCanvas.height;

  function initTexture(unit, source) {
    var tex = gl.createTexture();
    gl.activeTexture(gl['TEXTURE' + unit]);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    return tex;
  }

  var waterTex = initTexture(0, null);
  var shineTex = initTexture(1, createCanvas(2, 2));
  var fgTex = initTexture(2, textureFgCanvas);
  var bgTex = initTexture(3, textureBgCanvas);

  // ═══════════════════════════════════════════════
  // RESIZE (RWD & 手機同比例適配)
  // ═══════════════════════════════════════════════

  function resize() {
    var hero = document.getElementById('hero-section');
    if (!hero) return;
    
    var w = hero.clientWidth;
    var h = hero.clientHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);

    initRaindrops(canvas.width, canvas.height, dpr);

    var fgW = 96;
    var fgH = Math.round(96 * (h / w));
    var bgW = 384;
    var bgH = Math.round(384 * (h / w));

    textureFgCanvas = generateSageBg(fgW, fgH, 1);
    textureBgCanvas = generateSageBg(bgW, bgH, 4);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureFgCanvas);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureBgCanvas);

    bgRatio = fgW / fgH;
  }

  window.addEventListener('resize', resize);
  resize();

  // ═══════════════════════════════════════════════
  // RENDER LOOP
  // ═══════════════════════════════════════════════

  function render() {
    requestAnimationFrame(render);
    if (paused || reducedMotion) return;

    rdUpdate();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rdCanvas);

    gl.useProgram(prog);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.textureRatio, bgRatio);
    gl.uniform1i(uniforms.renderShine, 0);
    gl.uniform1i(uniforms.renderShadow, 1);
    gl.uniform1f(uniforms.minRefraction, 256.0 * REFRACTION);
    gl.uniform1f(uniforms.refractionDelta, 256.0 * REFRACTION);
    gl.uniform1f(uniforms.brightness, 1.02);
    gl.uniform1f(uniforms.alphaMultiply, 3.0); // 降低以使邊緣半透明羽化
    gl.uniform1f(uniforms.alphaSubtract, 1.2); // 調整對應偏差值
    gl.uniform1f(uniforms.parallaxBg, 5.0);
    gl.uniform1f(uniforms.parallaxFg, 20.0);
    gl.uniform2f(uniforms.parallax, 0.0, 0.0);

    gl.uniform1i(uniforms.waterMap, 0);
    gl.uniform1i(uniforms.textureShine, 1);
    gl.uniform1i(uniforms.textureFg, 2);
    gl.uniform1i(uniforms.textureBg, 3);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // ═══════════════════════════════════════════════
  // INTERACTIVITY — Splash & Wipe
  // ═══════════════════════════════════════════════

  function createSplash(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) / rect.width * (rdWidth / rdScale);
    var y = (clientY - rect.top) / rect.height * (rdHeight / rdScale);

    var mainDrop = rdCreateDrop({
      x: x,
      y: y,
      r: random(options.minR * 1.5, options.maxR),
      momentum: 1 + random(3),
      spreadX: 2.0,
      spreadY: 2.0
    });
    if (mainDrop) drops.push(mainDrop);

    for (var i = 0; i < 8; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = 10 + Math.random() * 30;
      var sr = random(options.minR * 0.5, options.minR * 1.2);
      var sd = rdCreateDrop({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        r: sr,
        momentum: 0.5 + Math.random() * 1.5,
        spreadX: 1.0,
        spreadY: 1.0
      });
      if (sd) drops.push(sd);
    }

    for (var j = 0; j < 20; j++) {
      var sa = Math.random() * Math.PI * 2;
      var sd2 = 5 + Math.random() * 25;
      drawDroplet(
        x + Math.cos(sa) * sd2,
        y + Math.sin(sa) * sd2,
        random(options.dropletsSize[0], options.dropletsSize[1])
      );
    }
  }

  var rainMouseDown = false;

  function screenToRd(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * (rdWidth / rdScale),
      y: (clientY - rect.top) / rect.height * (rdHeight / rdScale)
    };
  }

  function wipeAt(clientX, clientY) {
    var p = screenToRd(clientX, clientY);
    var wipeR = 60 * rdScale;
    var killR = wipeR * 0.5;
    var pushR = wipeR * 1.5;
    clearDroplets(p.x, p.y, wipeR / rdScale);

    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      var dx = d.x - p.x, dy = d.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < killR) {
        drops.splice(i, 1);
      } else if (dist < pushR) {
        var push = (1 - (dist - killR) / (pushR - killR)) * 20;
        d.x += (dx / dist) * push;
        d.y += (dy / dist) * push * 0.6;
      }
    }
  }

  canvas.addEventListener('mousedown', function (e) {
    rainMouseDown = true;
    createSplash(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousemove', function (e) {
    if (rainMouseDown) wipeAt(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', function () {
    rainMouseDown = false;
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    rainMouseDown = true;
    var touch = e.touches[0];
    createSplash(touch.clientX, touch.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (rainMouseDown) {
      var touch = e.touches[0];
      wipeAt(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  window.addEventListener('touchend', function () {
    rainMouseDown = false;
  });

  requestAnimationFrame(render);
})();
