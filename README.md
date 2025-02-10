# 3D立体几何可视化工具

这是一个基于Three.js的立体几何可视化工具，可以将立体几何题目转换为3D模型进行可视化展示。

## 功能特点

- 支持多种几何体类型（棱柱、棱锥、圆柱、圆锥、球体等）
- 自动标注顶点和边线
- 支持辅助线显示
- 交互式3D视角控制
- 支持缩放和旋转
- 支持AI辅助解析几何题目

## 使用方法

1. 配置API密钥
   - 在 `config.js` 中配置您的API密钥
   ```javascript
   export const API_CONFIG = {
       apiKey: 'YOUR_API_KEY',
       baseURL: 'YOUR_API_BASE_URL'
   };
   ```

2. 安装依赖
   - 本项目使用CDN引入主要依赖
   - Three.js
   - Axios

3. 运行项目
   - 使用任意HTTP服务器运行项目
   - 例如：使用Python的HTTP服务器
   ```bash
   python -m http.server 5500
   ```
   - 或使用Node.js的http-server
   ```bash
   npx http-server
   ```

4. 使用说明
   - 在文本框中输入立体几何题目
   - 点击"生成3D模型"按钮
   - 使用鼠标或触控板进行交互：
     - 左键拖动：旋转视角
     - 右键拖动：平移视角
     - 滚轮：缩放
   - 使用控制按钮：
     - ←→：左右旋转
     - +-：缩放
     - 重置：恢复默认视角

## 技术栈

- Three.js - 3D渲染引擎
- OrbitControls - 视角控制
- Axios - HTTP请求
- AI API - 几何题目解析

## 项目结构

```
.
├── index.html          # 主页面
├── app.js             # 主要逻辑
├── styles.css         # 样式文件
├── config.js          # 配置文件
└── README.md          # 说明文档
```

## 注意事项

1. 使用前请确保配置正确的API密钥
2. 需要现代浏览器支持（支持WebGL）
3. 建议使用较新版本的Chrome或Firefox

## License

MIT License 