/**
 * app.js - 应用入口
 * 初始化水印引擎和 UI 控制器
 */

document.addEventListener('DOMContentLoaded', () => {
  // 获取预览画布
  const canvas = document.getElementById('previewCanvas');

  // 初始化水印引擎
  const engine = new WatermarkEngine(canvas);

  // 初始化 UI 控制器
  const ui = new UIController(engine);

  // 将实例挂载到 window 上，方便调试（生产环境可移除）
  window.__watermarkApp = { engine, ui };
});
