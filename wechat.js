(function(){
  'use strict';

  var wxCurrentTab = 'chats';
  var wxContacts = [];
  var wxMeInfo = { name: '墨墨', id: 'mo_mo', sign: '' };
  var wxMeAvatar = null;
  var wxHeaderBg = null;
  var wxTabbarBg = null;

  // iOS 安全的文件选择（input 必须挂到 DOM 上，防止 GC 导致 change 丢失）
  var _fileInput = null;
  function safePickFile(accept, callback) {
    if (_fileInput && _fileInput.parentNode) _fileInput.parentNode.removeChild(_fileInput);
    _fileInput = document.createElement('input');
    _fileInput.type = 'file';
    _fileInput.accept = accept || 'image/*';
    _fileInput.style.cssText = 'position:fixed;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(_fileInput);
    _fileInput.addEventListener('change', function() {
      var file = _fileInput.files[0];
      if (_fileInput.parentNode) _fileInput.parentNode.removeChild(_fileInput);
      _fileInput = null;
      if (file && callback) callback(file);
    });
    _fileInput.click();
  }

  window.addEventListener('dbReady', function() {
    loadWxData(function() {
      var wxPage = document.querySelector('[data-page="wechat"]');
      if (wxPage) {
        var defaultHeader = wxPage.querySelector('.app-header');
        if (defaultHeader) defaultHeader.style.display = 'none';
      }
      renderWechatPage();
    });
  });

  function renderWechatPage() {
    var content = document.getElementById('wechatContent');
    if (!content) return;

    var headerHtml = '<div class="wx-header" id="wxHeader">'
      + '<button class="wx-header-back" type="button"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      + '<div class="wx-header-title">Chat</div>'
      + '<button class="wx-header-add" id="wxHeaderAddBtn" type="button"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
      + '</div>';

    var menuHtml = '<div class="wx-menu-mask" id="wxMenuMask"></div>'
      + '<div class="wx-menu-popover" id="wxMenuPopover">'
      +   '<div class="wx-menu-item" id="wxSetHeaderBg">'
      +     '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="6" rx="2"/><rect x="3" y="11" width="18" height="10" rx="2"/></svg>'
      +     '<span>顶部栏背景</span>'
      +   '</div>'
      +   '<div class="wx-menu-item" id="wxSetTabbarBg">'
      +     '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="10" rx="2"/><rect x="3" y="15" width="18" height="6" rx="2"/></svg>'
      +     '<span>底部栏背景</span>'
      +   '</div>'
      + '</div>';

    var bodyHtml = '<div class="wx-body" id="wxBody"></div>';

    var tabbarHtml = '<div class="wx-tabbar" id="wxTabbar">'
      + '<div class="wx-tab-item" data-tab="chats">'
      +   '<svg viewBox="0 0 64 64"><path d="M32 15C21.5 15 13 22 13 31C13 36 16 40.5 20.6 43.2L18.5 50L26 46.4C27.9 46.9 29.9 47 32 47C42.5 47 51 40 51 31C51 22 42.5 15 32 15Z" stroke-width="3.6"/></svg>'
      +   '<div class="wx-tab-label">聊天</div>'
      + '</div>'
      + '<div class="wx-tab-item" data-tab="contacts">'
      +   '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      +   '<div class="wx-tab-label">通讯录</div>'
      + '</div>'
      + '<div class="wx-tab-item" data-tab="discover">'
      +   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>'
      +   '<div class="wx-tab-label">发现</div>'
      + '</div>'
      + '<div class="wx-tab-item" data-tab="me">'
      +   '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      +   '<div class="wx-tab-label">我</div>'
      + '</div>'
      + '</div>';

    content.innerHTML = headerHtml + menuHtml + bodyHtml + tabbarHtml;

    applyHeaderBg();
    applyTabbarBg();

    // 返回
    content.querySelector('.wx-header-back').addEventListener('click', function() {
      if (window.AppNav) AppNav.showPage('home');
    });

    // 加号菜单
    var addBtn = content.querySelector('#wxHeaderAddBtn');
    var mask = content.querySelector('#wxMenuMask');
    var popover = content.querySelector('#wxMenuPopover');

    function closeMenu() {
      popover.classList.remove('show');
      mask.classList.remove('show');
    }
    function openMenu() {
      popover.classList.add('show');
      mask.classList.add('show');
    }

    addBtn.addEventListener('click', function() {
      if (popover.classList.contains('show')) closeMenu();
      else openMenu();
    });
    mask.addEventListener('click', closeMenu);

    // 顶部栏背景
    content.querySelector('#wxSetHeaderBg').addEventListener('click', function() {
      closeMenu();
      if (wxHeaderBg) {
        window.PhotoAction.show(function() {
          pickBg(function(data) { wxHeaderBg = data; saveWxData(); applyHeaderBg(); });
        }, function() {
          wxHeaderBg = null; saveWxData(); applyHeaderBg();
        });
      } else {
        pickBg(function(data) { wxHeaderBg = data; saveWxData(); applyHeaderBg(); });
      }
    });

    // 底部栏背景
    content.querySelector('#wxSetTabbarBg').addEventListener('click', function() {
      closeMenu();
      if (wxTabbarBg) {
        window.PhotoAction.show(function() {
          pickBg(function(data) { wxTabbarBg = data; saveWxData(); applyTabbarBg(); });
        }, function() {
          wxTabbarBg = null; saveWxData(); applyTabbarBg();
        });
      } else {
        pickBg(function(data) { wxTabbarBg = data; saveWxData(); applyTabbarBg(); });
      }
    });

    // Tab 切换
    content.querySelectorAll('.wx-tab-item').forEach(function(tab) {
      tab.addEventListener('click', function() {
        wxCurrentTab = this.dataset.tab;
        content.querySelectorAll('.wx-tab-item').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderWxBody();
      });
    });

    var activeTab = content.querySelector('[data-tab="' + wxCurrentTab + '"]');
    if (activeTab) activeTab.classList.add('active');

    renderWxBody();
  }

  function applyHeaderBg() {
    var el = document.getElementById('wxHeader');
    if (!el) return;
    el.style.backgroundImage = wxHeaderBg ? 'url(' + wxHeaderBg + ')' : 'none';
  }

  function applyTabbarBg() {
    var el = document.getElementById('wxTabbar');
    if (!el) return;
    el.style.backgroundImage = wxTabbarBg ? 'url(' + wxTabbarBg + ')' : 'none';
  }

  function pickBg(callback) {
    safePickFile('image/*', function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        window.AppCropper.open(e.target.result, {}, function(cropped) {
          if (callback) callback(cropped);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function renderWxBody() {
    var body = document.getElementById('wxBody');
    if (!body) return;
    if (wxCurrentTab === 'chats') renderChats(body);
    else if (wxCurrentTab === 'contacts') renderContacts(body);
    else if (wxCurrentTab === 'discover') renderDiscover(body);
    else if (wxCurrentTab === 'me') renderMe(body);
  }

  // ========== 聊天 ==========
  function renderChats(body) {
    if (!wxContacts.length) {
      body.innerHTML = '<div class="wx-empty">'
        + '<svg viewBox="0 0 64 64"><path d="M32 15C21.5 15 13 22 13 31C13 36 16 40.5 20.6 43.2L18.5 50L26 46.4C27.9 46.9 29.9 47 32 47C42.5 47 51 40 51 31C51 22 42.5 15 32 15Z" stroke-width="2.5"/></svg>'
        + '<div class="wx-empty-text">暂无聊天，去通讯录创建角色吧</div>'
        + '</div>';
      return;
    }
    var html = '<div class="wx-chat-list">';
    wxContacts.forEach(function(c) {
      html += '<div class="wx-chat-item" data-id="' + c.id + '">'
        + '<div class="wx-chat-avatar">'
        + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>')
        + '</div>'
        + '<div class="wx-chat-info">'
        + '<div class="wx-chat-name">' + esc(c.name) + '</div>'
        + '<div class="wx-chat-msg">' + esc(c.lastMsg || '暂无消息') + '</div>'
        + '</div>'
        + '<div class="wx-chat-meta">'
        + '<div class="wx-chat-time">' + (c.lastTime || '') + '</div>'
        + '<div class="wx-chat-badge"></div>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  // ========== 通讯录 ==========
  function renderContacts(body) {
    var html = '<div class="wx-contacts-header">'
      + '<div class="wx-contacts-title">角色列表 (' + wxContacts.length + ')</div>'
      + '<button class="wx-contacts-add-btn" id="wxAddContactBtn" type="button">'
      + '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + '</button>'
      + '</div>';

    if (!wxContacts.length) {
      html += '<div class="wx-empty">'
        + '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>'
        + '<div class="wx-empty-text">点击 + 创建角色</div>'
        + '</div>';
    } else {
      html += '<div class="wx-contact-list">';
      wxContacts.forEach(function(c, idx) {
        html += '<div class="wx-contact-item">'
          + '<div class="wx-contact-avatar">'
          + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>')
          + '</div>'
          + '<div class="wx-contact-name">' + esc(c.name) + '</div>'
          + '<div class="wx-contact-actions">'
          + '<button class="wx-contact-act edit" data-idx="' + idx + '" type="button"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'
          + '<button class="wx-contact-act delete" data-idx="' + idx + '" type="button"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>'
          + '</div>'
          + '</div>';
      });
      html += '</div>';
    }
    body.innerHTML = html;

    var addBtn = body.querySelector('#wxAddContactBtn');
    if (addBtn) addBtn.addEventListener('click', function() { showCreateContact(); });

    body.querySelectorAll('.wx-contact-act.delete').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        wxContacts.splice(parseInt(this.dataset.idx), 1);
        saveWxData(); renderContacts(body);
      });
    });
    body.querySelectorAll('.wx-contact-act.edit').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        showCreateContact(parseInt(this.dataset.idx));
      });
    });
  }

  // ========== 发现 ==========
  function renderDiscover(body) {
    var items = [
      { icon: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>', text: '视频号' },
      { icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>', text: '朋友圈' },
      { icon: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>', text: '搜一搜' },
      { icon: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>', text: '购物' },
    ];
    var html = '<div class="wx-discover-list">';
    items.forEach(function(item) {
      html += '<div class="wx-discover-item">'
        + '<div class="wx-discover-icon"><svg viewBox="0 0 24 24">' + item.icon + '</svg></div>'
        + '<div class="wx-discover-text">' + item.text + '</div>'
        + '<svg class="wx-discover-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>'
        + '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  // ========== 我 ==========
  function renderMe(body) {
    var html = '<div class="wx-me-header">'
      + '<div class="wx-me-avatar" id="wxMeAvatarBtn">'
      + (wxMeAvatar ? '<img src="' + wxMeAvatar + '" alt="">' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>')
      + '</div>'
      + '<div class="wx-me-info">'
      + '<div class="wx-me-name" contenteditable="true" id="wxMeName">' + esc(wxMeInfo.name) + '</div>'
      + '<div class="wx-me-id">微信号: <span contenteditable="true" id="wxMeId">' + esc(wxMeInfo.id) + '</span></div>'
      + '<div class="wx-me-sign" contenteditable="true" id="wxMeSign">' + esc(wxMeInfo.sign || '点击编辑签名') + '</div>'
      + '</div>'
      + '</div>';

    var meItems = [
      { icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>', text: '相册' },
      { icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>', text: '收藏' },
      { icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1 2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/>', text: '设置' },
    ];
    html += '<div class="wx-me-list">';
    meItems.forEach(function(item) {
      html += '<div class="wx-me-item">'
        + '<div class="wx-me-item-icon"><svg viewBox="0 0 24 24">' + item.icon + '</svg></div>'
        + '<div class="wx-me-item-text">' + item.text + '</div>'
        + '<svg class="wx-me-item-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>'
        + '</div>';
    });
    html += '</div>';
    body.innerHTML = html;

    body.querySelector('#wxMeAvatarBtn').addEventListener('click', function() {
      if (wxMeAvatar) {
        window.PhotoAction.show(function() { pickAvatar(); }, function() {
          wxMeAvatar = null; saveWxData(); renderMe(body);
        });
      } else {
        pickAvatar();
      }
    });

    bindEditable(body, 'wxMeName', 'name');
    bindEditable(body, 'wxMeId', 'id');
    bindEditable(body, 'wxMeSign', 'sign');
  }

  function bindEditable(body, id, key) {
    var el = body.querySelector('#' + id);
    if (!el) return;
    el.addEventListener('blur', function() { wxMeInfo[key] = this.textContent.trim(); saveWxData(); });
  }

  function pickAvatar() {
    safePickFile('image/*', function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        window.AppCropper.open(e.target.result, { aspectRatio: 1 }, function(cropped) {
          wxMeAvatar = cropped; saveWxData(); renderWxBody();
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // ========== 创建/编辑角色 ==========
  function showCreateContact(editIdx) {
    var isEdit = typeof editIdx === 'number';
    var contact = isEdit ? wxContacts[editIdx] : { id: Date.now().toString(), name: '', avatar: null };

    var overlay = document.createElement('div');
    overlay.className = 'wx-create-overlay show';
    overlay.innerHTML = '<div class="wx-create-card">'
      + '<div class="wx-create-title">' + (isEdit ? '编辑角色' : '创建角色') + '</div>'
      + '<div class="wx-create-avatar-wrap"><div class="wx-create-avatar-btn" id="wxCreateAvatarBtn">'
      + (contact.avatar ? '<img src="' + contact.avatar + '" alt="">' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><line x1="12" y1="16" x2="12" y2="20"/><line x1="10" y1="18" x2="14" y2="18"/></svg>')
      + '</div></div>'
      + '<div class="wx-create-field"><label>角色名称</label><input type="text" id="wxCreateName" placeholder="输入名称" value="' + esc(contact.name) + '"></div>'
      + '<div class="wx-create-btns">'
      + '<button class="wx-create-btn cancel" id="wxCreateCancel" type="button">取消</button>'
      + '<button class="wx-create-btn confirm" id="wxCreateConfirm" type="button">' + (isEdit ? '保存' : '创建') + '</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(overlay);

    var tempAvatar = contact.avatar;

    overlay.querySelector('#wxCreateAvatarBtn').addEventListener('click', function() {
      var self = this;
      safePickFile('image/*', function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          window.AppCropper.open(e.target.result, { aspectRatio: 1 }, function(cropped) {
            tempAvatar = cropped;
            self.innerHTML = '<img src="' + cropped + '" alt="">';
          });
        };
        reader.readAsDataURL(file);
      });
    });

    overlay.querySelector('#wxCreateCancel').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });

    overlay.querySelector('#wxCreateConfirm').addEventListener('click', function() {
      var name = overlay.querySelector('#wxCreateName').value.trim();
      if (!name) { AppNav.showToast('请输入名称'); return; }
      if (isEdit) {
        wxContacts[editIdx].name = name;
        wxContacts[editIdx].avatar = tempAvatar;
      } else {
        wxContacts.push({ id: Date.now().toString(), name: name, avatar: tempAvatar, lastMsg: '', lastTime: '' });
      }
      saveWxData();
      document.body.removeChild(overlay);
      renderWxBody();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  // ========== 数据 ==========
  function loadWxData(callback) {
    if (!window.AppDB) { if (callback) callback(); return; }
    var total = 5, done = 0;
    function check() { done++; if (done >= total && callback) callback(); }
    AppDB.get('wx_contacts', function(v) { if (v) wxContacts = v; check(); });
    AppDB.get('wx_me_info', function(v) { if (v) wxMeInfo = v; check(); });
    AppDB.get('wx_me_avatar', function(v) { if (v) wxMeAvatar = v; check(); });
    AppDB.get('wx_header_bg', function(v) { if (v) wxHeaderBg = v; check(); });
    AppDB.get('wx_tabbar_bg', function(v) { if (v) wxTabbarBg = v; check(); });
  }

  function saveWxData() {
    if (!window.AppDB) return;
    AppDB.save('wx_contacts', wxContacts);
    AppDB.save('wx_me_info', wxMeInfo);
    if (wxMeAvatar) AppDB.save('wx_me_avatar', wxMeAvatar); else AppDB.delete('wx_me_avatar');
    if (wxHeaderBg) AppDB.save('wx_header_bg', wxHeaderBg); else AppDB.delete('wx_header_bg');
    if (wxTabbarBg) AppDB.save('wx_tabbar_bg', wxTabbarBg); else AppDB.delete('wx_tabbar_bg');
  }

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();