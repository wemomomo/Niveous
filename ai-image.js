
(function(){
  'use strict';

  var currentCallback = null;
  var currentGeneratedUrl = '';
  var currentRatio = '1:1';
  var isGenerating = false;
  var timerInterval = null;
  var elapsedSeconds = 0;

  function createModalDOM() {
    if (document.getElementById('aiImageModalOverlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'ai-image-modal-overlay';
    overlay.id = 'aiImageModalOverlay';

    overlay.innerHTML = '<div class="ai-image-modal-panel">'
      + '<div class="ai-image-header">'
      + '<div class="ai-image-title-wrap">'
      + '<span class="ai-image-title-icon">✦</span>'
      + '<span class="ai-image-title">AI 绘图工坊</span>'
      + '</div>'
      + '<button class="ai-image-close-btn" id="aiImageCloseBtn" type="button">✕</button>'
      + '</div>'

      + '<div class="ai-image-body">'
      
      // 1. 模型选择/输入栏
      + '<div style="display:flex; flex-direction:column; gap:6px; background:#f8fafc; padding:8px 10px; border-radius:12px; border:1px solid rgba(0,0,0,0.06);">'
      + '<div style="display:flex; justify-content:space-between; align-items:center;">'
      + '<span style="font-size:11px; font-weight:700; color:#64748b;">生图模型</span>'
      + '<div style="display:flex; gap:4px;">'
      + '<button class="ai-quick-model-btn" data-model="dall-e-3" style="font-size:9.5px; padding:2.5px 7px; border-radius:4px; border:0.5px solid #cbd5e1; background:#fff; cursor:pointer;" type="button">dall-e-3</button>'
      + '<button class="ai-quick-model-btn" data-model="imagen-3" style="font-size:9.5px; padding:2.5px 7px; border-radius:4px; border:0.5px solid #cbd5e1; background:#fff; cursor:pointer;" type="button">imagen-3</button>'
      + '<button class="ai-quick-model-btn" data-model="flux-schnell" style="font-size:9.5px; padding:2.5px 7px; border-radius:4px; border:0.5px solid #cbd5e1; background:#fff; cursor:pointer;" type="button">flux</button>'
      + '</div>'
      + '</div>'
      + '<input type="text" id="aiCustomModelInput" placeholder="输入中转站支持的模型名" style="width:100%; border:none; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; font-size:12px; font-family:monospace; outline:none; color:#18191c;">'
      + '</div>'

      // 2. 提示词输入区
      + '<div class="ai-prompt-box">'
      + '<div class="ai-prompt-header">'
      + '<span class="ai-prompt-label">画意描述 (PROMPT)</span>'
      + '<button class="ai-auto-prompt-pill" id="aiAutoPromptBtn" type="button"><span>✦ 智能优化词</span></button>'
      + '</div>'
      + '<textarea class="ai-prompt-textarea" id="aiPromptInput" placeholder="描述想要绘制的立绘、发色眸色、光影与场景..."></textarea>'
      + '</div>'

      // 3. 比例选择
      + '<div class="ai-options-row">'
      + '<div class="ai-ratio-group">'
      + '<button class="ai-ratio-chip active" data-ratio="1:1" type="button">1:1 方图</button>'
      + '<button class="ai-ratio-chip" data-ratio="3:4" type="button">3:4 立绘</button>'
      + '<button class="ai-ratio-chip" data-ratio="9:16" type="button">9:16 壁纸</button>'
      + '</div>'
      + '</div>'

      // 4. 图像生成展示舞台
      + '<div class="ai-preview-stage" id="aiPreviewStage" style="aspect-ratio:1/1;">'
      + '<img id="aiResultImg" src="" alt="AI生成图像">'
      + '<div class="ai-stage-empty">'
      + '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
      + '<span>输入描述，轻点下方开始绘图</span>'
      + '</div>'
      + '<div class="ai-generating-box">'
      + '<svg class="ai-generating-crystal" viewBox="0 0 48 48">'
      + '<circle cx="24" cy="24" r="2" fill="#88abda"/>'
      + '<polygon points="24,6 28,20 24,24 20,20" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '<polygon points="24,42 28,28 24,24 20,28" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '<polygon points="6,24 20,20 24,24 20,28" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '<polygon points="42,24 28,20 24,24 28,28" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '</svg>'
      + '<span class="ai-generating-text" id="aiProgressStatusText">正在连接画师通道... (0s)</span>'
      + '</div>'
      + '</div>'

      // 5. 诊断报错输出框 (手机端直显)
      + '<div id="aiDebugErrorBox" style="display:none; font-size:11px; color:#c94a4a; background:#fdf2f2; border:1px solid #fecaca; border-radius:8px; padding:6px 10px; line-height:1.4; word-break:break-all;"></div>'

      + '</div>'

      // 6. 底部执行按钮组
      + '<div class="ai-action-footer">'
      + '<button class="ai-generate-btn" id="aiStartGenBtn" type="button">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5"/></svg>'
      + '<span>开始绘制立绘</span>'
      + '</button>'
      + '<div class="ai-result-actions" id="aiResultActions">'
      + '<button class="ai-result-btn" id="aiSaveImgbedBtn" type="button">保存到图床</button>'
      + '<button class="ai-result-btn primary" id="aiAdoptBtn" type="button">✦ 采用此立绘</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    bindModalEvents();
  }

  function bindModalEvents() {
    var overlay = document.getElementById('aiImageModalOverlay');
    var closeBtn = document.getElementById('aiImageCloseBtn');
    var startBtn = document.getElementById('aiStartGenBtn');
    var adoptBtn = document.getElementById('aiAdoptBtn');
    var saveImgbedBtn = document.getElementById('aiSaveImgbedBtn');
    var autoPromptBtn = document.getElementById('aiAutoPromptBtn');
    var promptInput = document.getElementById('aiPromptInput');
    var customModelInput = document.getElementById('aiCustomModelInput');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay && !isGenerating) closeModal();
      });
    }

    document.querySelectorAll('.ai-quick-model-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (customModelInput) customModelInput.value = this.dataset.model;
      });
    });

    document.querySelectorAll('.ai-ratio-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        document.querySelectorAll('.ai-ratio-chip').forEach(function(c){ c.classList.remove('active'); });
        this.classList.add('active');
        currentRatio = this.dataset.ratio;
        
        var stage = document.getElementById('aiPreviewStage');
        if (stage) {
          if (currentRatio === '1:1') stage.style.aspectRatio = '1 / 1';
          else if (currentRatio === '3:4') stage.style.aspectRatio = '3 / 4';
          else if (currentRatio === '9:16') stage.style.aspectRatio = '9 / 16';
        }
      });
    });

    if (autoPromptBtn) {
      autoPromptBtn.addEventListener('click', function() {
        var raw = (promptInput.value || '').trim();
        if (!raw) {
          promptInput.value = '1boy, handsome anime male, silver hair, deep blue eyes, gentle smile, masterpiece, best quality, 8k resolution';
        } else {
          promptInput.value = raw + ', highly detailed, masterpiece, anime aesthetic, 8k resolution';
        }
        if (window.AppNav) AppNav.showToast('✦ 提示词已优化 ✦');
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', function() {
        var prompt = (promptInput.value || '').trim();
        if (!prompt) {
          if (window.AppNav) AppNav.showToast('请先输入想要绘制的描述哦');
          return;
        }
        executeDualEngineGeneration(prompt);
      });
    }

    if (adoptBtn) {
      adoptBtn.addEventListener('click', function() {
        if (!currentGeneratedUrl) return;
        if (typeof currentCallback === 'function') {
          currentCallback(currentGeneratedUrl);
        }
        closeModal();
        if (window.AppNav) AppNav.showToast('✦ 已成功设为当前立绘 ✦');
      });
    }

    if (saveImgbedBtn) {
      saveImgbedBtn.addEventListener('click', function() {
        if (!currentGeneratedUrl) return;
        if (window.AppDB) {
          AppDB.get('app_imgbed_list', function(list) {
            var arr = Array.isArray(list) ? list : [];
            arr.unshift({ id: 'img_' + Date.now(), url: currentGeneratedUrl, date: new Date().toLocaleDateString() });
            AppDB.save('app_imgbed_list', arr, function() {
              if (window.AppNav) AppNav.showToast('✦ 已存入图床相册 ✦');
            });
          });
        }
      });
    }
  }

  // 万能穿透提取器（递归深挖任何字段里的图片与 Base64）
  function deeplyExtractImage(obj) {
    if (!obj) return '';

    // 1. 如果直接是字符串
    if (typeof obj === 'string') {
      var str = obj.trim();
      if (str.indexOf('data:image/') === 0) return str;
      if (/^[A-Za-z0-9+/=]{100,}$/.test(str)) return 'data:image/png;base64,' + str;

      var mdMatch = str.match(/!\[.*?\]\((https?:\/\/[^\s\)\"\']+)\)/i);
      if (mdMatch && mdMatch[1]) return mdMatch[1];

      var urlMatch = str.match(/https?:\/\/[^\s"'<>\)]+/i);
      if (urlMatch && urlMatch[0]) return urlMatch[0].replace(/[,\);]+$/, '');
      return '';
    }

    // 2. 如果是标准 OpenAI images 格式
    if (obj.data && Array.isArray(obj.data) && obj.data.length > 0) {
      var first = obj.data[0];
      if (first.url) return first.url;
      if (first.b64_json) return 'data:image/png;base64,' + first.b64_json;
      if (first.image) return first.image;
    }

    // 3. 如果是 Chat 格式
    if (obj.choices && Array.isArray(obj.choices) && obj.choices.length > 0) {
      var msg = obj.choices[0].message;
      if (msg && msg.content) {
        var fromContent = deeplyExtractImage(msg.content);
        if (fromContent) return fromContent;
      }
    }

    // 4. 通用私有字段检索
    if (obj.url && typeof obj.url === 'string') return obj.url;
    if (obj.image_url && typeof obj.image_url === 'string') return obj.image_url;
    if (obj.image && typeof obj.image === 'string') return deeplyExtractImage(obj.image);
    if (obj.images && Array.isArray(obj.images) && obj.images[0]) return deeplyExtractImage(obj.images[0]);
    if (obj.result) return deeplyExtractImage(obj.result);

    return '';
  }

  // 双引擎生图核心
  function executeDualEngineGeneration(prompt) {
    var activeApi = (window.ApiConfig && typeof window.ApiConfig.getActive === 'function') ? window.ApiConfig.getActive() : null;
    
    var debugBox = document.getElementById('aiDebugErrorBox');
    if (debugBox) { debugBox.style.display = 'none'; debugBox.textContent = ''; }

    if (!activeApi || !activeApi.url || !activeApi.key) {
      if (window.AppNav) AppNav.showToast('请先在「设置 ➔ API配置」中配置接口');
      return;
    }

    var customModelInput = document.getElementById('aiCustomModelInput');
    var chosenModel = (customModelInput && customModelInput.value.trim()) ? customModelInput.value.trim() : (activeApi.model || 'dall-e-3');

    var cleanBase = activeApi.url.replace(/\/+$/, '');
    var rootUrl = cleanBase.endsWith('/v1') ? cleanBase : (cleanBase + '/v1');

    var imagesUrl = rootUrl + '/images/generations';
    var chatUrl = rootUrl + '/chat/completions';

    setGeneratingState(true);

    // 引擎 1：尝试标准生图端点
    fetch(imagesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + activeApi.key
      },
      body: JSON.stringify({
        model: chosenModel,
        prompt: prompt,
        n: 1,
        size: '1024x1024'
      })
    })
    .then(function(res) {
      return res.text().then(function(rawText) {
        var data = null;
        try { data = JSON.parse(rawText); } catch(e) { data = rawText; }

        if (!res.ok) {
          var msg = (data && data.error && data.error.message) ? data.error.message : (typeof data === 'string' ? data : ('HTTP ' + res.status));
          throw new Error('IMG_FAILED:' + msg);
        }

        var foundImg = deeplyExtractImage(data);
        if (foundImg) {
          onSuccess(foundImg);
          return null;
        } else {
          throw new Error('IMG_FAILED:中转未返回标准图像，切入Chat通道');
        }
      });
    })
    .catch(function(imgErr) {
      // 引擎 2：Chat 对话通道
      var statusText = document.getElementById('aiProgressStatusText');
      if (statusText) statusText.textContent = '🔄 切换对话画师协议中...';

      fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + activeApi.key
        },
        body: JSON.stringify({
          model: chosenModel,
          messages: [{ role: 'user', content: 'Draw an image: ' + prompt }]
        })
      })
      .then(function(cRes) {
        return cRes.text().then(function(cText) {
          var cData = null;
          try { cData = JSON.parse(cText); } catch(e) { cData = cText; }

          if (!cRes.ok) {
            var cMsg = (cData && cData.error && cData.error.message) ? cData.error.message : (typeof cData === 'string' ? cData : ('HTTP ' + cRes.status));
            throw new Error(cMsg);
          }

          var chatImg = deeplyExtractImage(cData);
          if (chatImg) {
            onSuccess(chatImg);
          } else {
            var rawPreview = typeof cData === 'object' ? JSON.stringify(cData) : String(cData);
            throw new Error('中转站未给出图片链接。返回内容：' + rawPreview.slice(0, 120));
          }
        });
      })
      .catch(function(finalErr) {
        setGeneratingState(false);
        var displayMsg = finalErr.message || '请求失败';
        if (debugBox) {
          debugBox.style.display = 'block';
          debugBox.textContent = '【排查提示】' + displayMsg;
        }
        if (window.AppNav) AppNav.showToast('绘图遇到阻碍，请看下方提示');
      });
    });

    function onSuccess(url) {
      setGeneratingState(false);
      showGeneratedResult(url);
      if (window.AppNav) AppNav.showToast('✦ 绘制成功 ✦');
    }
  }

  function setGeneratingState(generating) {
    isGenerating = generating;
    var stage = document.getElementById('aiPreviewStage');
    var startBtn = document.getElementById('aiStartGenBtn');
    var statusText = document.getElementById('aiProgressStatusText');
    if (!stage || !startBtn) return;

    if (generating) {
      elapsedSeconds = 0;
      stage.classList.remove('has-result');
      stage.classList.add('is-generating');
      startBtn.disabled = true;
      startBtn.querySelector('span').textContent = '正在绘制中...';

      if (statusText) statusText.textContent = '正在连接画师通道... (0s)';

      clearInterval(timerInterval);
      timerInterval = setInterval(function() {
        elapsedSeconds++;
        if (statusText) {
          if (elapsedSeconds < 5) {
            statusText.textContent = '📡 正在连接画师通道... (' + elapsedSeconds + 's)';
          } else if (elapsedSeconds < 15) {
            statusText.textContent = '✨ 正在构图与光影渲染... (' + elapsedSeconds + 's)';
          } else {
            statusText.textContent = '🎨 正在进行细节高清升采样... (' + elapsedSeconds + 's)';
          }
        }
      }, 1000);
    } else {
      clearInterval(timerInterval);
      stage.classList.remove('is-generating');
      startBtn.disabled = false;
      startBtn.querySelector('span').textContent = '重新绘制';
    }
  }

  function showGeneratedResult(url) {
    currentGeneratedUrl = url;
    var stage = document.getElementById('aiPreviewStage');
    var resultImg = document.getElementById('aiResultImg');
    if (stage && resultImg) {
      resultImg.onload = function() {
        stage.classList.add('has-result');
      };
      resultImg.onerror = function() {
        stage.classList.add('has-result');
      };
      resultImg.src = url;
      stage.classList.add('has-result');
    }
  }

  function openStudio(options, callback) {
    createModalDOM();
    currentCallback = callback || null;
    currentGeneratedUrl = '';
    
    var overlay = document.getElementById('aiImageModalOverlay');
    var promptInput = document.getElementById('aiPromptInput');
    var stage = document.getElementById('aiPreviewStage');
    var customModelInput = document.getElementById('aiCustomModelInput');
    var debugBox = document.getElementById('aiDebugErrorBox');

    if (debugBox) { debugBox.style.display = 'none'; debugBox.textContent = ''; }
    if (stage) stage.classList.remove('has-result', 'is-generating');
    if (promptInput) {
      promptInput.value = (options && options.defaultPrompt) ? options.defaultPrompt : '';
    }

    var activeApi = (window.ApiConfig && typeof window.ApiConfig.getActive === 'function') ? window.ApiConfig.getActive() : null;
    if (customModelInput) {
      if (activeApi && activeApi.model && /(image|flux|dall|sd|midjourney)/i.test(activeApi.model)) {
        customModelInput.value = activeApi.model;
      } else {
        customModelInput.value = 'dall-e-3';
      }
    }

    if (overlay) overlay.classList.add('show');
  }

  function closeModal() {
    var overlay = document.getElementById('aiImageModalOverlay');
    if (overlay) overlay.classList.remove('show');
    if (timerInterval) clearInterval(timerInterval);
  }

  window.AppAiImage = {
    openStudio: openStudio,
    closeStudio: closeModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModalDOM);
  } else {
    createModalDOM();
  }

})();
