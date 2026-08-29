(function(){
  'use strict';

  var pageContainer = document.querySelector('.page-container');
  var appShell = document.querySelector('.app-shell');
  var resetLayoutBtn = document.getElementById('resetLayoutBtn');
  var addHomeBgBtn = document.getElementById('addHomeBgBtn');
  var homeBgLayer = document.getElementById('homeBgLayer');

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

  // ============ 背景添加与删除 ============
  var homeBgFileInput = document.createElement('input');
  homeBgFileInput.type = 'file';
  homeBgFileInput.accept = 'image/*';
  homeBgFileInput.style.display = 'none';
  document.body.appendChild(homeBgFileInput);

  function setupHomeBgActions() {
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
  }

  function loadHomeBg() {
    AppDB.get('home_bg_img', function(data) {
      if (data && homeBgLayer) {
        homeBgLayer.style.backgroundImage = 'url(' + data + ')';
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