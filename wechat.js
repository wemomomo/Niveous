(function(){
  'use strict';

  var wxCurrentTab = 'chats';
  var wxContacts = [];
  var wxMeInfo = { name: '墨墨', id: 'mo_mo', sign: '' };
  var wxMeAvatar = null;

  window.addEventListener('dbReady', function() {
    loadWxData(function() {
      renderWechatPage();
    });
  });

  function renderWechatPage() {
    var content = document.getElementById('wechatContent');
    if (!content) return;

    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.height = '100%';
    content.style.padding = '0';
    content.style.overflow = 'hidden';

    var bodyHtml = '<div class="wx-body" id="wxBody"></div>';

    var tabbarHtml = '<div class="wx-tabbar">'
      + wxTabItem('chats', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', '聊天')
      + wxTabItem('contacts', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 0 0-0.01|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75', '通讯录')
      + wxTabItem('discover', 'M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5', '发现')
      + wxTabItem('me', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 7a4 4 0 1 0 0-0.01', '我')
      + '</div>';

    content.innerHTML = bodyHtml + tabbarHtml;

    // 绑定 tab 切换
    content.querySelectorAll('.wx-tab-item').forEach(function(tab) {
      tab.addEventListener('click', function() {
        wxCurrentTab = this.dataset.tab;
        content.querySelectorAll('.wx-tab-item').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderWxBody();
      });
    });

    // 设置初始激活
    var activeTab = content.querySelector('[data-tab="' + wxCurrentTab + '"]');
    if (activeTab) activeTab.classList.add('active');

    renderWxBody();
  }

  function wxTabItem(name, paths, label) {
    var pathsArr = paths.split('|');
    var svgContent = pathsArr.map(function(d) {
      if (d.indexOf('a4 4') > -1 && d.indexOf('M') === 0 && d.length < 25) {
        return '<circle cx="' + d.match(/M(\d+)/)[1] + '" cy="' + d.match(/(\d+) a/)[1] + '" r="4"/>';
      }
      return '<path d="' + d + '"/>';
    }).join('');

    return '<div class="wx-tab-item" data-tab="' + name + '">'
      + '<svg viewBox="0 0 24 24">' + svgContent + '</svg>'
      + '<div class="wx-tab-label">' + label + '</div>'
      + '</div>';
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
        + '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
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

    // 绑定添加按钮
    var addBtn = body.querySelector('#wxAddContactBtn');
    if (addBtn) addBtn.addEventListener('click', function() { showCreateContact(); });

    // 绑定删除
    body.querySelectorAll('.wx-contact-act.delete').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.idx);
        wxContacts.splice(idx, 1);
        saveWxData();
        renderContacts(body);
      });
    });

    // 绑定编辑
    body.querySelectorAll('.wx-contact-act.edit').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.idx);
        showCreateContact(idx);
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
    var html = '<div class="wx-me-header" id="wxMeHeader">'
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
      { icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/>', text: '设置' },
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

    // 头像点击
    var avatarBtn = body.querySelector('#wxMeAvatarBtn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', function() {
        if (wxMeAvatar) {
          window.PhotoAction.show(function() { pickMeAvatar(); }, function() {
            wxMeAvatar = null;
            saveWxData();
            renderMe(body);
          });
        } else {
          pickMeAvatar();
        }
      });
    }

    // 名称/ID/签名编辑
    bindMeEditable(body, 'wxMeName', 'name');
    bindMeEditable(body, 'wxMeId', 'id');
    bindMeEditable(body, 'wxMeSign', 'sign');
  }

  function bindMeEditable(body, elemId, key) {
    var el = body.querySelector('#' + elemId);
    if (!el) return;
    el.addEventListener('blur', function() {
      wxMeInfo[key] = this.textContent.trim();
      saveWxData();
    });
  }

  function pickMeAvatar() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        window.AppCropper.open(e.target.result, { aspectRatio: 1 }, function(cropped) {
          wxMeAvatar = cropped;
          saveWxData();
          renderWxBody();
        });
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  // ========== 创建/编辑角色弹窗 ==========
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

    // 头像选择
    overlay.querySelector('#wxCreateAvatarBtn').addEventListener('click', function() {
      var self = this;
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          window.AppCropper.open(e.target.result, { aspectRatio: 1 }, function(cropped) {
            tempAvatar = cropped;
            self.innerHTML = '<img src="' + cropped + '" alt="">';
          });
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });

    // 取消
    overlay.querySelector('#wxCreateCancel').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });

    // 确认
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

    // 点遮罩关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  // ========== 数据存取 ==========
  function loadWxData(callback) {
    if (!window.AppDB) { if (callback) callback(); return; }
    var total = 3, done = 0;
    function check() { done++; if (done >= total && callback) callback(); }
    AppDB.get('wx_contacts', function(val) { if (val) wxContacts = val; check(); });
    AppDB.get('wx_me_info', function(val) { if (val) wxMeInfo = val; check(); });
    AppDB.get('wx_me_avatar', function(val) { if (val) wxMeAvatar = val; check(); });
  }

  function saveWxData() {
    if (!window.AppDB) return;
    AppDB.save('wx_contacts', wxContacts);
    AppDB.save('wx_me_info', wxMeInfo);
    if (wxMeAvatar) AppDB.save('wx_me_avatar', wxMeAvatar);
    else AppDB.delete('wx_me_avatar');
  }

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
