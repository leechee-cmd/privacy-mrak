/**
 * ui.js - UI 交互控制
 * 处理拖拽上传、参数联动、主题切换等 UI 逻辑
 */

class UIController {
  /**
   * @param {WatermarkEngine} engine - 水印引擎实例
   */
  constructor(engine) {
    this.engine = engine;
    /** @type {File|null} 当前上传的文件 */
    this.currentFile = null;

    // 缓存 DOM 元素
    this.elements = {
      // 上传
      dropZone: document.getElementById('dropZone'),
      fileInput: document.getElementById('fileInput'),
      fileInfo: document.getElementById('fileInfo'),
      fileThumbnail: document.getElementById('fileThumbnail'),
      fileName: document.getElementById('fileName'),
      fileSize: document.getElementById('fileSize'),
      removeFile: document.getElementById('removeFile'),

      // 预览
      emptyState: document.getElementById('emptyState'),
      previewContainer: document.getElementById('previewContainer'),

      // 水印参数
      watermarkText: document.getElementById('watermarkText'),
      fontSize: document.getElementById('fontSize'),
      fontSizeValue: document.getElementById('fontSizeValue'),
      fontColor: document.getElementById('fontColor'),
      opacity: document.getElementById('opacity'),
      opacityValue: document.getElementById('opacityValue'),
      rotation: document.getElementById('rotation'),
      rotationValue: document.getElementById('rotationValue'),
      spacing: document.getElementById('spacing'),
      spacingValue: document.getElementById('spacingValue'),

      // 导出
      exportBtn: document.getElementById('exportBtn'),

      // 主题
      themeToggle: document.getElementById('themeToggle'),
    };

    this._initEventListeners();
    this._initTheme();
  }

