(function(){
  'use strict';

  window.addEventListener('dbReady', init);

  function init() {
    setupCard();
    setupMessage();
  }

  // ============ 卡片模块 ============
  function setupCard() {
    var cardBg = document.getElementById('cardBg');
    var cardUpper = document.getElementById('cardUpper');
    var avatarBtn = document.getElementById('avatarBtn');
    var avatarImg = document.getElementById('avatarImg');
    var lowerOverlay = document.getElementById('lowerOverlay');
    var infoTexts = document.querySelectorAll('.info-text[data-key]');
    var locationText = document.querySelector('.location-text');

    var bgFileInput = document.createElement('input');
    bgFileInput.type = 'file'; bgFileInput.accept = 'image/*';
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    // --- 点击背景 ---
    cardUpper.addEventListener('click', function() {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { bgFileInput.click(); },
        function() {
          cardBg.style.backgroundImage = '';
          cardBg.classList.remove('has-bg');
          AppDB.delete('card_bg');
          saveCardState();
        }
      );
    });

    // --- 点击头像 ---
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { avatarFileInput.click(); },
        function() {
          avatarImg.src = '';
          avatarBtn.classList.remove('has-img');
          AppDB.delete('card_avatar');
          saveCardState();
        }
      );
    });

    // --- 背景上传+裁剪 ---
    bgFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        AppCropper.open(e.target.result, { aspectRatio: 16/11 }, function(croppedData) {
          cardBg.style.backgroundImage = 'url(' + croppedData + ')';
          cardBg.classList.add('has-bg');
          AppDB.save('card_bg', croppedData);
          saveCardState();
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    // --- 头像上传+裁剪 ---
    avatarFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        AppCropper.open(e.target.result, { aspectRatio: 1 }, function(croppedData) {
          avatarImg.src = croppedData;
          avatarBtn.classList.add('has-img');
          AppDB.save('card_avatar', croppedData);
          saveCardState();
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    // --- 文字保存 ---
    infoTexts.forEach(function(el) { el.addEventListener('blur', saveCardState); });
    if (locationText) locationText.addEventListener('blur', saveCardState);

    // --- 编辑气泡卡片 ---
    var cardEditBtn = document.querySelector('[data-edit-target="card"]');
    var cardPopup = null;
    var cardPopupMask = null;

    if (cardEditBtn) {
      cardEditBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showCardPopup();
      });
    }

    function showCardPopup() {
      if (!cardPopup) {
        cardPopupMask = document.createElement('div');
        cardPopupMask.className = 'popup-mask';
        document.body.appendChild(cardPopupMask);
        cardPopupMask.addEventListener('click', hideCardPopup);

        cardPopup = document.createElement('div');
        cardPopup.className = 'popup-card';
        cardPopup.innerHTML = '<div class="popup-card-title">卡片设置</div>'
          + '<div class="popup-card-row"><span>毛玻璃</span>'
          + '<div class="toggle-switch"><input type="checkbox" id="cardGlassToggle"><label for="cardGlassToggle"></label></div></div>'
          + '<div class="popup-card-row"><span>背景颜色</span>'
          + '<input type="color" id="cardColorPicker" value="#ffffff"></div>'
          + '<div class="popup-card-row"><span>透明度</span>'
          + '<input type="range" id="cardOpacitySlider" min="0" max="100" value="80">'
          + '<span class="popup-card-value" id="cardOpacityValue">80%</span></div>';
        document.body.appendChild(cardPopup);

        document.getElementById('cardGlassToggle').addEventListener('change', applyCardOverlay);
        document.getElementById('cardColorPicker').addEventListener('input', applyCardOverlay);
        document.getElementById('cardOpacitySlider').addEventListener('input', applyCardOverlay);
      }

      loadStyleToControls();
      positionCardPopup();
      cardPopupMask.classList.add('show');
      cardPopup.classList.add('show');
    }

    function hideCardPopup() {
      if (cardPopup) cardPopup.classList.remove('show');
      if (cardPopupMask) cardPopupMask.classList.remove('show');
      saveCardState();
    }

    function positionCardPopup() {
      var cardRect = document.getElementById('profileCard').getBoundingClientRect();
      var windowW = window.innerWidth;
      var windowH = window.innerHeight;

      cardPopup.style.visibility = 'hidden';
      cardPopup.style.display = 'flex';
      var popupW = cardPopup.offsetWidth;
      var popupH = cardPopup.offsetHeight;
      cardPopup.style.visibility = '';
      cardPopup.style.display = '';

      var left = cardRect.left + cardRect.width / 2 - popupW / 2;
      var top = cardRect.bottom + 10;

      if (left < 12) left = 12;
      if (left + popupW > windowW - 12) left = windowW - popupW - 12;
      if (top + popupH > windowH - 20) {
        top = cardRect.top - popupH - 10;
      }

      cardPopup.style.left = left + 'px';
      cardPopup.style.top = top + 'px';
    }

    function loadStyleToControls() {
      AppDB.get('card_state', function(state) {
        if (!state || !state.style) return;
        var glassToggle = document.getElementById('cardGlassToggle');
        var colorPicker = document.getElementById('cardColorPicker');
        var opacitySlider = document.getElementById('cardOpacitySlider');
        var opacityValue = document.getElementById('cardOpacityValue');
        if (glassToggle) glassToggle.checked = state.style.glass;
        if (colorPicker) colorPicker.value = state.style.color;
        if (opacitySlider) opacitySlider.value = state.style.opacity;
        if (opacityValue) opacityValue.textContent = state.style.opacity + '%';
        applyCardOverlay();
      });
    }

    function applyCardOverlay() {
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var glassToggle = document.getElementById('cardGlassToggle');
      var opacityValue = document.getElementById('cardOpacityValue');
      if (!colorPicker || !opacitySlider || !glassToggle) return;
      var color = colorPicker.value;
      var opacity = opacitySlider.value / 100;
      if (opacityValue) opacityValue.textContent = opacitySlider.value + '%';
      var r = parseInt(color.slice(1,3), 16);
      var g = parseInt(color.slice(3,5), 16);
      var b = parseInt(color.slice(5,7), 16);
      lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
      if (glassToggle.checked) lowerOverlay.classList.add('glass-effect');
      else lowerOverlay.classList.remove('glass-effect');
    }

    function saveCardState() {
      var glassToggle = document.getElementById('cardGlassToggle');
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var state = {
        hasBg: cardBg.classList.contains('has-bg'),
        hasAvatar: avatarBtn.classList.contains('has-img'),
        texts: {},
        style: {
          glass: glassToggle ? glassToggle.checked : false,
          color: colorPicker ? colorPicker.value : '#ffffff',
          opacity: opacitySlider ? opacitySlider.value : 80
        }
      };
      infoTexts.forEach(function(el) {
        var key = el.dataset.key;
        if (key !== 'line4') state.texts[key] = el.textContent.trim();
      });
      state.texts['line4text'] = locationText ? locationText.textContent.trim() : '';
      AppDB.save('card_state', state);
    }

    function loadCardState() {
      AppDB.get('card_bg', function(bgData) {
        if (bgData) {
          cardBg.style.backgroundImage = 'url(' + bgData + ')';
          cardBg.classList.add('has-bg');
        }
      });
      AppDB.get('card_avatar', function(avatarData) {
        if (avatarData) {
          avatarImg.src = avatarData;
          avatarBtn.classList.add('has-img');
        }
      });
      AppDB.get('card_state', function(state) {
        if (!state) return;
        if (state.texts) {
          Object.keys(state.texts).forEach(function(key) {
            if (key === 'line4text') {
              if (locationText) locationText.textContent = state.texts[key];
            } else {
              var el = document.querySelector('[data-key="' + key + '"]');
              if (el) el.textContent = state.texts[key];
            }
          });
        }
        if (state.style) {
          setTimeout(function() { applyCardOverlay(); }, 100);
        }
      });
    }
    loadCardState();
  }

  // ============ 消息框模块 ============
  function setupMessage() {
    var messageAvatar = document.getElementById('messageAvatar');
    var messageAvatarImg = document.getElementById('messageAvatarImg');
    var messagePreview = document.getElementById('messagePreview');
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    if (messageAvatar) {
      messageAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        PhotoAction.show(
          function() { avatarFileInput.click(); },
          function() {
            messageAvatarImg.src = '';
            messageAvatar.classList.remove('has-img');
            AppDB.delete('message_avatar');
          }
        );
      });
    }

    avatarFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        AppCropper.open(e.target.result, { aspectRatio: 1 }, function(croppedData) {
          messageAvatarImg.src = croppedData;
          messageAvatar.classList.add('has-img');
          AppDB.save('message_avatar', croppedData);
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    AppDB.get('message_avatar', function(data) {
      if (data && messageAvatarImg) {
        messageAvatarImg.src = data;
        messageAvatar.classList.add('has-img');
      }
    });
    AppDB.get('message_preview', function(text) {
      if (text && messagePreview) messagePreview.textContent = text;
    });

    if (messagePreview) {
      messagePreview.addEventListener('blur', function() {
        AppDB.save('message_preview', this.textContent.trim());
      });
    }
  }

})();

