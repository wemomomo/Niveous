
(function(){
  'use strict';

  var currentCallback = null;
  var currentGeneratedUrl = '';
  var currentRatio = '3:4';
  var isGenerating = false;

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
      + '<button class="ai-quick-model-btn" data-model="dall-e-3" style="font-size:9.5px; padding:2px 6px; border-radius:4px; border:0.5px solid #cbd5e1; background:#fff; cursor:pointer;" type="button">dall-e-3</button>'
      + '<button class="ai-quick-model-btn" data-model="imagen-3" style="font-size:9.5px; padding:2px 6px; border-radius:4px; border:0.5px solid #cbd5e1; background:#fff; cursor:pointer;" type="button">imagen-3</button>'
      + '<button class="ai-quick-model-btn" data-model="flux-schnell" style="font-size:9.5px; padding:2px 6px; border-radius:4px; border:0.5px solid #cbd5e1; background:#fff; cursor:pointer;" type="button">flux</button>'
      + '</div>'
      + '</div>'
      + '<input type="text" id="aiCustomModelInput" placeholder="输入中转站支持的生图模型名" style="width:100%; border:none; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:5px 8px; font-size:12px; font-family:monospace; outline:none; color:#18191c;">'
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
      + '<span class="ai-generating-text">正在唤醒灵感勾勒立绘...</span>'
      + '</div>'
      + '</div>'

      + '</div>'

      // 5. 底部执行按钮组
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

    // 快捷填入模型名称
    document.querySelectorAll('.ai-quick-model-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (customModelInput) customModelInput.value = this.dataset.model;
      });
    });

    // 画幅比例切换
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

    // 优化提示词
    if (autoPromptBtn) {
      autoPromptBtn.addEventListener('click', function() {
        var raw = (promptInput.value || '').trim();
        if (!raw) {
          promptInput.value = '1boy, handsome anime male, silver hair, deep blue eyes, gentle expression, highly detailed, masterpiece, best quality';
        } else {
          promptInput.value = raw + ', highly detailed, masterpiece, anime aesthetic, 8k resolution';
        }
        if (window.AppNav) AppNav.showToast('✦ 提示词已优化 ✦');
      });
    }

    // 开始绘制
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        var prompt = (promptInput.value || '').trim();
        if (!prompt) {
          if (window.AppNav) AppNav.showToast('请先输入想要绘制的描述哦');
          return;
        }
        executeGeneration(prompt);
      });
    }

    // 采用图片
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

    // 保存到图床
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

  // 执行生图核心逻辑 (全自动双通道容错)
  function executeGeneration(prompt) {
    var activeApi = (window.ApiConfig && typeof window.ApiConfig.getActive === 'function') ? window.ApiConfig.getActive() : null;
    
    if (!activeApi || !activeApi.url || !activeApi.key) {
      if (window.AppNav) AppNav.showToast('请先在「设置 ➔ API配置」中配置接口');
      return;
    }

    var customModelInput = document.getElementById('aiCustomModelInput');
    var chosenModel = (customModelInput && customModelInput.value.trim()) ? customModelInput.value.trim() : (activeApi.model || 'dall-e-3');

    var baseUrl = activeApi.url.replace(/\/+$/, '');
    var imageEndpoint = baseUrl.endsWith('/v1') ? (baseUrl + '/images/generations') : (baseUrl + '/v1/images/generations');

    setGeneratingState(true);

    // 标准图像端点请求
    fetch(imageEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + activeApi.key
      },
      body: JSON.stringify({
        model: chosenModel,
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url'
      })
    })
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok) {
          var errMsg = (data && data.error && data.error.message) ? data.error.message : ('HTTP ' + res.status);
          throw new Error(errMsg);
        }
        return data;
      });
    })
    .then(function(data) {
      setGeneratingState(false);
      var imageUrl = '';
      if (data && data.data && data.data[0]) {
        imageUrl = data.data[0].url || (data.data[0].b64_json ? ('data:image/png;base64,' + data.data[0].b64_json) : '');
      }

      if (imageUrl) {
        showGeneratedResult(imageUrl);
        if (window.AppNav) AppNav.showToast('✦ 绘制成功 ✦');
      } else {
        throw new Error('中转站未返回图片链接');
      }
    })
    .catch(function(err) {
      setGeneratingState(false);
      var msg = err.message || '请求失败';
      if (msg.indexOf('404') >= 0 || msg.indexOf('not found') >= 0 || msg.indexOf('model') >= 0) {
        if (window.AppNav) AppNav.showToast('模型「' + chosenModel + '」不存在，请换个模型名');
      } else if (msg.indexOf('401') >= 0 || msg.indexOf('key') >= 0) {
        if (window.AppNav) AppNav.showToast('API Key 无效或未授权');
      } else {
        if (window.AppNav) AppNav.showToast(msg);
      }
    });
  }

  function setGeneratingState(generating) {
    isGenerating = generating;
    var stage = document.getElementById('aiPreviewStage');
    var startBtn = document.getElementById('aiStartGenBtn');
    if (!stage || !startBtn) return;

    if (generating) {
      stage.classList.remove('has-result');
      stage.classList.add('is-generating');
      startBtn.disabled = true;
      startBtn.querySelector('span').textContent = '正在绘制中...';
    } else {
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
