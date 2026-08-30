
(function(){
  'use strict';

  window.addEventListener('dbReady', init);

  function init() {
    setupCard();
    setupMessage();
    setupCoupleStyle();
  }

  // ============ 通用智能弹窗定位函数 ============
  function positionSmartPopup(popupEl, targetEl) {
    if (!popupEl || !targetEl) return;
    var targetRect = targetEl.getBoundingClientRect();
    var windowW = window.innerWidth;
    var windowH = window.innerHeight;

    // 先展示以获取尺寸
    popupEl.style.visibility = 'hidden';
    popupEl.style.display = 'flex';
    var popupW = popupEl.offsetWidth || 240;
    var popupH = popupEl.offsetHeight || 260;
    popupEl.style.visibility = '';
    popupEl.style.display = '';

    // 水平居中并限制在屏幕内
    var left = targetRect.left + targetRect.width / 2 - popupW / 2;
    if (left < 16) left = 16;
    if (left + popupW > windowW - 16) left = windowW - popupW - 16;

    // 垂直智能判断：比较上方和下方的剩余空间
    var spaceAbove = targetRect.top;
    var spaceBelow = windowH - targetRect.bottom;

    var top = 0;
    if (spaceAbove >= popupH + 12 || spaceAbove > spaceBelow) {
      // 放在上方
      top = targetRect.top - popupH - 10;
    } else {
      // 放在下方
      top = targetRect.bottom + 10;
    }

    // 严格屏幕安全边界锁定，杜绝任何溢出或被遮挡
    var minTop = 20;
    var maxTop = windowH - popupH - 20;
    if (top < minTop) top = minTop;
    if (top > maxTop) top = maxTop;

    popupEl.style.left = Math.round(left) + 'px';
    popupEl.style.top = Math.round(top) + 'px';
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

    var cardState = {
      texts: { line1: '', line2: '', line3: '', line4text: '' },
      style: { glass: false, color: '#ffffff', opacity: 80 }
    };

    cardUpper.addEventListener('click', function() {
      if (document.querySelector('.app-shell').classList.contains('edit-mode')) return;
      PhotoAction.show(
        function() { bgFileInput.click(); },
        function() {
          cardBg.style.backgroundImage = '';
          cardBg.classList.remove('has-bg');
          AppDB.delete('card_bg');
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
        });
      };
      reader.readAsDataURL(file);
      this.value = '';
    });

    infoTexts.forEach(function(el) {
      var key = el.dataset.key;
      el.addEventListener('input', function() {
        cardState.texts[key] = this.textContent.trim();
        AppDB.save('card_state', cardState);
      });
      el.addEventListener('blur', function() {
        cardState.texts[key] = this.textContent.trim();
        AppDB.save('card_state', cardState);
      });
    });

    if (locationText) {
      locationText.addEventListener('input', function() {
        cardState.texts.line4text = this.textContent.trim();
        AppDB.save('card_state', cardState);
      });
      locationText.addEventListener('blur', function() {
        cardState.texts.line4text = this.textContent.trim();
        AppDB.save('card_state', cardState);
      });
    }

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

        document.getElementById('cardGlassToggle').addEventListener('change', applyCardStyleFromControls);
        document.getElementById('cardColorPicker').addEventListener('input', applyCardStyleFromControls);
        document.getElementById('cardOpacitySlider').addEventListener('input', applyCardStyleFromControls);
      }

      loadControlsFromState();
      positionSmartPopup(cardPopup, document.getElementById('profileCard'));
      cardPopupMask.classList.add('show');
      cardPopup.classList.add('show');
    }

    function hideCardPopup() {
      if (cardPopup) cardPopup.classList.remove('show');
      if (cardPopupMask) cardPopupMask.classList.remove('show');
    }

    function loadControlsFromState() {
      var glassToggle = document.getElementById('cardGlassToggle');
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var opacityValue = document.getElementById('cardOpacityValue');
      if (glassToggle) glassToggle.checked = !!cardState.style.glass;
      if (colorPicker) colorPicker.value = cardState.style.color || '#ffffff';
      if (opacitySlider) opacitySlider.value = (cardState.style.opacity !== undefined) ? cardState.style.opacity : 80;
      if (opacityValue) opacityValue.textContent = (cardState.style.opacity !== undefined ? cardState.style.opacity : 80) + '%';
    }

    function applyCardStyleFromControls() {
      var colorPicker = document.getElementById('cardColorPicker');
      var opacitySlider = document.getElementById('cardOpacitySlider');
      var glassToggle = document.getElementById('cardGlassToggle');
      var opacityValue = document.getElementById('cardOpacityValue');
      if (!colorPicker || !opacitySlider || !glassToggle) return;

      cardState.style.glass = glassToggle.checked;
      cardState.style.color = colorPicker.value;
      cardState.style.opacity = parseInt(opacitySlider.value, 10);

      if (opacityValue) opacityValue.textContent = opacitySlider.value + '%';
      renderCardOverlay(cardState.style);
      AppDB.save('card_state', cardState);
    }

    function renderCardOverlay(style) {
      if (!lowerOverlay || !style) return;
      var color = style.color || '#ffffff';
      var opacity = (style.opacity !== undefined ? style.opacity : 80) / 100;
      var r = parseInt(color.slice(1,3), 16) || 255;
      var g = parseInt(color.slice(3,5), 16) || 255;
      var b = parseInt(color.slice(5,7), 16) || 255;
      lowerOverlay.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
      if (style.glass) lowerOverlay.classList.add('glass-effect');
      else lowerOverlay.classList.remove('glass-effect');
    }

    function loadCardState() {
      AppDB.get('card_bg', function(bgData) {
        if (bgData && cardBg) {
          cardBg.style.backgroundImage = 'url(' + bgData + ')';
          cardBg.classList.add('has-bg');
        }
      });
      AppDB.get('card_avatar', function(avatarData) {
        if (avatarData && avatarImg) {
          avatarImg.src = avatarData;
          avatarBtn.classList.add('has-img');
        }
      });
      AppDB.get('card_state', function(saved) {
        if (saved) {
          if (saved.texts) {
            Object.keys(saved.texts).forEach(function(key) {
              cardState.texts[key] = saved.texts[key];
              if (key === 'line4text') {
                if (locationText) locationText.textContent = saved.texts[key];
              } else {
                var el = document.querySelector('[data-key="' + key + '"]');
                if (el) el.textContent = saved.texts[key];
              }
            });
          }
          if (saved.style) {
            cardState.style.glass = !!saved.style.glass;
            cardState.style.color = saved.style.color || '#ffffff';
            cardState.style.opacity = saved.style.opacity !== undefined ? saved.style.opacity : 80;
          }
        }
        renderCardOverlay(cardState.style);
      });
    }

    loadCardState();
  }

  // ============ 消息框模块 ============
  function setupMessage() {
    var messageAvatar = document.getElementById('messageAvatar');
    var messageAvatarImg = document.getElementById('messageAvatarImg');
    var messagePreview = document.getElementById('messagePreview');
    var messageBadge = document.getElementById('messageBadge');
    var avatarFileInput = document.createElement('input');
    avatarFileInput.type = 'file'; avatarFileInput.accept = 'image/*';

    var msgBadgeState = { bgColor: '#8e8e93', textColor: '#ffffff' };

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
      messagePreview.addEventListener('input', function() {
        AppDB.save('message_preview', this.textContent.trim());
      });
      messagePreview.addEventListener('blur', function() {
        AppDB.save('message_preview', this.textContent.trim());
      });
    }

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
          + '<div class="popup-card-row"><span>胶囊背景色</span>'
          + '<input type="color" id="msgBadgeBgColor" value="#8e8e93"></div>'
          + '<div class="popup-card-row"><span>文字与图标颜色</span>'
          + '<input type="color" id="msgBadgeTextColor" value="#ffffff"></div>';
        document.body.appendChild(msgPopup);

        document.getElementById('msgBadgeBgColor').addEventListener('input', applyMsgBadgeStyle);
        document.getElementById('msgBadgeTextColor').addEventListener('input', applyMsgBadgeStyle);
      }

      loadMsgBadgeControls();
      positionSmartPopup(msgPopup, document.getElementById('messageCard'));
      msgPopupMask.classList.add('show');
      msgPopup.classList.add('show');
    }

    function hideMsgPopup() {
      if (msgPopup) msgPopup.classList.remove('show');
      if (msgPopupMask) msgPopupMask.classList.remove('show');
    }

    function applyMsgBadgeStyle() {
      var bgPicker = document.getElementById('msgBadgeBgColor');
      var textPicker = document.getElementById('msgBadgeTextColor');
      if (!bgPicker || !textPicker || !messageBadge) return;

      msgBadgeState.bgColor = bgPicker.value;
      msgBadgeState.textColor = textPicker.value;

      messageBadge.style.backgroundColor = msgBadgeState.bgColor;
      messageBadge.style.color = msgBadgeState.textColor;
      AppDB.save('msg_badge_state', msgBadgeState);
    }

    function loadMsgBadgeControls() {
      var bgPicker = document.getElementById('msgBadgeBgColor');
      var textPicker = document.getElementById('msgBadgeTextColor');
      if (bgPicker) bgPicker.value = msgBadgeState.bgColor || '#8e8e93';
      if (textPicker) textPicker.value = msgBadgeState.textColor || '#ffffff';
    }

    AppDB.get('msg_badge_state', function(saved) {
      if (saved) {
        msgBadgeState.bgColor = saved.bgColor || '#8e8e93';
        msgBadgeState.textColor = saved.textColor || '#ffffff';
      }
      if (messageBadge) {
        messageBadge.style.backgroundColor = msgBadgeState.bgColor;
        messageBadge.style.color = msgBadgeState.textColor;
      }
    });
  }

  // ============ 头像展示区样式定制模块 ============
  function setupCoupleStyle() {
    var coupleEditBtn = document.querySelector('[data-edit-target="couple"]');
    var couplePopup = null;
    var couplePopupMask = null;

    var cpState = {
      glass: false,
      speechBg: '#f0f0f3',
      speechOpacity: 100,
      speechText: '#3c3c43',
      avatarBorder: '#d1d1d6',
      nameText: '#1c1c1e'
    };

    if (coupleEditBtn) {
      coupleEditBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showCouplePopup();
      });
    }

    function showCouplePopup() {
      if (!couplePopup) {
        couplePopupMask = document.createElement('div');
        couplePopupMask.className = 'popup-mask';
        document.body.appendChild(couplePopupMask);
        couplePopupMask.addEventListener('click', hideCouplePopup);

        couplePopup = document.createElement('div');
        couplePopup.className = 'popup-card';
        couplePopup.innerHTML = '<div class="popup-card-title">头像区设置</div>'
          + '<div class="popup-card-row"><span>气泡毛玻璃</span>'
          + '<div class="toggle-switch"><input type="checkbox" id="cpGlassToggle"><label for="cpGlassToggle"></label></div></div>'
          + '<div class="popup-card-row"><span>气泡背景色</span>'
          + '<input type="color" id="cpSpeechBgColor" value="#f0f0f3"></div>'
          + '<div class="popup-card-row"><span>气泡透明度</span>'
          + '<input type="range" id="cpSpeechOpacity" min="0" max="100" value="100">'
          + '<span class="popup-card-value" id="cpSpeechOpacityVal">100%</span></div>'
          + '<div class="popup-card-row"><span>气泡文字颜色</span>'
          + '<input type="color" id="cpSpeechTextColor" value="#3c3c43"></div>'
          + '<div class="popup-card-row"><span>头像框颜色</span>'
          + '<input type="color" id="cpAvatarBorderColor" value="#d1d1d6"></div>'
          + '<div class="popup-card-row"><span>名字字体颜色</span>'
          + '<input type="color" id="cpNameTextColor" value="#1c1c1e"></div>';
        document.body.appendChild(couplePopup);

        document.getElementById('cpGlassToggle').addEventListener('change', applyCoupleStylesFromControls);
        document.getElementById('cpSpeechBgColor').addEventListener('input', applyCoupleStylesFromControls);
        document.getElementById('cpSpeechOpacity').addEventListener('input', applyCoupleStylesFromControls);
        document.getElementById('cpSpeechTextColor').addEventListener('input', applyCoupleStylesFromControls);
        document.getElementById('cpAvatarBorderColor').addEventListener('input', applyCoupleStylesFromControls);
        document.getElementById('cpNameTextColor').addEventListener('input', applyCoupleStylesFromControls);
      }

      loadCoupleStyleControls();
      positionSmartPopup(couplePopup, document.getElementById('coupleSection'));
      cardPopupMask = couplePopupMask;
      couplePopupMask.classList.add('show');
      couplePopup.classList.add('show');
    }

    function hideCouplePopup() {
      if (couplePopup) couplePopup.classList.remove('show');
      if (couplePopupMask) couplePopupMask.classList.remove('show');
    }

    function loadCoupleStyleControls() {
      var glassToggle = document.getElementById('cpGlassToggle');
      var speechBg = document.getElementById('cpSpeechBgColor');
      var speechOpacity = document.getElementById('cpSpeechOpacity');
      var speechOpacityVal = document.getElementById('cpSpeechOpacityVal');
      var speechText = document.getElementById('cpSpeechTextColor');
      var avatarBorder = document.getElementById('cpAvatarBorderColor');
      var nameText = document.getElementById('cpNameTextColor');

      if (glassToggle) glassToggle.checked = !!cpState.glass;
      if (speechBg) speechBg.value = cpState.speechBg || '#f0f0f3';
      if (speechOpacity) speechOpacity.value = cpState.speechOpacity !== undefined ? cpState.speechOpacity : 100;
      if (speechOpacityVal) speechOpacityVal.textContent = (cpState.speechOpacity !== undefined ? cpState.speechOpacity : 100) + '%';
      if (speechText) speechText.value = cpState.speechText || '#3c3c43';
      if (avatarBorder) avatarBorder.value = cpState.avatarBorder || '#d1d1d6';
      if (nameText) nameText.value = cpState.nameText || '#1c1c1e';
    }

    function applyCoupleStylesFromControls() {
      var glassToggle = document.getElementById('cpGlassToggle');
      var speechBg = document.getElementById('cpSpeechBgColor');
      var speechOpacity = document.getElementById('cpSpeechOpacity');
      var speechOpacityVal = document.getElementById('cpSpeechOpacityVal');
      var speechText = document.getElementById('cpSpeechTextColor');
      var avatarBorder = document.getElementById('cpAvatarBorderColor');
      var nameText = document.getElementById('cpNameTextColor');

      if (!speechBg || !speechOpacity) return;

      cpState.glass = glassToggle.checked;
      cpState.speechBg = speechBg.value;
      cpState.speechOpacity = parseInt(speechOpacity.value, 10);
      cpState.speechText = speechText.value;
      cpState.avatarBorder = avatarBorder.value;
      cpState.nameText = nameText.value;

      if (speechOpacityVal) speechOpacityVal.textContent = speechOpacity.value + '%';
      renderCoupleStyles(cpState);
      AppDB.save('couple_style_state', cpState);
    }

    function renderCoupleStyles(state) {
      if (!state) return;
      var opacity = (state.speechOpacity !== undefined ? state.speechOpacity : 100) / 100;
      var bgHex = state.speechBg || '#f0f0f3';
      var r = parseInt(bgHex.slice(1,3), 16) || 240;
      var g = parseInt(bgHex.slice(3,5), 16) || 240;
      var b = parseInt(bgHex.slice(5,7), 16) || 243;
      var rgbaBg = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';

      var s1 = document.getElementById('coupleSpeech1');
      var s2 = document.getElementById('coupleSpeech2');
      [s1, s2].forEach(function(el) {
        if (!el) return;
        el.style.backgroundColor = rgbaBg;
        if (state.speechText) el.style.color = state.speechText;
        if (state.glass) el.classList.add('glass-effect');
        else el.classList.remove('glass-effect');
      });

      var c1 = document.getElementById('coupleAvatar1');
      var c2 = document.getElementById('coupleAvatar2');
      [c1, c2].forEach(function(el) {
        if (!el) return;
        if (state.avatarBorder) el.style.boxShadow = '0 0 0 1px ' + state.avatarBorder;
      });

      var n1 = document.getElementById('coupleName1');
      var n2 = document.getElementById('coupleName2');
      [n1, n2].forEach(function(el) {
        if (!el) return;
        if (state.nameText) el.style.color = state.nameText;
      });
    }

    AppDB.get('couple_style_state', function(saved) {
      if (saved) {
        cpState.glass = !!saved.glass;
        cpState.speechBg = saved.speechBg || '#f0f0f3';
        cpState.speechOpacity = saved.speechOpacity !== undefined ? saved.speechOpacity : 100;
        cpState.speechText = saved.speechText || '#3c3c43';
        cpState.avatarBorder = saved.avatarBorder || '#d1d1d6';
        cpState.nameText = saved.nameText || '#1c1c1e';
      }
      renderCoupleStyles(cpState);
    });
  }

})();

// ========== 头像展示区数据（独立模块） ==========
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

    if (s1 && coupleData.speech1) s1.textContent = coupleData.speech1;
    if (s2 && coupleData.speech2) s2.textContent = coupleData.speech2;
    if (n1 && coupleData.name1) n1.textContent = coupleData.name1;
    if (n2 && coupleData.name2) n2.textContent = coupleData.name2;

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
        el.addEventListener('input', function() {
          coupleData[pair[1]] = this.textContent.trim() || '';
          saveCoupleData();
          if (pair[1] === 'name1') updateDateName();
        });
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
