/**
 * watermark.js - 水印处理核心逻辑
 * 负责在 Canvas 上绘制水印
 */

class WatermarkEngine {
  /**
   * @param {HTMLCanvasElement} canvas - 目标画布
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    /** @type {HTMLImageElement|null} 原始图片 */
    this.sourceImage = null;
    /** 水印配置 */
    this.config = {
      text: '仅供个人使用',
      fontSize: 24,
      fontColor: '#ffffff',
      opacity: 0.3,
      rotation: -30,
      spacing: 100,
      fontFamily: "'Noto Sans SC', sans-serif",
    };
  }

  /**
   * 加载图片到引擎
   * @param {File} file - 图片文件
   * @returns {Promise<{width: number, height: number}>} 图片尺寸
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.sourceImage = img;
          // 设置画布为图片原始尺寸
          this.canvas.width = img.naturalWidth;
          this.canvas.height = img.naturalHeight;
          this.render();
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 更新水印配置并重新渲染
   * @param {Partial<typeof this.config>} newConfig - 新的配置项
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    if (this.sourceImage) {
      this.render();
    }
  }

  /**
   * 渲染图片和水印
   */
  render() {
    if (!this.sourceImage) return;

    const { ctx, canvas } = this;
    const { text, fontSize, fontColor, opacity, rotation, spacing, fontFamily } = this.config;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制原始图片
    ctx.drawImage(this.sourceImage, 0, 0, canvas.width, canvas.height);

    if (!text.trim()) return;

    // 设置水印文字样式
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fontColor;
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 计算单个水印文字尺寸
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.4;
    let maxLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }
    const textBlockHeight = lines.length * lineHeight;

    // 水印之间的间距（含文字尺寸）
    const stepX = maxLineWidth + spacing;
    const stepY = textBlockHeight + spacing;

    // 旋转角度（弧度）
    const rad = (rotation * Math.PI) / 180;

    // 计算需要覆盖的范围（旋转后需要更大范围以确保覆盖整个图片）
    const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    const startX = -diagonal;
    const startY = -diagonal;
    const endX = canvas.width + diagonal;
    const endY = canvas.height + diagonal;

    // 在画布中心旋转绘制水印网格
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);

    for (let x = startX; x < endX; x += stepX) {
      for (let y = startY; y < endY; y += stepY) {
        const drawX = x - canvas.width / 2;
        const drawY = y - canvas.height / 2;
        // 绘制多行文字
        for (let i = 0; i < lines.length; i++) {
          const lineY = drawY + (i - (lines.length - 1) / 2) * lineHeight;
          ctx.fillText(lines[i], drawX, lineY);
        }
      }
    }

    ctx.restore();
  }

  /**
   * 导出带水印的图片
   * @param {string} format - 导出格式 (png/jpeg/webp)
   * @param {number} quality - 导出质量 0-1
   * @returns {string} 图片数据 URL
   */
  export(format = 'png', quality = 0.92) {
    if (!this.sourceImage) return null;

    const mimeType = `image/${format}`;
    if (format === 'png') {
      return this.canvas.toDataURL(mimeType);
    }
    return this.canvas.toDataURL(mimeType, quality);
  }

  /**
   * 触发下载
   * @param {string} format - 导出格式
   * @param {number} quality - 导出质量
   * @param {string} originalName - 原始文件名
   */
  download(format = 'png', quality = 0.92, originalName = 'image') {
    const dataUrl = this.export(format, quality);
    if (!dataUrl) return;

    // 构建文件名
    const baseName = originalName.replace(/\.[^.]+$/, '');
    const ext = format === 'jpeg' ? 'jpg' : format;
    const fileName = `${baseName}_watermarked.${ext}`;

    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 清除图片和画布
   */
  clear() {
    this.sourceImage = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
