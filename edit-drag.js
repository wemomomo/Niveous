(function(){
  'use strict';

  var pageContainer = document.querySelector('.page-container');
  var appShell = document.querySelector('.app-shell');
  var resetLayoutBtn = document.getElementById('resetLayoutBtn');
  var addHomeBgBtn = document.getElementById('addHomeBgBtn');
  var editHomeBgBtn = document.getElementById('editHomeBgBtn');

  var homeBgLayer = document.getElementById('homeBgLayer');
  var homeBgDimOverlay = document.getElementById('homeBgDimOverlay');
  var homeBgWhiteOverlay = document.getElementById('homeBgWhiteOverlay');

  var longPressTimer = null;
  var isEditMode = false;

  var dragElement = null;
  var dragStartY = 0;
  var dragCurrentY = 0;

  var touchStartX = 0;
  var touchStartY = 0;

  var defaultOrder = ['card', 'message', 'couple'];

  window.addEventListener('dbReady', function() {
    loadDragPositions();
    loadHomeBg();
    setupHomeBgActions();
  });

  // ============ 长按空白处进入/退出编辑模式 ============
  pageContainer.addEventListener('touchstart', function(e) {
    var homePage = document.querySelector('.page[data-page="home"]');
    if (!homePage || !homePage.classList.contains('active')) return;

    var target = e.target;
    if (target === pageContainer || target.classList.contains('page')) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      longPressTimer = setTimeout(function() {
        if (!isEditMode) enterEditMode();
        else exitEditMode();
      }, 200);
    }
  }, { passive: true });

  pageContainer.addEventListener('touchend', function() { clearTimeout(longPressTimer); });
  pageContainer.addEventListener('touchcancel', function() { clearTimeout(longPressTimer); });
  pageContainer.addEventListener('touchmove', function(e) {
    var dx = Math.abs(e.touches[0].clientX - touchStartX);
    var dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > 10 || dy > 10) clearTimeout(longPressTimer);
  }, { passive: true });

  // ============ 编辑模式切换 ============
  function enterEditMode() {
    isEditMode = true;
    appShell.classList.add('edit-mode');
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }

  function exitEditMode() {
    isEditMode = false;
    appShell.classList.remove('edit-mode');
  }

  // ============ 恢复初始排布 ============
  if (resetLayoutBtn) {
    resetLayoutBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var confirmed = confirm('确定要恢复初始排布吗？');
      if (!confirmed) return;
      
      var page = document.querySelector('[data-page="home"]');
      if (!page) return;
      
      defaultOrder.forEach(function(componentName) {
        var el = page.querySelector('[data-component="' + componentName + '"]');
        if (el) page.appendChild(el);
      });
      
      if (window.AppDB) {
        AppDB.delete('drag_order', function() {
          if (window.AppNav) AppNav.showToast('已恢复初始排布');
        });
      }
    });
  }

  // ============ 背景添加与编辑 ============
  var homeBgFileInput = document.createElement('input');
  homeBgFileInput.type = 'file';
  homeBgFileInput.accept = 'image/*';
  homeBgFileInput.style.display = 'none';
  document.body.appendChild(homeBgFileInput);

  var homeBgPopup = null;
  var homeBgPopupMask = null;

  function setupHomeBgActions() {
    // 1. 添加背景按钮
    if (addHomeBgBtn) {
      addHomeBgBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        PhotoAction.show(
          function() { homeBgFileInput.click(); },
          function() {
            if (homeBgLayer) homeBgLayer.style.backgroundImage = '';
            AppDB.delete('home_bg_img');
            if (window.AppNav) AppNav.showToast('桌面背景已清除');
          }
        );
      });
    }

    homeBgFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        AppCropper.open(e.target.result, { aspectRatio: window.innerWidth / window.innerHeight }, function(croppedData) {
          if (homeBgLayer) homeBgLayer.style.backgroundImage = 'url(' + croppedData + ')';
          AppDB.save('home_bg_img', croppedData);
          if (window.AppNav) AppNav.showToast('背景已设置');
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    // 2. 背景编辑按钮
    if (editHomeBgBtn) {
      editHomeBgBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showHomeBgPopup();
      });
    }
  }

  function showHomeBgPopup() {
    if (!homeBgPopup) {
      homeBgPopupMask = document.createElement('div');
      homeBgPopupMask.className = 'popup-mask';
      document.body.appendChild(homeBgPopupMask);
      homeBgPopupMask.addEventListener('click', hideHomeBgPopup);

      homeBgPopup = document.createElement('div');
      homeBgPopup.className = 'popup-card';
      homeBgPopup.innerHTML = 
        '<div class="popup-card-title">背景效果编辑</div>' +
        '<div class="popup-card-row">' +
          '<span>虚化模糊</span>' +
          '<input type="range" id="bgBlurSlider" min="0" max="30" value="0">' +
          '<span class="popup-card-value" id="bgBlurValue">0px</span>' +
        '</div>' +
        '<div class="popup-card-row">' +
          '<span>变暗遮罩</span>' +
          '<input type="range" id="bgDimSlider" min="0" max="100" value="0">' +
          '<span class="popup-card-value" id="bgDimValue">0%</span>' +
        '</div>' +
        '<div class="popup-card-row">' +
          '<span>白色遮罩</span>' +
          '<input type="range" id="bgWhiteSlider" min="0" max="100" value="0">' +
          '<span class="popup-card-value" id="bgWhiteValue">0%</span>' +
        '</div>';
      document.body.appendChild(homeBgPopup);

      document.getElementById('bgBlurSlider').addEventListener('input', applyHomeBgFilterFromControls);
      document.getElementById('bgDimSlider').addEventListener('input', applyHomeBgFilterFromControls);
      document.getElementById('bgWhiteSlider').addEventListener('input', applyHomeBgFilterFromControls);
    }

    loadHomeBgControls();
    positionHomeBgPopup();
    homeBgPopupMask.classList.add('show');
    homeBgPopup.classList.add('show');
  }

  function hideHomeBgPopup() {
    if (homeBgPopup) homeBgPopup.classList.remove('show');
    if (homeBgPopupMask) homeBgPopupMask.classList.remove('show');
  }

  function positionHomeBgPopup() {
    var btnRect = editHomeBgBtn.getBoundingClientRect();
    homeBgPopup.style.visibility = 'hidden';
    homeBgPopup.style.display = 'flex';
    var popupH = homeBgPopup.offsetHeight;
    homeBgPopup.style.visibility = '';
    homeBgPopup.style.display = '';

    var top = btnRect.bottom + 10;
    if (top + popupH > window.innerHeight - 20) {
      top = btnRect.top - popupH - 10;
    }
    homeBgPopup.style.left = '16px';
    homeBgPopup.style.top = top + 'px';
  }

  function applyHomeBgFilterFromControls() {
    var blurSlider = document.getElementById('bgBlurSlider');
    var dimSlider = document.getElementById('bgDimSlider');
    var whiteSlider = document.getElementById('bgWhiteSlider');

    var blurVal = blurSlider.value;
    var dimVal = dimSlider.value;
    var whiteVal = whiteSlider.value;

    document.getElementById('bgBlurValue').textContent = blurVal + 'px';
    document.getElementById('bgDimValue').textContent = dimVal + '%';
    document.getElementById('bgWhiteValue').textContent = whiteVal + '%';

    applyHomeBgStyles(blurVal, dimVal / 100, whiteVal / 100);

    var config = {
      blur: blurVal,
      dim: dimVal,
      white: whiteVal
    };
    AppDB.save('home_bg_effects', config);
  }

  function applyHomeBgStyles(blurPx, dimAlpha, whiteAlpha) {
    if (homeBgLayer) {
      homeBgLayer.style.filter = blurPx > 0 ? ('blur(' + blurPx + 'px)') : 'none';
      // 虚化时轻微放大防止白边
      homeBgLayer.style.transform = blurPx > 0 ? 'scale(1.05)' : 'none';
    }
    if (homeBgDimOverlay) homeBgDimOverlay.style.opacity = dimAlpha;
    if (homeBgWhiteOverlay) homeBgWhiteOverlay.style.opacity = whiteAlpha;
  }

  function loadHomeBgControls() {
    AppDB.get('home_bg_effects', function(config) {
      if (!config) return;
      var blurSlider = document.getElementById('bgBlurSlider');
      var dimSlider = document.getElementById('bgDimSlider');
      var whiteSlider = document.getElementById('bgWhiteSlider');
      if (blurSlider) {
        blurSlider.value = config.blur || 0;
        document.getElementById('bgBlurValue').textContent = blurSlider.value + 'px';
      }
      if (dimSlider) {
        dimSlider.value = config.dim || 0;
        document.getElementById('bgDimValue').textContent = dimSlider.value + '%';
      }
      if (whiteSlider) {
        whiteSlider.value = config.white || 0;
        document.getElementById('bgWhiteValue').textContent = whiteSlider.value + '%';
      }
    });
  }

  function loadHomeBg() {
    AppDB.get('home_bg_img', function(data) {
      if (data && homeBgLayer) {
        homeBgLayer.style.backgroundImage = 'url(' + data + ')';
      }
    });
    AppDB.get('home_bg_effects', function(config) {
      if (config) {
        applyHomeBgStyles(config.blur || 0, (config.dim || 0) / 100, (config.white || 0) / 100);
      }
    });
  }

  // ============ 丝滑跟手拖拽 ============
  var draggables = document.querySelectorAll('.draggable');

  draggables.forEach(function(el) {
    el.addEventListener('touchstart', function(e) {
      if (!isEditMode) return;

      var target = e.target;
      if (target.classList.contains('edit-btn') ||
          target.closest('.edit-btn') ||
          target.classList.contains('reset-layout-btn') ||
          target.closest('.reset-layout-btn') ||
          target.classList.contains('edit-tool-btn') ||
          target.closest('.edit-tool-btn')) {
        return;
      }

      clearTimeout(longPressTimer);

      dragElement = el;
      dragStartY = e.touches[0].clientY;
      dragCurrentY = 0;

      el.classList.add('dragging');
    }, { passive: true });
  });

  document.addEventListener('touchmove', function(e) {
    if (!dragElement) return;
    if (e.cancelable) e.preventDefault();

    var y = e.touches[0].clientY;
    dragCurrentY = y - dragStartY;

    dragElement.style.transform = 'translateY(' + dragCurrentY + 'px) scale(1.02)';
  }, { passive: false });

  document.addEventListener('touchend', function() {
    if (!dragElement) return;

    dragElement.classList.remove('dragging');

    var dragRect = dragElement.getBoundingClientRect();
    var dragCenterY = dragRect.top + dragRect.height / 2;

    var parent = dragElement.parentElement;
    var allItems = Array.from(parent.querySelectorAll('.draggable'));

    var insertBefore = null;
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (item === dragElement) continue;
      
      var itemRect = item.getBoundingClientRect();
      var itemCenterY = itemRect.top + itemRect.height / 2;
      
      if (dragCenterY < itemCenterY) {
        insertBefore = item;
        break;
      }
    }

    dragElement.style.transform = '';

    if (insertBefore) {
      parent.insertBefore(dragElement, insertBefore);
    } else {
      parent.appendChild(dragElement);
    }

    saveDragPositions();
    dragElement = null;
    dragCurrentY = 0;
  });

  function saveDragPositions() {
    var page = document.querySelector('.page.active');
    if (!page) return;
    var items = Array.from(page.querySelectorAll('.draggable'));
    var order = items.map(function(item) {
      return item.dataset.component;
    });
    if (window.AppDB) AppDB.save('drag_order', order);
  }

  function loadDragPositions() {
    if (!window.AppDB) return;
    AppDB.get('drag_order', function(order) {
      if (!order || !order.length) return;
      var page = document.querySelector('[data-page="home"]');
      if (!page) return;

      order.forEach(function(componentName) {
        var el = page.querySelector('[data-component="' + componentName + '"]');
        if (el) page.appendChild(el);
      });
    });
  }

  window.EditMode = {
    enter: enterEditMode,
    exit: exitEditMode
  };

})();