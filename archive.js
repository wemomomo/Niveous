(function(){
  'use strict';

  var ARCHIVE_DB_KEY = 'user_archive_data_v2';
  var container = null;
  var currentData = {
    name: '你',
    gender: '女',
    age: '18',
    height: '165cm',
    birthday: '',
    zodiac: '天秤座',
    appearance: '',
    personality: '',
    tags: '',
    hobbies: '',
    background: '',
    bio: '“在这清冷如霜的世界里，你是我唯一的满月与浪漫。”',
    photo: '',
    createDate: '',
    userid: '@NIVEOUSMOON',
    tag1: '✦ 专属',
    tag2: '♡ 奔赴',
    tag3: '✧ 宇宙漫游',
    serial: 'NO. 0000-NIVEOUS'
  };

  // 双重保险初始化，适配 iOS PWA 加载机制
  function tryInit() {
    container = document.getElementById('archiveContent');
    if (!container) {
      window.addEventListener('dbReady', tryInit);
      return;
    }
    // 已经准备好容器，从数据库读取数据
    loadArchiveData();
  }

  if (window._dbReady) {
    tryInit();
  } else {
    window.addEventListener('dbReady', tryInit);
    setTimeout(tryInit, 500);
  }

  // 1. 读取数据库
  function loadArchiveData() {
    if (!window.AppDB) return;
    AppDB.get(ARCHIVE_DB_KEY, function(saved) {
      if (saved && saved.name) {
        currentData = saved;
        renderStep3(); // 如果已经有档案，直接进入高定小卡展示页
      } else {
        renderStep1(); // 没有任何档案，显示空状态及慢速凝线雪花
      }
    });
  }

  // ==========================================
  // 步骤 1：雪花成型空状态
  // ==========================================
  function renderStep1() {
    container.className = 'app-content archive-panel-active';
    container.innerHTML = '<div class="archive-step-panel step-active" id="archStep1">'
      + '<div class="empty-card-stage">'
      + '<div class="deco-cross tl">+</div><div class="deco-cross tr">+</div>'
      + '<div class="deco-cross bl">+</div><div class="deco-cross br">+</div>'
      + '<div class="empty-illustration-box">'
      + '<span class="empty-sparkle s1">✦</span><span class="empty-sparkle s2">✧</span>'
      + '<div class="empty-illustration-circle">'
      + '<svg class="frost-crystal-svg" viewBox="0 0 48 48">'
      + '<g class="crystal-core">'
      + '<circle cx="24" cy="24" r="1.5" fill="#18191c" />'
      + '<polygon points="24,19.5 28.5,24 24,28.5 19.5,24" class="crystal-stroke" />'
      + '<circle cx="24" cy="24" r="9" class="crystal-stroke" stroke-dasharray="1.5 2" stroke-width="0.8" opacity="0.6" />'
      + '</g>'
      + '<g class="crystal-spears crystal-stroke">'
      + '<polygon points="24,3 27,15 24,19.5 21,15" />'
      + '<polygon points="24,45 27,33 24,28.5 21,33" />'
      + '<polygon points="3,24 15,21 19.5,24 15,27" />'
      + '<polygon points="45,24 33,21 28.5,24 33,27" />'
      + '</g>'
      + '<g class="crystal-petals crystal-stroke">'
      + '<polygon points="35,13 36.5,19 30.5,20.5 29,14.5" />'
      + '<polygon points="13,13 14.5,19 20.5,20.5 19,14.5" />'
      + '<polygon points="35,35 36.5,29 30.5,27.5 29,33.5" />'
      + '<polygon points="13,35 14.5,29 20.5,27.5 19,33.5" />'
      + '</g>'
      + '<g class="crystal-sparkles">'
      + '<circle cx="24" cy="3" r="1" fill="#18191c" />'
      + '<circle cx="24" cy="45" r="1" fill="#18191c" />'
      + '<circle cx="3" cy="24" r="1" fill="#18191c" />'
      + '<circle cx="45" cy="24" r="1" fill="#18191c" />'
      + '</g>'
      + '</svg>'
      + '</div>'
      + '</div>'
      + '<h2 class="empty-title">尚未建立用户档案</h2>'
      + '<p class="empty-desc">记录你的专属身份、立绘特写与心动寄语，生成独一无二的高定纸质票根小卡。</p>'
      + '<button class="action-trigger-btn" id="goToStep2Btn" type="button">'
      + '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + '<span>新建用户档案</span>'
      + '</button>'
      + '</div>'
      + '</div>';

    document.getElementById('goToStep2Btn').addEventListener('click', function() {
      // 首次建档，读取手机当前的真实日期并彻底固化锁定
      if (!currentData.createDate) {
        var now = new Date();
        var m = String(now.getMonth() + 1).padStart(2, '0');
        var d = String(now.getDate()).padStart(2, '0');
        currentData.createDate = m + d;
      }
      renderStep2();
    });
  }

  // ==========================================
  // 步骤 2：法式手账填单
  // ==========================================
  function renderStep2() {
    container.className = 'app-content';
    container.innerHTML = '<div class="archive-step-panel step-active" id="archStep2">'
      + '<div class="journal-sheet">'
      + '<div class="journal-header">'
      + '<div class="journal-header-top">'
      + '<span class="brand-confidential">RECORD // ARCHIVE</span>'
      + '<span class="brand-serial">№ NV-' + esc(currentData.createDate) + '</span>'
      + '</div>'
      + '<h1 class="journal-main-title">档案录入手札</h1>'
      + '<p class="journal-desc-text">在这里提笔，将关于你的每一缕呼吸、性格轮廓与灵魂羁绊落于纸上。</p>'
      + '<div class="journal-header-divider"><span class="divider-line"></span><span class="divider-star">✦</span><span class="divider-line"></span></div>'
      + '</div>'

      // 01. 基础身份
      + '<div class="journal-section">'
      + '<div class="section-lead-title"><div class="section-name"><span class="sec-index">01.</span><span>基础身份</span></div><span class="section-tag-en">IDENTITY</span></div>'
      + '<div class="ruled-row-grid">'
      + '<div class="ruled-item"><span class="ruled-label">姓名 / 专属称呼</span><input type="text" class="ruled-input" id="fieldName" value="' + esc(currentData.name) + '" placeholder="如：墨墨"></div>'
      + '<div class="ruled-item"><span class="ruled-label">性别</span><input type="text" class="ruled-input" id="fieldGender" value="' + esc(currentData.gender) + '" placeholder="如：女"></div>'
      + '<div class="ruled-item"><span class="ruled-label">年龄</span><input type="text" class="ruled-input" id="fieldAge" value="' + esc(currentData.age) + '" placeholder="如：18"></div>'
      + '<div class="ruled-item"><span class="ruled-label">身高</span><input type="text" class="ruled-input" id="fieldHeight" value="' + esc(currentData.height) + '" placeholder="如：165cm"></div>'
      + '<div class="ruled-item"><span class="ruled-label">生日</span><input type="text" class="ruled-input" id="fieldBirthday" value="' + esc(currentData.birthday) + '" placeholder="如：09.24"></div>'
      + '<div class="ruled-item"><span class="ruled-label">星座</span><input type="text" class="ruled-input" id="fieldZodiac" value="' + esc(currentData.zodiac) + '" placeholder="如：天秤座"></div>'
      + '</div>'
      + '</div>'

      // 02. 外貌长相手记
      + '<div class="journal-section">'
      + '<div class="section-lead-title"><div class="section-name"><span class="sec-index">02.</span><span>长相与外貌特征</span></div><span class="section-tag-en">APPEARANCE</span></div>'
      + '<textarea class="ruled-textarea" id="fieldAppearance" rows="2" placeholder="发型、眸色、五官气质、穿搭风格、身形特点...">' + esc(currentData.appearance) + '</textarea>'
      + '</div>'

      // 03. 性格特质与口吻
      + '<div class="journal-section">'
      + '<div class="section-lead-title"><div class="section-name"><span class="sec-index">03.</span><span>性格特质与语气习惯</span></div><span class="section-tag-en">PERSONALITY</span></div>'
      + '<div class="ruled-item" style="margin-bottom:6px;"><span class="ruled-label">性格标签</span><input type="text" class="ruled-input" id="fieldTags" value="' + esc(currentData.tags) + '" placeholder="多个关键词用空格分隔"></div>'
      + '<textarea class="ruled-textarea" id="fieldPersonality" rows="2" placeholder="日常性格表现、说话习惯、专属的互动方式与情绪特点...">' + esc(currentData.personality) + '</textarea>'
      + '</div>'

      // 04. 兴趣爱好与日常偏好
      + '<div class="journal-section">'
      + '<div class="section-lead-title"><div class="section-name"><span class="sec-index">04.</span><span>兴趣爱好与日常偏好</span></div><span class="section-tag-en">HOBBIES & LIKES</span></div>'
      + '<textarea class="ruled-textarea" id="fieldHobbies" rows="2" placeholder="喜欢的食物、日常兴趣爱好、喜恶偏好、特殊习惯...">' + esc(currentData.hobbies) + '</textarea>'
      + '</div>'

      // 05. 深度背景渊源
      + '<div class="journal-section">'
      + '<div class="section-lead-title"><div class="section-name"><span class="sec-index">05.</span><span>深度背景渊源与人设</span></div><span class="section-tag-en">BACKGROUND & LORE</span></div>'
      + '<textarea class="ruled-textarea" id="fieldBackground" rows="3" placeholder="身份背景、过往经历、故事渊源与深度设定...">' + esc(currentData.background) + '</textarea>'
      + '</div>'

      // 撕条及印章
      + '<div class="journal-tear-strip">'
      + '<div class="journal-sign-box"><span class="sign-label">AUTHENTICATED PROTOCOL</span><span class="sign-handwriting">✦ Verified Confidential Dossier</span></div>'
      + '<div class="journal-seal-stamp"><span class="seal-star">✦</span><span>NIVEOUS</span><span>OFFICIAL</span></div>'
      + '</div>'

      + '<button class="action-trigger-btn" id="generateCardBtn" style="max-width:100%; height:44px; border-radius:12px;" type="button">'
      + '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>'
      + '<span>封存档案并生成小卡</span>'
      + '</button>'
      + '</div>'
      + '</div>';

    document.getElementById('generateCardBtn').addEventListener('click', function() {
      var nameVal = document.getElementById('fieldName').value.trim();
      if (!nameVal) {
        AppNav.showToast('墨墨，请在第一栏写下你的“姓名”哦');
        return;
      }

      // 获取表单值保存至临时变量
      currentData.name = nameVal;
      currentData.gender = document.getElementById('fieldGender').value.trim() || '女';
      currentData.age = document.getElementById('fieldAge').value.trim() || '18';
      currentData.height = document.getElementById('fieldHeight').value.trim() || '165cm';
      currentData.birthday = document.getElementById('fieldBirthday').value.trim();
      currentData.zodiac = document.getElementById('fieldZodiac').value.trim() || '天秤座';
      currentData.appearance = document.getElementById('fieldAppearance').value.trim();
      currentData.personality = document.getElementById('fieldPersonality').value.trim();
      currentData.tags = document.getElementById('fieldTags').value.trim();
      currentData.hobbies = document.getElementById('fieldHobbies').value.trim();
      currentData.background = document.getElementById('fieldBackground').value.trim();

      // 生日智能编号联动：填写生日同步为 NO.纯数字-NIVEOUS，否则默认 NO.0000-NIVEOUS
      if (currentData.birthday) {
        var cleanDigits = currentData.birthday.replace(/[^0-9]/g, '');
        currentData.serial = 'NO. ' + (cleanDigits || currentData.birthday) + '-NIVEOUS';
      } else {
        currentData.serial = 'NO. 0000-NIVEOUS';
      }

      // 名字右侧的 userid 完全绑定为 @NIVEOUSMOON
      currentData.userid = '@NIVEOUSMOON';
      currentData.useridVal = 'G: ' + currentData.gender + ' · H: ' + currentData.height;

      renderStep3();
    });
  }

  // ==========================================
  // 步骤 3：高定票根展示及自由编辑
  // ==========================================
  function renderStep3() {
    container.className = 'app-content';
    var hasPhotoClass = currentData.photo ? ' has-img' : '';
    
    container.innerHTML = '<div class="archive-step-panel step-active" id="archStep3">'
      + '<div class="t1-wrapper">'
      + '<div class="t1-inner">'
      + '<div class="t1-header">'
      + '<div>'
      + '<div class="t1-serial" id="cardSerial" contenteditable="true" spellcheck="false">' + esc(currentData.serial) + '</div>'
      + '<div class="t1-title" contenteditable="true" spellcheck="false"><span>MEMORIES</span><span>✦</span></div>'
      + '</div>'
      + '<div class="t1-stamp" contenteditable="true" spellcheck="false">★ SPECIAL</div>'
      + '</div>'

      + '<div class="t1-body">'
      + '<div class="t1-left-rail">'
      + '<div class="t1-qr-icon">'
      + '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="15" y="15" width="5" height="5" fill="currentColor"/></svg>'
      + '</div>'
      + '<div class="t1-barcode-lines">'
      + '<div class="t1-bline thick"></div><div class="t1-bline thin"></div><div class="t1-bline"></div>'
      + '<div class="t1-bline thick"></div><div class="t1-bline"></div><div class="t1-bline thin"></div>'
      + '<div class="t1-bline thick"></div>'
      + '</div>'
      + '<div class="t1-vertical-code" id="cardVertCode" contenteditable="true" spellcheck="false">LUCKY-TODAY</div>'
      + '</div>'

      // 原生态大相框，移除了 online 标识
      + '<div class="t1-photo-stage' + hasPhotoClass + '" id="cardPhotoBtn">'
      + '<img id="cardPhotoImg" src="' + esc(currentData.photo) + '" alt="立绘">'
      + '<div class="t1-photo-empty">'
      + '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
      + '<span>上传立绘/特写</span>'
      + '</div>'
      + '</div>'

      + '<div class="t1-right-rail">'
      + '<span class="t1-star">✦</span><span class="t1-dash"></span><span class="t1-rail-dot"></span>'
      + '<span class="t1-star">✧</span><span class="t1-rail-dot"></span><span class="t1-dash"></span>'
      + '<span class="t1-star">✦</span>'
      + '</div>'
      + '</div>'

      + '<div class="t1-footer">'
      + '<div class="t1-cutout-left"></div><div class="t1-cutout-right"></div>'
      + '<div class="t1-user-row">'
      + '<div class="t1-username" id="cardName" contenteditable="true" spellcheck="false">' + esc(currentData.name) + '</div>'
      + '<div class="t1-userid" id="cardUserId" contenteditable="true" spellcheck="false">' + esc(currentData.userid) + '</div>'
      + '</div>'
      + '<div class="t1-bio" id="cardBio" contenteditable="true" spellcheck="false">' + esc(currentData.bio) + '</div>'
      + '<div class="t1-tags" id="cardTagsContainer">'
      + '<span class="t1-tag primary" id="cardTag1" contenteditable="true" spellcheck="false">' + esc(currentData.tag1) + '</span>'
      + '<span class="t1-tag" id="cardTag2" contenteditable="true" spellcheck="false">' + esc(currentData.tag2) + '</span>'
      + '<span class="t1-tag" id="cardTag3" contenteditable="true" spellcheck="false">' + esc(currentData.tag3) + '</span>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>'

      // 功能按钮组
      + '<div class="t1-action-deck">'
      + '<button class="t1-secondary-btn" id="reEditBtn" type="button">'
      + '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
      + '<span>返回手账</span>'
      + '</button>'
      + '<button class="action-trigger-btn" id="finishBtn" style="flex:1.2;" type="button">'
      + '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
      + '<span>确认并保存</span>'
      + '</button>'
      + '</div>'
      + '<button class="t1-secondary-btn" id="recreateBtn" style="width:100%; margin-top:10px; border-color:rgba(219,68,85,0.3); color:#db4455;" type="button">'
      + '<span>重新创建全新档案</span>'
      + '</button>'
      + '</div>';

    // 绑定返回编辑
    document.getElementById('reEditBtn').addEventListener('click', function() {
      readDirectEditableValues();
      renderStep2();
    });

    // 绑定永久重置
    document.getElementById('recreateBtn').addEventListener('click', function() {
      if (confirm('确定要清除当前的档案，重新建立一份新的吗？')) {
        currentData = {
          name: '你', gender: '女', age: '18', height: '165cm', birthday: '', zodiac: '天秤座',
          appearance: '', personality: '', tags: '', hobbies: '', background: '',
          bio: '“在这清冷如霜的世界里，你是我唯一的满月与浪漫。”', photo: '', createDate: '',
          userid: '@NIVEOUSMOON', tag1: '✦ 专属', tag2: '♡ 奔赴', tag3: '✧ 宇宙漫游', serial: 'NO. 0000-NIVEOUS'
        };
        if (window.AppDB) AppDB.delete(ARCHIVE_DB_KEY);
        renderStep1();
      }
    });

    // 绑定立绘相框点击，调取原生文件选择裁剪器
    document.getElementById('cardPhotoBtn').addEventListener('click', function() {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
      document.body.appendChild(fileInput);

      fileInput.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(e) {
          if (window.AppCropper) {
            // 调用全局的原生 Canvas 裁剪器，裁切为经典 1 : 1.38 的修长立绘比例
            AppCropper.open(e.target.result, { aspectRatio: 1 / 1.38 }, function(croppedData) {
              currentData.photo = croppedData;
              var imgNode = document.getElementById('cardPhotoImg');
              if (imgNode) {
                imgNode.src = croppedData;
                document.getElementById('cardPhotoBtn').classList.add('has-img');
              }
            });
          } else {
            // 如果裁剪器未加载，使用原图保底
            currentData.photo = e.target.result;
            var imgNode2 = document.getElementById('cardPhotoImg');
            if (imgNode2) {
              imgNode2.src = e.target.result;
              document.getElementById('cardPhotoBtn').classList.add('has-img');
            }
          }
        };
        reader.readAsDataURL(file);
        if (fileInput.parentNode) document.body.removeChild(fileInput);
      });

      fileInput.click();
    });

    // 确认封存并存入数据库
    document.getElementById('finishBtn').addEventListener('click', function() {
      readDirectEditableValues();
      if (window.AppDB) {
        AppDB.save(ARCHIVE_DB_KEY, currentData, function() {
          AppNav.showToast('专属档案已安全封存并锁入本地');
        });
      }
    });
  }

  // 获取票根小卡上由 Momo 手指轻点实时编辑的直接值
  function readDirectEditableValues() {
    var serialNode = document.getElementById('cardSerial');
    var vertCodeNode = document.getElementById('cardVertCode');
    var nameNode = document.getElementById('cardName');
    var userIdNode = document.getElementById('cardUserId');
    var bioNode = document.getElementById('cardBio');
    var tag1Node = document.getElementById('cardTag1');
    var tag2Node = document.getElementById('cardTag2');
    var tag3Node = document.getElementById('cardTag3');

    if (serialNode) currentData.serial = serialNode.textContent.trim();
    if (vertCodeNode) currentData.vertCode = vertCodeNode.textContent.trim();
    if (nameNode) currentData.name = nameNode.textContent.trim();
    if (userIdNode) currentData.userid = userIdNode.textContent.trim();
    if (bioNode) currentData.bio = bioNode.textContent.trim();
    if (tag1Node) currentData.tag1 = tag1Node.textContent.trim();
    if (tag2Node) currentData.tag2 = tag2Node.textContent.trim();
    if (tag3Node) currentData.tag3 = tag3Node.textContent.trim();
  }

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
