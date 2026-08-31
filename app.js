
(function(){
  'use strict';

  // ============ IndexedDB ============
  var DB_NAME = 'AppDB';
  var DB_VERSION = 1;
  var STORE_NAME = 'appData';
  var db = null;

  function openDB(callback) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      var database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = function(e) { db = e.target.result; if (callback) callback(); };
    request.onerror = function() { if (callback) callback(); };
  }

  function dbSave(key, value, cb) {
    if (!db) { if (cb) cb(); return; }
    var tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = function() { if (cb) cb(); };
  }
  function dbGet(key, cb) {
    if (!db) { cb(null); return; }
    var r = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    r.onsuccess = function() { cb(r.result || null); };
    r.onerror = function() { cb(null); };
  }
  function dbDelete(key, cb) {
    if (!db) { if (cb) cb(); return; }
    var tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = function() { if (cb) cb(); };
  }

  window.AppDB = { open: openDB, save: dbSave, get: dbGet, delete: dbDelete };

  // ============ 跨实例登录凭证同步（localStorage） ============
  function saveAuthToLocal(token, userInfo) {
    try {
      localStorage.setItem('app_auth_token', token);
      localStorage.setItem('app_user_info', JSON.stringify(userInfo));
    } catch(e) {}
  }

  function getAuthFromLocal() {
    try {
      var token = localStorage.getItem('app_auth_token');
      var info = localStorage.getItem('app_user_info');
      if (token && info) {
        return { token: token, userInfo: JSON.parse(info) };
      }
    } catch(e) {}
    return null;
  }

  function clearAuthFromLocal() {
    try {
      localStorage.removeItem('app_auth_token');
      localStorage.removeItem('app_user_info');
    } catch(e) {}
  }

  // ============ 强力抹杀 Netlify 绿色条 ============
  function removeNetlifyDrawer() {
    var kill = function() {
      var targets = document.querySelectorAll(
        '#netlify-drawer, .netlify-drawer, [data-netlify-deploy-id], iframe[src*="netlify"], iframe[id*="netlify"], div[id*="netlify"], div[class*="netlify-feedback"], netlify-drawer, [id*="feedback-drawer"], [class*="feedback-drawer"]'
      );
      targets.forEach(function(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    };
    kill();
    var timer = setInterval(kill, 100);
    setTimeout(function() { clearInterval(timer); }, 6000);
    if (window.MutationObserver) {
      var observer = new MutationObserver(function() { kill(); });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // ============ 稳定硬件级设备指纹（纯硬件特征，跨浏览器一致） ============
  function getStableDeviceId(callback) {
    dbGet('app_device_fingerprint', function(savedId) {
      if (savedId) { callback(savedId); return; }

      var components = [];

      // 屏幕物理分辨率与像素密度
      components.push(screen.width + 'x' + screen.height + '@' + (window.devicePixelRatio || 1));

      // 时区偏移
      components.push(new Date().getTimezoneOffset());

      // 系统语言
      components.push(navigator.language || navigator.userLanguage || '');

      // CPU 核心数
      components.push(navigator.hardwareConcurrency || 0);

      // 设备内存
      components.push(navigator.deviceMemory || 0);

      // 触控点数量
      components.push(navigator.maxTouchPoints || 0);

      // 屏幕色深
      components.push(screen.colorDepth || 0);

      // Canvas GPU 渲染指纹
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 200; canvas.height = 50;
        ctx.textBaseline = 'top'; ctx.font = '14px Arial';
        ctx.fillStyle = '#f60'; ctx.fillRect(10, 10, 100, 30);
        ctx.fillStyle = '#069'; ctx.fillText('Device Fingerprint', 15, 15);
        components.push(canvas.toDataURL().substring(0, 100));
      }

      var rawString = components.join('|');
      var hash = simpleHash(rawString);
      var deviceId = 'hw_' + hash.substring(0, 12);

      dbSave('app_device_fingerprint', deviceId, function() {
        callback(deviceId);
      });
    });
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ============ 登录门禁逻辑 ============
  function checkActivation() {
    var mask = document.getElementById('authGateMask');
    var usernameInput = document.getElementById('authUsernameInput');
    var passwordInput = document.getElementById('authPasswordInput');
    var submitBtn = document.getElementById('authSubmitBtn');
    if (!mask) return;

    function onLoginVerified(token, userInfo) {
      dbSave('app_auth_token', token, function() {
        dbSave('app_user_info', userInfo, function() {
          saveAuthToLocal(token, userInfo);
          mask.classList.remove('show');
        });
      });
    }

    function kickOut(message) {
      dbDelete('app_auth_token', function() {
        dbDelete('app_user_info', function() {
          clearAuthFromLocal();
          mask.classList.add('show');
          if (message) showToast(message);
        });
      });
    }

    function silentVerify(userInfo) {
      getStableDeviceId(function(deviceId) {
        fetch('/.netlify/functions/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            username: userInfo.username,
            password: userInfo.password || '',
            deviceId: deviceId,
            verifyOnly: true
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (!data.success) {
            kickOut(data.message || '账号已失效');
          }
        })
        .catch(function() {});
      });
    }

    // 1. 检查登录状态
    dbGet('app_user_info', function(userInfo) {
      dbGet('app_auth_token', function(token) {
        if (token && userInfo && userInfo.username) {
          mask.classList.remove('show');
          silentVerify(userInfo);
        } else {
          var localAuth = getAuthFromLocal();
          if (localAuth && localAuth.token && localAuth.userInfo && localAuth.userInfo.username) {
            onLoginVerified(localAuth.token, localAuth.userInfo);
            silentVerify(localAuth.userInfo);
          } else {
            mask.classList.add('show');
          }
        }
      });
    });

    // 2. 登录按钮
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        var username = (usernameInput.value || '').trim();
        var password = (passwordInput.value || '').trim();
        if (!username || !password) { showToast('请输入账号和密码'); return; }

        getStableDeviceId(function(deviceId) {
          submitBtn.disabled = true;
          submitBtn.textContent = '进入中...';

          fetch('/.netlify/functions/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ username: username, password: password, deviceId: deviceId })
          })
          .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function(data) {
            submitBtn.disabled = false;
            submitBtn.textContent = '进入';

            if (data.success && data.token) {
              var info = { username: data.username, password: password };
              onLoginVerified(data.token, info);
              showToast('欢迎回来');
              window.dispatchEvent(new CustomEvent('loginSuccess'));
            } else {
              showToast(data.message || '登录失败');
            }
          })
          .catch(function() {
            submitBtn.disabled = false;
            submitBtn.textContent = '进入';
            showToast('登录失败，请重试');
          });
        });
      });
    }

    // 3. 登录/注册切换
    var loginBox = document.getElementById('authLoginBox');
    var registerBox = document.getElementById('authRegisterBox');
    var goRegisterBtn = document.getElementById('authGoRegister');
    var goLoginBtn = document.getElementById('authGoLogin');
    var registerBtn = document.getElementById('authRegisterBtn');

    if (goRegisterBtn) {
      goRegisterBtn.addEventListener('click', function() {
        loginBox.classList.add('auth-hidden');
        registerBox.classList.remove('auth-hidden');
      });
    }

    if (goLoginBtn) {
      goLoginBtn.addEventListener('click', function() {
        registerBox.classList.add('auth-hidden');
        loginBox.classList.remove('auth-hidden');
      });
    }

    // 4. 注册按钮
    if (registerBtn) {
      registerBtn.addEventListener('click', function() {
        var inviteCode = (document.getElementById('authInviteInput').value || '').trim();
        var regUser = (document.getElementById('authRegUserInput').value || '').trim();
        var regPass = (document.getElementById('authRegPassInput').value || '').trim();

        if (!inviteCode || !regUser || !regPass) { showToast('请填写完整信息'); return; }

        registerBtn.disabled = true;
        registerBtn.textContent = '注册中...';

        fetch('/.netlify/functions/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ inviteCode: inviteCode, username: regUser, password: regPass })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          registerBtn.disabled = false;
          registerBtn.textContent = '注册';

          if (data.success) {
            showToast('注册成功，正在登录...');
            getStableDeviceId(function(deviceId) {
              fetch('/.netlify/functions/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ username: regUser, password: regPass, deviceId: deviceId })
              })
              .then(function(res) { return res.json(); })
              .then(function(loginData) {
                if (loginData.success && loginData.token) {
                  var info = { username: loginData.username, password: regPass };
                  onLoginVerified(loginData.token, info);
                  showToast('欢迎回来');
                  window.dispatchEvent(new CustomEvent('loginSuccess'));
                }
              });
            });
          } else {
            showToast(data.message || '注册失败');
          }
        })
        .catch(function() {
          registerBtn.disabled = false;
          registerBtn.textContent = '注册';
          showToast('网络异常，请重试');
        });
      });
    }
  }

  // ============ 页面外壳与导航 ============
  var dock = document.querySelector('.tab-bar');
  var dockEditBtn = document.querySelector('.tabbar-edit-btn');

  function initAppShells() {
    var appPages = ['wechat','offline','settings','check'];
    appPages.forEach(function(name) {
      var page = document.querySelector('[data-page="'+name+'"]');
      if (!page || page.querySelector('.app-header')) return;
      var titleText = {wechat:'微信',offline:'线下',settings:'设置',check:'查岗'}[name];
      page.innerHTML = '<div class="app-header"><button class="icon-back-btn" data-back="home"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button><div class="app-title">'+titleText+'</div></div><div class="app-content" id="'+name+'Content"></div>';
    });

    var settingsContent = document.getElementById('settingsContent');
    if (settingsContent && !settingsContent.querySelector('.settings-list')) {
      settingsContent.innerHTML = '<div class="settings-list"><div class="settings-item" data-goto="api"><div class="settings-item-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div class="settings-item-text"><div class="settings-item-title">API 配置</div><div class="settings-item-desc">管理接口密钥与模型设置</div></div><svg class="settings-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div><div class="settings-item" data-goto="data"><div class="settings-item-icon"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div><div class="settings-item-text"><div class="settings-item-title">数据</div><div class="settings-item-desc">导入导出与清除本地数据</div></div><svg class="settings-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div></div>';
    }

    var subPages = [{name:'api',title:'API 配置',back:'settings'},{name:'data',title:'数据',back:'settings'}];
    subPages.forEach(function(sub) {
      var existing = document.querySelector('[data-page="'+sub.name+'"]');
      if (existing) return;
      var subPage = document.createElement('div');
      subPage.className = 'page app-page';
      subPage.dataset.page = sub.name;
      subPage.innerHTML = '<div class="app-header"><button class="icon-back-btn" data-back="'+sub.back+'"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button><div class="app-title">'+sub.title+'</div></div><div class="app-content" id="'+sub.name+'PageContent"></div>';
      document.getElementById('pageContainer').appendChild(subPage);
    });
  }

  function showPage(name) {
    var allPages = document.querySelectorAll('.page');
    allPages.forEach(function(p) {
      if (p.dataset.page === name) { p.classList.add('active'); p.style.transform = ''; }
      else { p.classList.remove('active'); }
    });
    if (name === 'home') { if (dock) dock.style.display = 'flex'; if (dockEditBtn) dockEditBtn.style.display = 'block'; }
    else { if (dock) dock.style.display = 'none'; if (dockEditBtn) dockEditBtn.style.display = 'none'; }
    window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: name } }));
  }

  function bindNavigation() {
    document.querySelectorAll('.tab-item').forEach(function(tab) {
      tab.addEventListener('click', function() { showPage(this.dataset.tab); });
    });
    document.addEventListener('click', function(e) { var b = e.target.closest('[data-back]'); if (b) showPage(b.dataset.back); });
    document.addEventListener('click', function(e) { var g = e.target.closest('[data-goto]'); if (g) showPage(g.dataset.goto); });

    document.querySelectorAll('.app-page').forEach(function(page) {
      var startX = 0, currentX = 0, isDragging = false;
      page.addEventListener('touchstart', function(e) { if (e.touches[0].clientX > 40) return; isDragging = true; startX = e.touches[0].clientX; page.style.transition = 'none'; }, { passive: true });
      page.addEventListener('touchmove', function(e) { if (!isDragging) return; currentX = e.touches[0].clientX - startX; if (currentX > 0) page.style.transform = 'translateX('+currentX+'px)'; }, { passive: true });
      page.addEventListener('touchend', function() {
        if (!isDragging) return; isDragging = false;
        page.style.transition = 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)';
        var backBtn = page.querySelector('[data-back]');
        if (currentX > window.innerWidth*0.3 && backBtn) { showPage(backBtn.dataset.back); setTimeout(function() { page.style.transform = ''; }, 300); }
        else { page.style.transform = 'translateX(0)'; }
      });
    });
  }

  // ============ Canvas 裁剪器 ============
  var cropOverlay = document.getElementById('cropOverlay');
  var cropCanvas = document.getElementById('cropCanvas');
  var cropWorkspace = document.getElementById('cropWorkspace');
  var cropCancelBtn = document.getElementById('cropCancelBtn');
  var cropConfirmBtn = document.getElementById('cropConfirmBtn');
  var cropCtx = cropCanvas ? cropCanvas.getContext('2d') : null;
  var cropDpr = window.devicePixelRatio || 1;

  var cropImg = null, cropCallback = null, cropScale = 1;
  var cropDisplayW = 0, cropDisplayH = 0;
  var cropBox = { x: 0, y: 0, w: 0, h: 0 };
  var cropLockedRatio = 0, cropDragMode = '';
  var cropStartX = 0, cropStartY = 0, cropStartBox = {};
  var CROP_HANDLE = 24, CROP_MIN = 40;

  window.AppCropper = {
    open: function(src, options, callback) {
      cropCallback = callback; cropLockedRatio = 0;
      cropOverlay.querySelectorAll('.crop-ratio-btn').forEach(function(b) { b.classList.remove('active'); });
      var freeBtn = cropOverlay.querySelector('[data-ratio="free"]');
      if (freeBtn) freeBtn.classList.add('active');
      cropOverlay.classList.add('show');

      cropImg = new Image();
      cropImg.onload = function() {
        var maxW = cropWorkspace.clientWidth - 32, maxH = cropWorkspace.clientHeight - 32;
        if (maxW <= 0 || maxH <= 0) { maxW = window.innerWidth - 32; maxH = window.innerHeight - 180; }
        cropScale = Math.min(maxW / cropImg.width, maxH / cropImg.height, 1);
        cropDisplayW = Math.round(cropImg.width * cropScale);
        cropDisplayH = Math.round(cropImg.height * cropScale);
        cropCanvas.width = cropDisplayW * cropDpr; cropCanvas.height = cropDisplayH * cropDpr;
        cropCanvas.style.width = cropDisplayW + 'px'; cropCanvas.style.height = cropDisplayH + 'px';
        cropCtx.setTransform(cropDpr, 0, 0, cropDpr, 0, 0);
        var initRatio = (options && options.aspectRatio) ? options.aspectRatio : (cropDisplayW / cropDisplayH);
        var initW = cropDisplayW * 0.85, initH = initW / initRatio;
        if (initH > cropDisplayH * 0.85) { initH = cropDisplayH * 0.85; initW = initH * initRatio; }
        cropBox.w = initW; cropBox.h = initH;
        cropBox.x = (cropDisplayW - cropBox.w) / 2; cropBox.y = (cropDisplayH - cropBox.h) / 2;
        cropDraw();
      };
      cropImg.src = src;
    }
  };

  function cropClamp() {
    if (cropBox.w < CROP_MIN) cropBox.w = CROP_MIN;
    if (cropBox.h < CROP_MIN) cropBox.h = CROP_MIN;
    if (cropBox.x < 0) { cropBox.w += cropBox.x; cropBox.x = 0; }
    if (cropBox.y < 0) { cropBox.h += cropBox.y; cropBox.y = 0; }
    if (cropBox.x + cropBox.w > cropDisplayW) cropBox.w = cropDisplayW - cropBox.x;
    if (cropBox.y + cropBox.h > cropDisplayH) cropBox.h = cropDisplayH - cropBox.y;
  }

  function cropDraw() {
    if (!cropCtx) return;
    var c = cropBox;
    cropCtx.clearRect(0, 0, cropDisplayW, cropDisplayH);
    cropCtx.drawImage(cropImg, 0, 0, cropDisplayW, cropDisplayH);
    cropCtx.fillStyle = 'rgba(0,0,0,0.55)';
    cropCtx.fillRect(0, 0, cropDisplayW, c.y);
    cropCtx.fillRect(0, c.y + c.h, cropDisplayW, cropDisplayH - c.y - c.h);
    cropCtx.fillRect(0, c.y, c.x, c.h);
    cropCtx.fillRect(c.x + c.w, c.y, cropDisplayW - c.x - c.w, c.h);
    cropCtx.strokeStyle = '#fff'; cropCtx.lineWidth = 2;
    cropCtx.strokeRect(c.x, c.y, c.w, c.h);
    cropCtx.strokeStyle = 'rgba(255,255,255,0.35)'; cropCtx.lineWidth = 1;
    var tw = c.w/3, th = c.h/3;
    cropCtx.beginPath();
    cropCtx.moveTo(c.x+tw,c.y); cropCtx.lineTo(c.x+tw,c.y+c.h);
    cropCtx.moveTo(c.x+tw*2,c.y); cropCtx.lineTo(c.x+tw*2,c.y+c.h);
    cropCtx.moveTo(c.x,c.y+th); cropCtx.lineTo(c.x+c.w,c.y+th);
    cropCtx.moveTo(c.x,c.y+th*2); cropCtx.lineTo(c.x+c.w,c.y+th*2);
    cropCtx.stroke();
    cropCtx.fillStyle = '#fff'; var hs = 9;
    [[c.x,c.y],[c.x+c.w,c.y],[c.x,c.y+c.h],[c.x+c.w,c.y+c.h]].forEach(function(p){cropCtx.fillRect(p[0]-hs/2,p[1]-hs/2,hs,hs);});
    [[c.x+c.w/2,c.y],[c.x+c.w/2,c.y+c.h],[c.x,c.y+c.h/2],[c.x+c.w,c.y+c.h/2]].forEach(function(p){cropCtx.fillRect(p[0]-hs/2,p[1]-hs/2,hs,hs);});
  }

  function cropGetPos(e) { var t = e.touches ? e.touches[0] : e; var rect = cropCanvas.getBoundingClientRect(); return { x: t.clientX - rect.left, y: t.clientY - rect.top }; }

  function cropHitTest(px, py) {
    var c = cropBox, H = CROP_HANDLE;
    if (px>=c.x-H&&px<=c.x+H&&py>=c.y-H&&py<=c.y+H) return 'tl';
    if (px>=c.x+c.w-H&&px<=c.x+c.w+H&&py>=c.y-H&&py<=c.y+H) return 'tr';
    if (px>=c.x-H&&px<=c.x+H&&py>=c.y+c.h-H&&py<=c.y+c.h+H) return 'bl';
    if (px>=c.x+c.w-H&&px<=c.x+c.w+H&&py>=c.y+c.h-H&&py<=c.y+c.h+H) return 'br';
    if (py>=c.y-H&&py<=c.y+H&&px>c.x+H&&px<c.x+c.w-H) return 't';
    if (py>=c.y+c.h-H&&py<=c.y+c.h+H&&px>c.x+H&&px<c.x+c.w-H) return 'b';
    if (px>=c.x-H&&px<=c.x+H&&py>c.y+H&&py<c.y+c.h-H) return 'l';
    if (px>=c.x+c.w-H&&px<=c.x+c.w+H&&py>c.y+H&&py<c.y+c.h-H) return 'r';
    if (px>=c.x&&px<=c.x+c.w&&py>=c.y&&py<=c.y+c.h) return 'move';
    return '';
  }

  function cropOnStart(e) {
    if (e.touches && e.touches.length > 1) return;
    e.preventDefault(); var p = cropGetPos(e);
    cropDragMode = cropHitTest(p.x, p.y); if (!cropDragMode) return;
    cropStartX = p.x; cropStartY = p.y;
    cropStartBox = { x:cropBox.x, y:cropBox.y, w:cropBox.w, h:cropBox.h };
    document.addEventListener('mousemove', cropOnMove);
    document.addEventListener('mouseup', cropOnEnd);
    document.addEventListener('touchmove', cropOnMove, { passive: false });
    document.addEventListener('touchend', cropOnEnd);
  }

  function cropOnMove(e) {
    if (!cropDragMode) return; e.preventDefault();
    var p = cropGetPos(e), dx = p.x-cropStartX, dy = p.y-cropStartY, sc = cropStartBox;
    if (cropDragMode==='move') { cropBox.x=Math.max(0,Math.min(cropDisplayW-cropBox.w,sc.x+dx)); cropBox.y=Math.max(0,Math.min(cropDisplayH-cropBox.h,sc.y+dy)); cropDraw(); return; }
    if (cropDragMode==='r') { cropBox.w=Math.max(CROP_MIN,Math.min(cropDisplayW-sc.x,sc.w+dx)); }
    else if (cropDragMode==='l') { var ra=sc.x+sc.w; var nx=Math.max(0,Math.min(ra-CROP_MIN,sc.x+dx)); cropBox.x=nx; cropBox.w=ra-nx; }
    else if (cropDragMode==='b') { cropBox.h=Math.max(CROP_MIN,Math.min(cropDisplayH-sc.y,sc.h+dy)); }
    else if (cropDragMode==='t') { var ba=sc.y+sc.h; var ny=Math.max(0,Math.min(ba-CROP_MIN,sc.y+dy)); cropBox.y=ny; cropBox.h=ba-ny; }
    else if (cropDragMode==='br') { cropBox.w=Math.max(CROP_MIN,Math.min(cropDisplayW-sc.x,sc.w+dx)); cropBox.h=Math.max(CROP_MIN,Math.min(cropDisplayH-sc.y,sc.h+dy)); }
    else if (cropDragMode==='bl') { var ra2=sc.x+sc.w; var nx2=Math.max(0,Math.min(ra2-CROP_MIN,sc.x+dx)); cropBox.x=nx2; cropBox.w=ra2-nx2; cropBox.h=Math.max(CROP_MIN,Math.min(cropDisplayH-sc.y,sc.h+dy)); }
    else if (cropDragMode==='tr') { var ba2=sc.y+sc.h; var ny2=Math.max(0,Math.min(ba2-CROP_MIN,sc.y+dy)); cropBox.w=Math.max(CROP_MIN,Math.min(cropDisplayW-sc.x,sc.w+dx)); cropBox.y=ny2; cropBox.h=ba2-ny2; }
    else if (cropDragMode==='tl') { var ra3=sc.x+sc.w; var ba3=sc.y+sc.h; var nx3=Math.max(0,Math.min(ra3-CROP_MIN,sc.x+dx)); var ny3=Math.max(0,Math.min(ba3-CROP_MIN,sc.y+dy)); cropBox.x=nx3; cropBox.w=ra3-nx3; cropBox.y=ny3; cropBox.h=ba3-ny3; }
    if (cropLockedRatio) {
      if (cropDragMode==='r'||cropDragMode==='l'||cropDragMode==='tr'||cropDragMode==='tl') cropBox.h=cropBox.w/cropLockedRatio;
      else cropBox.w=cropBox.h*cropLockedRatio;
      cropClamp();
    }
    cropDraw();
  }

  function cropOnEnd() {
    cropDragMode = '';
    document.removeEventListener('mousemove', cropOnMove); document.removeEventListener('mouseup', cropOnEnd);
    document.removeEventListener('touchmove', cropOnMove); document.removeEventListener('touchend', cropOnEnd);
  }

  if (cropCanvas) {
    cropCanvas.addEventListener('mousedown', cropOnStart);
    cropCanvas.addEventListener('touchstart', cropOnStart, { passive: false });
    var cropLastDist = 0;
    cropCanvas.addEventListener('touchstart', function(e) { if (e.touches.length===2) { e.preventDefault(); cropDragMode=''; cropLastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); } }, { passive: false });
    cropCanvas.addEventListener('touchmove', function(e) {
      if (e.touches.length===2) { e.preventDefault(); var dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); var diff=dist-cropLastDist; var ratio=cropBox.w/cropBox.h; var cx=cropBox.x+cropBox.w/2,cy=cropBox.y+cropBox.h/2; cropBox.w=Math.max(CROP_MIN,cropBox.w+diff); cropBox.h=Math.max(CROP_MIN,cropBox.h+diff/ratio); cropBox.x=cx-cropBox.w/2; cropBox.y=cy-cropBox.h/2; cropClamp(); cropLastDist=dist; cropDraw(); }
    }, { passive: false });
  }

  if (cropOverlay) {
    cropOverlay.querySelectorAll('.crop-ratio-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        cropOverlay.querySelectorAll('.crop-ratio-btn').forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
        var r=btn.dataset.ratio;
        if (r==='free') cropLockedRatio=0;
        else if (r==='1') cropLockedRatio=1;
        else if (r==='4:3') cropLockedRatio=4/3;
        else if (r==='16:9') cropLockedRatio=16/9;
        if (cropLockedRatio) { var cx=cropBox.x+cropBox.w/2,cy=cropBox.y+cropBox.h/2; var nw=cropBox.w,nh=nw/cropLockedRatio; if(nh>cropDisplayH*0.9){nh=cropDisplayH*0.9;nw=nh*cropLockedRatio;} cropBox.w=nw;cropBox.h=nh;cropBox.x=cx-cropBox.w/2;cropBox.y=cy-cropBox.h/2; cropClamp(); cropDraw(); }
      });
    });
  }

  if (cropCancelBtn) cropCancelBtn.addEventListener('click', function() { cropOverlay.classList.remove('show'); cropCallback=null; });
  if (cropConfirmBtn) cropConfirmBtn.addEventListener('click', function() {
    var output=document.createElement('canvas'); var outW=Math.round(cropBox.w/cropScale),outH=Math.round(cropBox.h/cropScale);
    output.width=outW; output.height=outH; var outCtx=output.getContext('2d');
    outCtx.drawImage(cropImg,cropBox.x/cropScale,cropBox.y/cropScale,cropBox.w/cropScale,cropBox.h/cropScale,0,0,outW,outH);
    var data=output.toDataURL('image/jpeg',0.92); cropOverlay.classList.remove('show');
    if (cropCallback) cropCallback(data); cropCallback=null;
  });

  // ============ 照片操作卡片 ============
  var photoActionCard=null,photoActionMask=null,photoActionOnSelect=null,photoActionOnDelete=null;
  function setupPhotoAction() {
    photoActionMask=document.createElement('div'); photoActionMask.className='photo-action-mask'; document.body.appendChild(photoActionMask);
    photoActionCard=document.createElement('div'); photoActionCard.className='photo-action-card';
    photoActionCard.innerHTML='<button id="paSelectBtn">选择照片</button><button id="paDeleteBtn">删除照片</button>';
    document.body.appendChild(photoActionCard);
    photoActionMask.addEventListener('click',function(){photoActionMask.classList.remove('show');photoActionCard.classList.remove('show');photoActionOnSelect=null;photoActionOnDelete=null;});
    document.getElementById('paSelectBtn').addEventListener('click',function(){var cb=photoActionOnSelect;photoActionMask.classList.remove('show');photoActionCard.classList.remove('show');photoActionOnSelect=null;photoActionOnDelete=null;if(cb)cb();});
    document.getElementById('paDeleteBtn').addEventListener('click',function(){var cb=photoActionOnDelete;photoActionMask.classList.remove('show');photoActionCard.classList.remove('show');photoActionOnSelect=null;photoActionOnDelete=null;if(cb)cb();});
  }
  window.PhotoAction={show:function(onSelect,onDelete){photoActionOnSelect=onSelect;photoActionOnDelete=onDelete;photoActionMask.classList.add('show');photoActionCard.classList.add('show');}};

  // ============ Toast ============
  function showToast(message) {
    var toast=document.createElement('div'); toast.className='toast-message'; toast.textContent=message;
    document.body.appendChild(toast);
    setTimeout(function(){toast.classList.add('show');},10);
    setTimeout(function(){toast.classList.remove('show');setTimeout(function(){document.body.removeChild(toast);},300);},2000);
  }

  window.AppNav = { showPage: showPage, showToast: showToast };

  // ============ 初始化 ============
  openDB(function() {
    removeNetlifyDrawer();
    setupPhotoAction();
    initAppShells();
    bindNavigation();
    checkActivation();
    window.dispatchEvent(new CustomEvent('dbReady'));
  });

})();
