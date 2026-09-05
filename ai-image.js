
(function(){
  'use strict';

  var currentCallback = null;
  var currentGeneratedUrl = '';
  var currentRatio = '3:4';
  var isGenerating = false;

  // 默认支持的生图模型推荐列表
  var DEFAULT_IMAGE_MODEL = 'imagen-3.0-generate-002';

  // 比例尺寸映射表 (适配不同模型规格)
  var RATIO_SIZE_MAP = {
    '1:1': { width: 1024, height: 1024, sizeStr: '1024x1024' },
    '3:4': { width: 768, height: 1024, sizeStr: '768x1024' },
    '9:16': { width: 576, height: 1024, sizeStr: '1024x1792' }
  };

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
      + '<div class="ai-prompt-box">'
      + '<div class="ai-prompt-header">'
      + '<span class="ai-prompt-label">画意描述 (PROMPT)</span>'
      + '<button class="ai-auto-prompt-pill" id="aiAutoPromptBtn" type="button"><span>✦ 智能优化词</span></button>'
      + '</div>'
      + '<textarea class="ai-prompt-textarea" id="aiPromptInput" placeholder="描述你心中的立绘画面、发色眸色、光影氛围与场景细节..."></textarea>'
      + '</div>'

      + '<div class="ai-options-row">'
      + '<div class="ai-ratio-group">'
      + '<button class="ai-ratio-chip active" data-ratio="3:4" type="button">3:4 立绘</button>'
      + '<button class="ai-ratio-chip" data-ratio="1:1" type="button">1:1 头像</button>'
      + '<button class="ai-ratio-chip" data-ratio="9:16" type="button">9:16 壁纸</button>'
      + '</div>'
      + '<div class="ai-model-badge" id="aiModelBadgeDisplay">IMAGEN 3.0</div>'
      + '</div>'

      + '<div class="ai-preview-stage" id="aiPreviewStage">'
      + '<img id="aiResultImg" src="" alt="AI生成图像">'
      + '<div class="ai-stage-empty">'
      + '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
      + '<span>输入提示词，轻点下方开始绘图</span>'
      + '</div>'
      + '<div class="ai-generating-box">'
      + '<svg class="ai-generating-crystal" viewBox="0 0 48 48">'
      + '<circle cx="24" cy="24" r="2" fill="#88abda"/>'
      + '<polygon points="24,6 28,20 24,24 20,20" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '<polygon points="24,42 28,28 24,24 20,28" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '<polygon points="6,24 20,20 24,24 20,28" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '<polygon points="42,24 28,20 24,24 28,28" stroke="#88abda" stroke-width="1.5" fill="none"/>'
      + '</svg>'
      + '<span class="ai-generating-text">正在勾勒光影与细节...</span>'
      + '</div>'
      + '</div>'

      + '</div>'

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

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay && !isGenerating) closeModal();
      });
    }

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

    // 智能优化提示词（润色成二次元精致光影）
    if (autoPromptBtn) {
      autoPromptBtn.addEventListener('click', function() {
        var raw = (promptInput.value || '').trim();
        if (!raw) {
          promptInput.value = '精致美少年立绘，银白微卷碎发，深邃蓝眸，冷冽温柔神情，极致光影，杰作，8k分辨率';
        } else {
          promptInput.value = raw + ', 精致细腻五官, 唯美氛围光影, 杰作, 极高画质, anime aesthetic masterpiece';
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
        if (window.ImgBed && typeof window.ImgBed.addImage === 'function') {
          window.ImgBed.addImage(currentGeneratedUrl, 'AI绘制立绘 - ' + new Date().toLocaleDateString());
          if (window.AppNav) AppNav.showToast('✦ 已成功存入图床 ✦');
        } else if (window.AppDB) {
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

  // 执行生图核心请求
  function executeGeneration(prompt) {
    var activeApi = (window.ApiConfig && typeof window.ApiConfig.getActive === 'function') ? window.ApiConfig.getActive() : null;
    
    if (!activeApi || !activeApi.url || !activeApi.key) {
      if (window.AppNav) AppNav.showToast('请先在「设置 ➔ API配置」中配置接口');
      return;
    }

    var baseUrl = activeApi.url.replace(/\/+$/, '');
    var endpoint = baseUrl.endsWith('/v1') ? (baseUrl + '/images/generations') : (baseUrl + '/v1/images/generations');
    
    // 如果设置里的模型名包含生图特征则直接使用，否则默认使用顶级生图模型
    var modelName = activeApi.model;
    if (!modelName || !/(image|flux|dall|sd|midjourney)/i.test(modelName)) {
      modelName = DEFAULT_IMAGE_MODEL;
    }

    var sizeInfo = RATIO_SIZE_MAP[currentRatio] || RATIO_SIZE_MAP['3:4'];

    setGeneratingState(true);

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer ' + activeApi.key
      },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        n: 1,
        size: sizeInfo.sizeStr,
        response_format: 'url'
      })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      setGeneratingState(false);
      var imageUrl = '';
      if (data && data.data && data.data[0]) {
        imageUrl = data.data[0].url || (data.data[0].b64_json ? ('data:image/png;base64,' + data.data[0].b64_json) : '');
      }

      if (imageUrl) {
        showGeneratedResult(imageUrl);
        if (window.AppNav) AppNav.showToast('✦ 绘制完成 ✦');
      } else {
        throw new Error('未返回有效图像链接');
      }
    })
    .catch(function(err) {
      setGeneratingState(false);
      if (window.AppNav) AppNav.showToast('绘图失败: ' + (err.message || '请检查API'));
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
    var modelBadge = document.getElementById('aiModelBadgeDisplay');

    if (stage) stage.classList.remove('has-result', 'is-generating');
    if (promptInput) {
      promptInput.value = (options && options.defaultPrompt) ? options.defaultPrompt : '';
    }

    var activeApi = (window.ApiConfig && typeof window.ApiConfig.getActive === 'function') ? window.ApiConfig.getActive() : null;
    if (modelBadge) {
      modelBadge.textContent = (activeApi && activeApi.model) ? activeApi.model.toUpperCase() : 'IMAGEN 3.0';
    }

    if (overlay) overlay.classList.add('show');
  }

  function closeModal() {
    var overlay = document.getElementById('aiImageModalOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  // 挂载全局调用对象
  window.AppAiImage = {
    openStudio: openStudio,
    closeStudio: closeModal
  };

  // 页面加载完成后预初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModalDOM);
  } else {
    createModalDOM();
  }

})();

