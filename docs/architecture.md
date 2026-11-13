# 架构说明

```text
浏览器（React/Vite）
  ├─ 获取摄像头或本地视频轨道
  ├─ POST /api/realtime-token ──> Express 服务端
  │                                  └─ 创建临时客户端令牌
  └─ Decart Realtime WebRTC <───────┘
       ├─ 上传视频轨道和服装参考图
       └─ 返回实时试穿视频轨道
```

## 主要模块

- `src/App.jsx`：管理媒体输入、服装选择、实时连接和状态显示。
- `src/components/`：试穿舞台、商品栏、设置面板和图标组件。
- `src/data.js`：内置商品及其服装描述。
- `server.mjs`：提供令牌接口，并在生产模式下托管 `dist/`。
- `public/`：内置服装和演示背景素材。

## 数据流

1. 浏览器获取媒体输入。
2. 浏览器请求服务端临时客户端令牌。
3. 浏览器使用令牌连接 Decart Realtime。
4. 浏览器提交服装参考图和文字描述。
5. Decart 返回实时视频轨道，页面将其显示在试穿舞台中。

## 构建与部署

开发模式使用 Vite 中间件；生产模式先运行 `npm run build`，再由 `npm start` 提供 `dist/` 静态文件和服务端接口。