  /**
   * 初始化所有事件监听器
   */
  _initEventListeners() {
    const el = this.elements;

    // ======= 文件上传相关 =======

    // 拖拽上传区域
    el.dropZone.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', (e) => this._handleFileSelect(e.target.files));

    // 拖拽事件
    el.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropZone.classList.add('drag-over');
    });
    el.dropZone.addEventListener('dragleave', () => {
      el.dropZone.classList.remove('drag-over');
    });
    el.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropZone.classList.remove('drag-over');
      this._handleFileSelect(e.dataTransfer.files);
    });

    // 全页面拖拽支持
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      this._showGlobalDropOverlay();
    });
    document.addEventListener('dragleave', (e) => {
      // 仅当真正离开窗口时才隐藏
      if (!e.relatedTarget && e.clientX === 0 && e.clientY === 0) {
        this._hideGlobalDropOverlay();
      }
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this._hideGlobalDropOverlay();
      if (e.target !== el.dropZone && !el.dropZone.contains(e.target)) {
        this._handleFileSelect(e.dataTransfer.files);
      }
    });

    // 移除文件
    el.removeFile.addEventListener('click', () => this._removeImage());

    // ======= 水印参数联动 =======

    // 水印文字
    el.watermarkText.addEventListener('input', () => {
      this.engine.updateConfig({ text: el.watermarkText.value });
    });

    // 模板标签
    document.querySelectorAll('.chip[data-text]').forEach((chip) => {
      chip.addEventListener('click', () => {
        // 激活状态
        document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');

        const text = chip.dataset.text;
        if (text !== undefined && text !== '') {
          el.watermarkText.value = text;
          this.engine.updateConfig({ text });
        } else {
          // 自定义：清空并聚焦
          el.watermarkText.value = '';
          el.watermarkText.focus();
          this.engine.updateConfig({ text: '' });
        }
      });
    });

    // 字体大小
    el.fontSize.addEventListener('input', () => {
      const val = parseInt(el.fontSize.value);
      el.fontSizeValue.textContent = `${val}px`;
      this.engine.updateConfig({ fontSize: val });
      this._updateSliderFill(el.fontSize);
    });

    // 字体颜色
    el.fontColor.addEventListener('input', () => {
      this.engine.updateConfig({ fontColor: el.fontColor.value });
    });

    // 颜色预设
    document.querySelectorAll('.color-preset').forEach((preset) => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        el.fontColor.value = color;
        this.engine.updateConfig({ fontColor: color });
      });
    });

    // 透明度
    el.opacity.addEventListener('input', () => {
      const val = parseInt(el.opacity.value);
      el.opacityValue.textContent = `${val}%`;
      this.engine.updateConfig({ opacity: val / 100 });
      this._updateSliderFill(el.opacity);
    });

    // 旋转角度
    el.rotation.addEventListener('input', () => {
      const val = parseInt(el.rotation.value);
      el.rotationValue.textContent = `${val}°`;
      this.engine.updateConfig({ rotation: val });
      this._updateSliderFill(el.rotation);
    });

    // 水印间距
    el.spacing.addEventListener('input', () => {
      const val = parseInt(el.spacing.value);
      el.spacingValue.textContent = `${val}px`;
      this.engine.updateConfig({ spacing: val });
      this._updateSliderFill(el.spacing);
    });

    // 延迟初始化滑块填充色，确保 DOM 完全渲染后计算
    requestAnimationFrame(() => {
      [el.fontSize, el.opacity, el.rotation, el.spacing].forEach(s => this._updateSliderFill(s));
    });

    // ======= 自定义下拉菜单初始化 =======
    this._initCustomSelect();

    // 导出相关 => 导出按钮
    el.exportBtn.addEventListener('click', () => this._exportImage());

    // ======= 主题切换 =======
    el.themeToggle.addEventListener('click', () => this._toggleTheme());

    // ======= 关于弹窗 =======
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const aboutClose = document.getElementById('aboutClose');

    if (aboutBtn && aboutModal) {
      // 打开弹窗
      aboutBtn.addEventListener('click', () => {
        aboutModal.hidden = false;
      });

      // 关闭弹窗（点击按钮）
      aboutClose.addEventListener('click', () => {
        aboutModal.hidden = true;
      });

      // 关闭弹窗（点击蒙层背景）
      aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
          aboutModal.hidden = true;
        }
      });
    }
  }

  /**
   * 处理文件选择
   * @param {FileList} files
   */
  async _handleFileSelect(files) {
    if (!files || files.length === 0) return;

    const file = files[0];

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小（限制 50MB）
    if (file.size > 50 * 1024 * 1024) {
      alert('图片文件不能超过 50MB');
      return;
    }

    this.currentFile = file;

    try {
      await this.engine.loadImage(file);
      this._showPreviewState();
      this._updateFileInfo(file);
    } catch (err) {
      console.error('图片加载失败:', err);
      alert('图片加载失败，请重试');
    }
  }

  /**
   * 显示预览状态（隐藏空状态，显示画布）
   */
  _showPreviewState() {
    const el = this.elements;
    el.emptyState.hidden = true;
    el.previewContainer.hidden = false;
    el.exportBtn.disabled = false;
    el.dropZone.hidden = true;
    el.fileInfo.hidden = false;
  }

  /**
   * 显示空状态
   */
  _showEmptyState() {
    const el = this.elements;
    el.emptyState.hidden = false;
    el.previewContainer.hidden = true;
    el.exportBtn.disabled = true;
    el.dropZone.hidden = false;
    el.fileInfo.hidden = true;
  }

  /**
   * 更新文件信息显示
   * @param {File} file
   */
  _updateFileInfo(file) {
    const el = this.elements;
    el.fileName.textContent = file.name;
    el.fileSize.textContent = this._formatFileSize(file.size);

    // 生成缩略图
    const reader = new FileReader();
    reader.onload = (e) => {
      el.fileThumbnail.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * 移除图片
   */
  _removeImage() {
    this.currentFile = null;
    this.engine.clear();
    this.elements.fileInput.value = '';
    this._showEmptyState();
  }

  // ======= 自定义下拉菜单 =======

  /**
   * 初始化所有的自定义下拉菜单
   */
  _initCustomSelect() {
    const selects = document.querySelectorAll('.custom-select');

    // 由于页面上有多个自定义下拉框，我们需要分别处理各自的状态逻辑
    this._exportFormat = 'png'; // 导出格式初始值

    selects.forEach(selectEl => {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const valueDisplay = selectEl.querySelector('.custom-select-value');
      const items = selectEl.querySelectorAll('.custom-select-item');

      // 点击触发器切换当前菜单
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 关闭其他已打开的菜单
        document.querySelectorAll('.custom-select.open').forEach(el => {
          if(el !== selectEl) el.classList.remove('open');
        });

        selectEl.classList.toggle('open');
      });

      // 选择选项
      items.forEach((item) => {
        item.addEventListener('click', () => {
          // 更新 UI 选中状态
          items.forEach((i) => i.classList.remove('selected'));
          item.classList.add('selected');

          const val = item.dataset.value;

          // 针对不同 ID 进行不同业务逻辑处理
          if (selectEl.id === 'formatSelect') {
            this._exportFormat = val;
            const labels = { png: 'PNG', jpeg: 'JPG', webp: 'WebP' };
            valueDisplay.textContent = labels[val] || val.toUpperCase();
          } else if (selectEl.id === 'fontSelect') {
            valueDisplay.textContent = item.textContent.split('(')[0].trim();
            this.engine.updateConfig({ fontFamily: val });
          }

          // 关闭菜单
          selectEl.classList.remove('open');
        });
      });

      // 阻止菜单内点击冒泡
      selectEl.querySelector('.custom-select-menu').addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    // 点击外部区域关闭所有下拉菜单
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select.open').forEach(el => {
        el.classList.remove('open');
      });
    });
  }

  /**
   * 导出图片
   */
  _exportImage() {
    const format = this._exportFormat || 'png';
    const quality = 1.0; // 默认最高质量
    const originalName = this.currentFile ? this.currentFile.name : 'image';

    this.engine.download(format, quality, originalName);
  }

  /**
   * 格式化文件大小
   * @param {number} bytes
   * @returns {string}
   */
  _formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ======= 全页面拖拽覆盖层 =======

  /** 显示全页面拖拽覆盖层 */
  _showGlobalDropOverlay() {
    if (!this._globalOverlay) {
      this._globalOverlay = document.createElement('div');
      this._globalOverlay.className = 'global-drop-overlay';
      this._globalOverlay.innerHTML = `
        <div class="global-drop-overlay-content">
          <p>释放以上传图片</p>
        </div>
      `;
      document.body.appendChild(this._globalOverlay);
    }
    // 使用 requestAnimationFrame 确保过渡动画生效
    requestAnimationFrame(() => {
      this._globalOverlay.classList.add('active');
    });
  }

  /** 隐藏全页面拖拽覆盖层 */
  _hideGlobalDropOverlay() {
    if (this._globalOverlay) {
      this._globalOverlay.classList.remove('active');
    }
  }

  // ======= 滑块填充色 =======

  /**
   * 更新滑块轨道的已填充部分（iOS 风格蓝色高亮）
   * @param {HTMLInputElement} slider - range 类型的 input 元素
   */
  _updateSliderFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;
    // 使用 CSS 变量获取当前主题的 accent 色
    const accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-primary').trim() || '#0a84ff';
    const trackColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.15)';

    slider.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percent}%, ${trackColor} ${percent}%, ${trackColor} 100%)`;
  }

  // ======= 主题切换 =======

  /** 初始化主题（优先用户选择 > 跟随系统偏好） */
  _initTheme() {
    const saved = localStorage.getItem('watermark-theme');
    if (saved) {
      // 用户之前手动选择过，使用保存的主题
      this._applyTheme(saved);
    } else {
      // 首次访问，跟随系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._applyTheme(prefersDark ? 'dark' : 'light');
    }

    // 监听系统主题变化（仅在用户未手动选择时自动跟随）
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('watermark-theme')) {
        this._applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /** 应用指定主题 */
  _applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /** 切换亮色/暗色主题（手动切换后记忆选择） */
  _toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    this._applyTheme(next);
    localStorage.setItem('watermark-theme', next);
  }
}