// ========== 头像展示区（独立模块） ==========
(function() {
  'use strict';

  var coupleData = {
    speech1: '对话1',
    speech2: '对话2',
    name1: 'TA',
    name2: '我',
    avatar1: null,
    avatar2: null,
    startDate: null
  };

  var _coupleFileInput = null;
  function couplePickFile(callback) {
    if (_coupleFileInput && _coupleFileInput.parentNode) _coupleFileInput.parentNode.removeChild(_coupleFileInput);
    _coupleFileInput = document.createElement('input');
    _coupleFileInput.type = 'file';
    _coupleFileInput.accept = 'image/*';
    _coupleFileInput.style.cssText = 'position:fixed;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(_coupleFileInput);
    _coupleFileInput.addEventListener('change', function() {
      var file = _coupleFileInput.files[0];
      if (_coupleFileInput.parentNode) _coupleFileInput.parentNode.removeChild(_coupleFileInput);
      _coupleFileInput = null;
      if (file && callback) callback(file);
    });
    _coupleFileInput.click();
  }

  window.addEventListener('dbReady', function() {
    loadCoupleData(function() {
      applyCoupleData();
      bindCoupleEvents();
      renderDateCard();
    });
  });

  function applyCoupleData() {
    var s1 = document.getElementById('coupleSpeech1');
    var s2 = document.getElementById('coupleSpeech2');
    var n1 = document.getElementById('coupleName1');
    var n2 = document.getElementById('coupleName2');
    var img1 = document.getElementById('coupleAvatarImg1');
    var img2 = document.getElementById('coupleAvatarImg2');
    var circle1 = document.getElementById('coupleAvatar1');
    var circle2 = document.getElementById('coupleAvatar2');

    if (s1) s1.textContent = coupleData.speech1;
    if (s2) s2.textContent = coupleData.speech2;
    if (n1) n1.textContent = coupleData.name1;
    if (n2) n2.textContent = coupleData.name2;

    if (coupleData.avatar1 && img1) {
      img1.src = coupleData.avatar1;
      circle1.classList.add('has-img');
    }
    if (coupleData.avatar2 && img2) {
      img2.src = coupleData.avatar2;
      circle2.classList.add('has-img');
    }
  }

  function bindCoupleEvents() {
    var editables = [
      ['coupleSpeech1', 'speech1'],
      ['coupleSpeech2', 'speech2'],
      ['coupleName1', 'name1'],
      ['coupleName2', 'name2']
    ];
    editables.forEach(function(pair) {
      var el = document.getElementById(pair[0]);
      if (el) {
        el.addEventListener('blur', function() {
          coupleData[pair[1]] = this.textContent.trim() || '';
          saveCoupleData();
          if (pair[1] === 'name1') updateDateName();
        });
      }
    });

    var circle1 = document.getElementById('coupleAvatar1');
    var circle2 = document.getElementById('coupleAvatar2');
    if (circle1) circle1.addEventListener('click', function() { handleAvatarClick(1); });
    if (circle2) circle2.addEventListener('click', function() { handleAvatarClick(2); });

    var daysEl = document.getElementById('dateDaysCount');
    var dateInput = document.getElementById('dateStartInput');
    if (daysEl && dateInput) {
      daysEl.addEventListener('click', function() {
        dateInput.showPicker ? dateInput.showPicker() : dateInput.click();
      });
      dateInput.addEventListener('change', function() {
        coupleData.startDate = this.value || null;
        saveCoupleData();
        renderDateCard();
      });
    }
  }

  function handleAvatarClick(idx) {
    var key = 'avatar' + idx;
    if (coupleData[key]) {
      window.PhotoAction.show(
        function() { pickCoupleAvatar(idx); },
        function() { deleteCoupleAvatar(idx); }
      );
    } else {
      pickCoupleAvatar(idx);
    }
  }

  function pickCoupleAvatar(idx) {
    couplePickFile(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        window.AppCropper.open(e.target.result, { aspectRatio: 1 }, function(cropped) {
          coupleData['avatar' + idx] = cropped;
          var img = document.getElementById('coupleAvatarImg' + idx);
          var circle = document.getElementById('coupleAvatar' + idx);
          if (img) img.src = cropped;
          if (circle) circle.classList.add('has-img');
          saveCoupleData();
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function deleteCoupleAvatar(idx) {
    coupleData['avatar' + idx] = null;
    var img = document.getElementById('coupleAvatarImg' + idx);
    var circle = document.getElementById('coupleAvatar' + idx);
    if (img) img.removeAttribute('src');
    if (circle) circle.classList.remove('has-img');
    saveCoupleData();
  }

  function updateDateName() {
    var nameEl = document.getElementById('datePartnerName');
    if (nameEl) nameEl.textContent = coupleData.name1 || 'TA';
  }

  function renderDateCard() {
    var daysEl = document.getElementById('dateDaysCount');
    var datesEl = document.getElementById('dateWeekDates');
    var dateInput = document.getElementById('dateStartInput');

    if (!daysEl || !datesEl) return;

    updateDateName();

    if (dateInput && coupleData.startDate) {
      dateInput.value = coupleData.startDate;
    }

    var days = 0;
    if (coupleData.startDate) {
      var parts = coupleData.startDate.split('-');
      var start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      var now = new Date();
      now.setHours(0, 0, 0, 0);
      days = Math.floor((now - start) / 86400000);
      if (days < 0) days = 0;
    }
    daysEl.textContent = days;

    var today = new Date();
    var dayOfWeek = today.getDay();
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    var html = '';
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      var isToday = d.getDate() === today.getDate()
        && d.getMonth() === today.getMonth()
        && d.getFullYear() === today.getFullYear();
      html += '<span' + (isToday ? ' class="today"' : '') + '>' + d.getDate() + '</span>';
    }
    datesEl.innerHTML = html;
  }

  function loadCoupleData(callback) {
    if (!window.AppDB) { if (callback) callback(); return; }
    AppDB.get('couple_data', function(val) {
      if (val) {
        for (var k in val) { if (val.hasOwnProperty(k)) coupleData[k] = val[k]; }
      }
      if (callback) callback();
    });
  }

  function saveCoupleData() {
    if (!window.AppDB) return;
    AppDB.save('couple_data', coupleData);
  }
})();