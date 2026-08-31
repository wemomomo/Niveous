
(function(){
  'use strict';

  window.addEventListener('dbReady', init);

  function init() {
    setupHomeBg();
    setupCard();
    setupMessage();
  }

  // ============ 全局全屏壁纸模块 ============
  function setupHomeBg() {
    var bgLayer = document.getElementById('homeBgLayer');
    var addBgBtn = document.getElementById('addHomeBgBtn');
    var bgFileInput = document.createElement('input');
    bgFileInput.type = 'file'; bgFileInput.accept = 'image/*';

    if (addBgBtn) {
      addBgBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        PhotoAction.show(
          function() { bgFileInput.click(); },
          function() {
            if (bgLayer) bgLayer.style.backgroundImage = '';
            AppDB.delete('home_bg_img');
          }
        );
      });
    }

    bgFileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        AppCropper.open(e.target.result, { aspectRatio: 9/16 }, function(croppedData) {
          if (bgLayer) bgLayer.style.backgroundImage = 'url(' + croppedData + ')';
          AppDB.save('home_bg_img', croppedData);
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    AppDB.get('home_bg_img', function(bgData) {
      if (bgData && bgLayer) {
        bgLayer.style.backgroundImage = 'url(' + bgData + ')';
      } else if (bgLayer) {
        bgLayer.style.backgroundImage = '';
      }
    });
  }

  // ============ 个人卡片模块 ============
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

    infoTexts.forEach(function(el) { el.addEventListener('blur', saveCardState); });
    if (locationText) locationText.addEventListener('blur', saveCardState);

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

      cardPopup.style.visibility = 'hidden';
      cardPopup.style.display = 'block';
      var popupW = cardPopup.offsetWidth;
      cardPopup.style.visibility = '';
      cardPopup.style.display = '';

      var left = cardRect.left + cardRect.width / 2 - popupW / 2;
      var top = cardRect.bottom + 10;

      if (left < 12) left = 12;
      if (left + popupW > windowW - 12) left = windowW - popupW - 12;

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
      // 显式清理，彻底消灭幽灵背景残留
      AppDB.get('card_bg', function(bgData) {
        if (bgData) {
          cardBg.style.backgroundImage = 'url(' + bgData + ')';
          cardBg.classList.add('has-bg');
        } else {
          cardBg.style.backgroundImage = '';
          cardBg.classList.remove('has-bg');
        }
      });
      AppDB.get('card_avatar', function(avatarData) {
        if (avatarData) {
          avatarImg.src = avatarData;
          avatarBtn.classList.add('has-img');
        } else {
          avatarImg.src = '';
          avatarBtn.classList.remove('has-img');
        }
      });
      AppDB.get('card_state', function(state) {
        if (!state) {
          lowerOverlay.style.backgroundColor = 'rgba(255,255,255,0.8)';
          lowerOverlay.classList.remove('glass-effect');
          return;
        }
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
          setTimeout(function() {
            var color = state.style.color || '#ffffff';
            var opacity = (state.style.opacity !== undefined ? state.style.opacity : 80) / 100;
            var r = parseInt(color.slice(1,3), 16) || 255;
            var g = parseInt(color.slice(3,5), 16) || 255;
            var b = parseInt(color.slice(5,7), 16) || 255;
            lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
            if (state.style.glass) lowerOverlay.classList.add('glass-effect');
            else lowerOverlay.classList.remove('glass-effect');
          }, 50);
        }
      });
    }
    loadCardState();
  }

  // ============ 消息框模块（含胶囊样式精准同步） ============
  function setupMessage() {
    var messageAvatar = document.getElementById('messageAvatar');
    var messageAvatarImg = document.getElementById('messageAvatarImg');
    var messagePreview = document.getElementById('messagePreview');
    var messageBadge = document.getElementById('messageBadge');
    var messageBadgeText = document.getElementById('messageBadgeText');
    var messageBadgeIcon = document.getElementById('messageBadgeIcon');

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

    if (messagePreview) {
      messagePreview.addEventListener('blur', function() {
        AppDB.save('message_preview', this.textContent.trim());
      });
    }

    // 胶囊编辑弹窗
    var msgEditBtn = document.querySelector('[data-edit-target="message"]');
    var msgPopup = null;
    var msgPopupMask = null;

    if (msgEditBtn) {
      msgEditBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showMsgPopup();
      });
    }

    function showMsgPopup() {
      if (!msgPopup) {
        msgPopupMask = document.createElement('div');
        msgPopupMask.className = 'popup-mask';
        document.body.appendChild(msgPopupMask);
        msgPopupMask.addEventListener('click', hideMsgPopup);

        msgPopup = document.createElement('div');
        msgPopup.className = 'popup-card';
        msgPopup.innerHTML = '<div class="popup-card-title">消息角标设置</div>'
          + '<div class="popup-card-row"><span>文字内容</span>'
          + '<input type="text" id="badgeTextInput" style="width:110px;height:28px;border:1px solid #e5e5ea;border-radius:6px;padding:0 6px;font-size:12px;text-align:center;" value="new message"></div>'
          + '<div class="popup-card-row"><span>胶囊底色</span>'
          + '<input type="color" id="badgeBgColor" value="#000000"></div>'
          + '<div class="popup-card-row"><span>文字/图标颜色</span>'
          + '<input type="color" id="badgeTextColor" value="#ffffff"></div>';
        document.body.appendChild(msgPopup);

        document.getElementById('badgeTextInput').addEventListener('input', applyBadgeFromControls);
        document.getElementById('badgeBgColor').addEventListener('input', applyBadgeFromControls);
        document.getElementById('badgeTextColor').addEventListener('input', applyBadgeFromControls);
      }

      loadBadgeControls();
      positionMsgPopup();
      msgPopupMask.classList.add('show');
      msgPopup.classList.add('show');
    }

    function hideMsgPopup() {
      if (msgPopup) msgPopup.classList.remove('show');
      if (msgPopupMask) msgPopupMask.classList.remove('show');
      saveBadgeState();
    }

    function positionMsgPopup() {
      var cardRect = document.getElementById('messageCard').getBoundingClientRect();
      var windowW = window.innerWidth;
      msgPopup.style.visibility = 'hidden';
      msgPopup.style.display = 'block';
      var popupW = msgPopup.offsetWidth;
      msgPopup.style.visibility = '';
      msgPopup.style.display = '';

      var left = cardRect.left + cardRect.width / 2 - popupW / 2;
      var top = cardRect.bottom + 10;
      if (left < 12) left = 12;
      if (left + popupW > windowW - 12) left = windowW - popupW - 12;
      msgPopup.style.left = left + 'px';
      msgPopup.style.top = top + 'px';
    }

    function applyBadgeFromControls() {
      var t = document.getElementById('badgeTextInput').value;
      var bg = document.getElementById('badgeBgColor').value;
      var tc = document.getElementById('badgeTextColor').value;
      if (messageBadgeText) messageBadgeText.textContent = t;
      if (messageBadge) messageBadge.style.backgroundColor = bg;
      if (messageBadge) messageBadge.style.color = tc;
      if (messageBadgeIcon) messageBadgeIcon.style.color = tc;
      saveBadgeState();
    }

    function saveBadgeState() {
      var textInp = document.getElementById('badgeTextInput');
      var bgInp = document.getElementById('badgeBgColor');
      var tcInp = document.getElementById('badgeTextColor');
      var state = {
        text: textInp ? textInp.value : (messageBadgeText ? messageBadgeText.textContent : 'new message'),
        bg: bgInp ? bgInp.value : '#000000',
        color: tcInp ? tcInp.value : '#ffffff'
      };
      AppDB.save('msg_badge_state', state);
    }

    function loadBadgeControls() {
      AppDB.get('msg_badge_state', function(state) {
        if (!state) return;
        var textInp = document.getElementById('badgeTextInput');
        var bgInp = document.getElementById('badgeBgColor');
        var tcInp = document.getElementById('badgeTextColor');
        if (textInp) textInp.value = state.text || 'new message';
        if (bgInp) bgInp.value = state.bg || '#000000';
        if (tcInp) tcInp.value = state.color || '#ffffff';
      });
    }

    // 初始化加载
    AppDB.get('message_avatar', function(data) {
      if (data && messageAvatarImg) {
        messageAvatarImg.src = data;
        messageAvatar.classList.add('has-img');
      } else if (messageAvatar) {
        messageAvatarImg.src = '';
        messageAvatar.classList.remove('has-img');
      }
    });

    AppDB.get('message_preview', function(text) {
      if (text && messagePreview) messagePreview.textContent = text;
    });

    AppDB.get('msg_badge_state', function(state) {
      if (state) {
        if (messageBadgeText && state.text) messageBadgeText.textContent = state.text;
        if (messageBadge && state.bg) messageBadge.style.backgroundColor = state.bg;
        if (messageBadge && state.color) messageBadge.style.color = state.color;
        if (messageBadgeIcon && state.color) messageBadgeIcon.style.color = state.color;
      } else {
        if (messageBadge) {
          messageBadge.style.backgroundColor = '#000000';
          messageBadge.style.color = '#ffffff';
        }
        if (messageBadgeIcon) messageBadgeIcon.style.color = '#ffffff';
      }
    });
  }

})();

// ============ 头像展示区模块 ============
(function() {
  'use strict';

  var coupleData = {
    speech1: '♡',
    speech2: '♡',
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

    if (s1) s1.textContent = coupleData.speech1 || '♡';
    if (s2) s2.textContent = coupleData.speech2 || '♡';
    if (n1) n1.textContent = coupleData.name1 || 'TA';
    if (n2) n2.textContent = coupleData.name2 || '我';

    if (coupleData.avatar1 && img1) {
      img1.src = coupleData.avatar1;
      circle1.classList.add('has-img');
    } else if (circle1) {
      if (img1) img1.removeAttribute('src');
      circle1.classList.remove('has-img');
    }

    if (coupleData.avatar2 && img2) {
      img2.src = coupleData.avatar2;
      circle2.classList.add('has-img');
    } else if (circle2) {
      if (img2) img2.removeAttribute('src');
      circle2.classList.remove('has-img');
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
