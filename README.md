# 试衣镜（Decart Live Try-On）

一个基于 Vite、React 和 Decart Realtime SDK 的实时虚拟试衣 Demo。浏览器采集输入视频和服装参考图，服务端提供临时客户端令牌，浏览器建立实时试穿会话。

## 功能

- 选择内置服装或上传服装参考图。
- 使用摄像头或本地视频作为输入。
- 通过 Decart Realtime WebRTC 显示实时试穿结果。
- 支持标准和低延迟两种速度档位。
- 支持生产构建和本地静态服务。

## 项目结构

```text
src/                 React 界面和试穿流程
server.mjs           Express 服务端与临时令牌接口
public/              Demo 服装和背景图片
docs/                使用和架构说明
index.html           Vite 入口页面
vite.config.js       Vite 配置
```

## 环境要求

- Node.js 20.19 或更高版本。
- npm 10 或更高版本。
- 可用的 Decart API Key。
- 支持摄像头和 WebRTC 的现代浏览器。

## 安装与运行

```bash
npm install
cp .env.example .env       # PowerShell：Copy-Item .env.example .env
# 编辑 .env，填写 DECART_API_KEY
npm run dev
```

打开 <http://127.0.0.1:5173>。

生产构建：

```bash
npm run build
npm start
```

## 配置

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DECART_API_KEY` | 是 | 服务端用于创建临时客户端令牌的 Decart API Key。 |
| `PORT` | 否 | 本地监听端口，默认 `5173`。 |

示例见 `.env.example`。

## 使用流程

1. 启动开发服务并打开页面。
2. 选择服装或上传参考图。
3. 允许浏览器访问摄像头。
4. 填写服装描述并开始试穿。
5. 完成后停止实时会话。

详细操作见 [docs/usage.md](./docs/usage.md)，组件关系见 [docs/architecture.md](./docs/architecture.md)。

## 已知限制

- 试穿结果依赖 Decart Realtime 服务、浏览器 WebRTC 能力和网络质量。
- 上传视频需要浏览器支持 `captureStream()`。
- 根项目只包含 Demo 流程，不包含账号、订单、支付或商品数据库。
- Decart SDK、模型名称和配额属于外部服务，可能随版本变化。

## 贡献

修改代码后运行：

```bash
npm run build
node --check server.mjs
```

提交时请保持目录结构清晰，并同步更新相关架构或使用说明。

## 许可证

发布前请在根目录补充作者确认的许可证文件。
