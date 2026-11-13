import { Icon } from "./Icons";

const statusText = {
  idle: "摄像头未开启",
  ready: "摄像头已开启",
  connecting: "正在连接 Decart",
  connected: "已连接，等待返回画面",
  generating: "正在生成试穿效果",
  error: "连接出现问题",
};

export function TryOnStage({
  localVideoRef,
  remoteVideoRef,
  cameraOn,
  remoteReady,
  mirrored,
  status,
  error,
  diagnostic,
  onOpenCamera,
  onUploadVideo,
  onToggleMirror,
  onStop,
}) {
  const active = status === "connecting" || status === "generating" || status === "connected";
  const waitingForOutput = status === "connecting" || status === "generating" || status === "connected";

  const outputMessage = {
    idle: "开启摄像头后开始试穿",
    ready: "选择服装并开始试穿",
    connecting: "正在连接 Decart…",
    generating: "正在生成试穿效果…",
    connected: "等待 Decart 返回画面…",
    error: "渲染连接出现问题",
  }[status];

  return (
    <main className="tryon-main">
      <section className="intro-row">
        <div>
          <h1>看看上身效果</h1>
          <p>选择一件商品，开启摄像头即可实时试穿</p>
        </div>
        <div className="intro-actions">
          <div className="button-row">
            <button className="button button-primary" onClick={onOpenCamera} disabled={cameraOn}>
              <Icon name="camera" />
              {cameraOn ? "摄像头已开启" : "开启摄像头"}
            </button>
            <label className="button button-secondary">
              <Icon name="upload" />
              上传视频
              <input type="file" accept="video/*" onChange={onUploadVideo} />
            </label>
          </div>
          <p className="privacy-note"><Icon name="info" size={17} />视频将发送至 Decart 进行实时处理</p>
        </div>
      </section>

      <section className={`dual-stage-shell ${active ? "is-active" : ""}`} aria-label="实时试穿画面">
        {error && <div className="stage-error">{error}</div>}

        <div className="dual-stage">
          <article className="video-panel local-panel">
            <div className="panel-label"><i />原始画面</div>
            {!cameraOn && <div className="studio-backdrop" aria-hidden="true" />}
            <video
              ref={localVideoRef}
              className={`stage-video ${mirrored ? "is-mirrored" : ""} ${cameraOn ? "is-visible" : ""}`}
              autoPlay
              muted
              playsInline
            />

            {!cameraOn && (
              <>
                <div className="person-guide" aria-hidden="true">
                  <span className="guide-head" />
                  <span className="guide-body" />
                </div>
                <p className="stage-instruction">站在画面中央，保持上半身完整可见</p>
              </>
            )}
          </article>

          <article className="video-panel output-panel">
            <div className="panel-label output-label"><i />AI 试穿效果</div>
            <video
              ref={remoteVideoRef}
              className={`stage-video ${mirrored ? "is-mirrored" : ""} ${remoteReady ? "is-visible" : ""}`}
              autoPlay
              muted
              playsInline
            />
            {!remoteReady && (
              <div className="output-placeholder">
                {waitingForOutput ? <span className="render-spinner" /> : <Icon name="camera" size={31} />}
                <strong>{outputMessage}</strong>
                <span>{diagnostic || (cameraOn ? "原始画面会保持显示" : "右侧将实时显示换衣结果")}</span>
              </div>
            )}
            {remoteReady && <span className="live-indicator"><i />LIVE</span>}
          </article>
        </div>

        <div className="stage-controls">
          <span className={`connection-status status-${status}`}><i />{statusText[status]}</span>
          <div className="control-buttons">
            <button className="round-control" onClick={onOpenCamera} disabled={cameraOn} aria-label="开启摄像头">
              <Icon name="camera" size={21} />
              <small>摄像头</small>
            </button>
            <button className={`round-control ${mirrored ? "is-on" : ""}`} onClick={onToggleMirror} aria-label="切换镜像">
              <Icon name="mirror" size={21} />
              <small>镜像</small>
            </button>
            <button className="round-control danger" onClick={onStop} disabled={!cameraOn} aria-label="结束会话">
              <Icon name="phone" size={21} />
              <small>结束</small>
            </button>
          </div>
          <span className="mode-note">左右实时对照</span>
        </div>
      </section>
    </main>
  );
}
