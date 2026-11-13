import { useCallback, useEffect, useRef, useState } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import { products } from "./data";
import { ProductRail } from "./components/ProductRail";
import { TryOnStage } from "./components/TryOnStage";
import { SettingsPanel } from "./components/SettingsPanel";
import { Icon } from "./components/Icons";

const model = models.realtime("lucy-vton-3.6");

function userFacingError(error, fallback = "操作失败，请稍后重试。") {
  const name = error?.name || "";
  const message = error?.message || "";
  if (name === "NotAllowedError") return "摄像头权限被拒绝，请在浏览器设置中允许访问。";
  if (name === "NotFoundError" || message.includes("Requested device not found")) return "未检测到可用摄像头，请连接设备后重试。";
  if (name === "NotReadableError") return "摄像头正被其他应用占用，请关闭占用程序后重试。";
  if (message.includes("Missing API key")) return "服务端尚未配置 DECART_API_KEY。";
  return message || fallback;
}

async function fetchClientToken() {
  const response = await fetch("/api/realtime-token", { method: "POST" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.apiKey) {
    throw new Error(payload.message || "无法获取 Decart 临时令牌。");
  }
  return payload.apiKey;
}

async function imageUrlToBlob(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("无法读取商品图片。");
  return response.blob();
}

async function normalizeGarmentBlob(blob, maxSize = 1024) {
  const image = new Image();
  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("无法解析商品图片。"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("商品图片处理失败。")),
      "image/jpeg",
      0.9,
    );
  });
}

export default function App() {
  const [selected, setSelected] = useState(products[0]);
  const [prompt, setPrompt] = useState(products[0].prompt);
  const [garmentFile, setGarmentFile] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState("");
  const [speed, setSpeed] = useState("standard");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const [remoteReady, setRemoteReady] = useState(false);
  const [diagnostic, setDiagnostic] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const realtimeRef = useRef(null);
  const videoObjectUrlRef = useRef("");
  const remoteFrameTimeoutRef = useRef(null);
  const remoteStreamSeenRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);

  const cameraOn = Boolean(localStreamRef.current) && status !== "idle";
  const busy = status === "connecting" || status === "generating";
  const active = status === "connected" || status === "generating";

  const stopSession = useCallback(() => {
    if (remoteFrameTimeoutRef.current) {
      window.clearTimeout(remoteFrameTimeoutRef.current);
      remoteFrameTimeoutRef.current = null;
    }
    intentionalDisconnectRef.current = true;
    realtimeRef.current?.disconnect();
    realtimeRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteStreamSeenRef.current = false;
    setRemoteReady(false);
    setDiagnostic("");
    setStatus("idle");
    setError("");
  }, []);

  const stopUnproductiveSession = useCallback((message) => {
    const sessionId = realtimeRef.current?.sessionId || "未知";
    intentionalDisconnectRef.current = true;
    realtimeRef.current?.disconnect();
    realtimeRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteStreamSeenRef.current = false;
    setRemoteReady(false);
    setStatus(localStreamRef.current ? "ready" : "idle");
    setError(`${message} 已自动停止本次实时会话，避免继续占用额度。请确认 Decart 账户余额；余额正常时，把会话 ID 提供给 Decart 支持：${sessionId}`);
    setDiagnostic("Decart 未返回视频 · 会话已自动停止");
  }, []);

  const attachRemoteStream = useCallback((transformedStream) => {
    const video = remoteVideoRef.current;
    if (!video) return;

    setRemoteReady(false);
    video.srcObject = transformedStream;

    const handleVideoTrack = () => {
      if (!transformedStream.getVideoTracks().length) return;
      remoteStreamSeenRef.current = true;
      setDiagnostic("已收到 Decart 输出轨道，等待首帧解码");
      video.play().catch(() => {});
    };
    handleVideoTrack();
    transformedStream.addEventListener("addtrack", handleVideoTrack);

    const revealOnFirstFrame = () => {
      if (!video.videoWidth || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (remoteFrameTimeoutRef.current) {
        window.clearTimeout(remoteFrameTimeoutRef.current);
        remoteFrameTimeoutRef.current = null;
      }
      setError("");
      setDiagnostic(`已收到画面 · ${video.videoWidth}×${video.videoHeight}`);
      setRemoteReady(true);
    };

    video.addEventListener("loadeddata", revealOnFirstFrame, { once: true });
    video.addEventListener("playing", revealOnFirstFrame, { once: true });
    if (typeof video.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback(() => {
        setError("");
        setDiagnostic(`已收到画面 · ${video.videoWidth}×${video.videoHeight}`);
        setRemoteReady(true);
        if (remoteFrameTimeoutRef.current) {
          window.clearTimeout(remoteFrameTimeoutRef.current);
          remoteFrameTimeoutRef.current = null;
        }
      });
    }

    transformedStream.getVideoTracks().forEach((track) => {
      track.addEventListener("unmute", () => video.play().catch(() => {}), { once: true });
    });
    video.play().catch(() => {});

    if (remoteFrameTimeoutRef.current) window.clearTimeout(remoteFrameTimeoutRef.current);
    remoteFrameTimeoutRef.current = window.setTimeout(() => {
      if (!video.videoWidth) {
        stopUnproductiveSession("已连接到 Decart，但 15 秒内没有收到任何视频帧。");
      }
    }, 15000);
  }, [stopUnproductiveSession]);

  useEffect(() => stopSession, [stopSession]);
  useEffect(() => () => {
    if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    if (videoObjectUrlRef.current) URL.revokeObjectURL(videoObjectUrlRef.current);
  }, [garmentPreview]);

  const openCamera = useCallback(async () => {
    setError("");
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", frameRate: model.fps, width: model.width, height: model.height },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const settings = stream.getVideoTracks()[0]?.getSettings?.() || {};
      setDiagnostic(`摄像头 ${settings.width || "?"}×${settings.height || "?"} · ${settings.frameRate || "?"} fps`);
      setStatus("ready");
      return stream;
    } catch (cameraError) {
      setStatus("error");
      setError(userFacingError(cameraError, "无法打开摄像头，请确认设备未被其他应用占用。"));
      return null;
    }
  }, []);

  const getGarmentBlob = useCallback(async () => {
    const source = garmentFile || await imageUrlToBlob(selected.image);
    return normalizeGarmentBlob(source);
  }, [garmentFile, selected.image]);

  const applyGarment = useCallback(async (client = realtimeRef.current) => {
    if (!client) return;
    setStatus("generating");
    setDiagnostic("正在处理并提交服装图片");
    const blob = await getGarmentBlob();
    await client.set({ image: blob, prompt: prompt.trim(), enhance: false });
    setDiagnostic("服装图片已提交 · 等待 Decart 输出轨道");
    if (remoteFrameTimeoutRef.current) window.clearTimeout(remoteFrameTimeoutRef.current);
    remoteFrameTimeoutRef.current = window.setTimeout(() => {
      if (!remoteVideoRef.current?.videoWidth) {
        stopUnproductiveSession("服装图片已提交，但 Decart 在 15 秒内没有返回视频。");
      }
    }, 15000);
  }, [getGarmentBlob, prompt, stopUnproductiveSession]);

  const startTryOn = useCallback(async () => {
    setError("");
    try {
      if (realtimeRef.current) {
        await applyGarment();
        return;
      }

      const stream = await openCamera();
      if (!stream) return;
      setStatus("connecting");
      // Fetch a fresh short-lived credential for each connection.
      const client = createDecartClient({ apiKeyProvider: fetchClientToken });
      remoteStreamSeenRef.current = false;
      intentionalDisconnectRef.current = false;
      setDiagnostic("正在处理服装图片");
      const initialGarment = await getGarmentBlob();
      setDiagnostic("服装图片已就绪 · 正在连接 Decart");
      const realtime = await client.realtime.connect(stream, {
        model,
        mirror: "auto",
        retries: 0,
        capacityRetryBudgetMs: 0,
        ...(speed === "fast" ? { speed: "fast" } : {}),
        onRemoteStream: attachRemoteStream,
        onConnectionChange: (nextState) => {
          if (nextState === "connected") {
            setStatus("connected");
            setDiagnostic("Decart 已连接 · 等待开始生成");
          }
          if (nextState === "generating") {
            setStatus("generating");
            setDiagnostic("Decart 已开始生成 · 等待视频首帧");
          }
          if (nextState === "reconnecting") {
            setStatus("connecting");
            setDiagnostic("Decart 正在重新连接");
          }
          if (nextState === "disconnected" && !intentionalDisconnectRef.current) setStatus("error");
        },
        onConnectionQuality: ({ quality, limitingFactor }) => {
          if (quality === "poor" || quality === "critical") {
            setError(`实时视频网络不稳定（${limitingFactor}），画面可能无法显示。`);
          }
        },
        onQueuePosition: ({ position, queueSize }) => {
          setDiagnostic(`Decart 正在排队 · ${position}/${queueSize}`);
        },
        onCapacityWait: ({ retryAfterMs }) => {
          setDiagnostic(`Decart 容量繁忙 · ${Math.ceil(retryAfterMs / 1000)} 秒后重试`);
        },
      });
      realtimeRef.current = realtime;
      realtime.on("error", (sdkError) => {
        setError(sdkError?.message || "Decart 实时连接发生错误。");
        setStatus("error");
      });
      realtime.on("stats", (stats) => {
        const uploadFps = Math.round(stats.outboundVideo?.framesPerSecond || 0);
        const outputFps = Math.round(stats.video?.framesPerSecond || 0);
        setDiagnostic(`摄像头上传 ${uploadFps} fps · Decart 返回 ${outputFps} fps`);
      });
      realtime.on("sessionEnded", ({ reason }) => {
        const reasonText = {
          insufficient_credits: "账户额度不足",
          session_limit: "并发会话数量已达上限",
          moderation_violation: "内容审核未通过",
          policy_violation: "服务策略拒绝了会话",
        }[reason] || reason;
        setError(`Decart 已结束会话：${reasonText}`);
        setDiagnostic(`服务端结束原因：${reason}`);
        setStatus("error");
      });
      realtime.on("generationEnded", ({ reason }) => {
        if (reason && reason !== "user_disconnect") {
          setError(`Decart 已停止生成：${reason}`);
          setDiagnostic(`生成结束原因：${reason}`);
          setStatus("error");
        }
      });
      realtime.on("generationTick", () => setStatus("generating"));
      if (remoteFrameTimeoutRef.current) window.clearTimeout(remoteFrameTimeoutRef.current);
      remoteFrameTimeoutRef.current = window.setTimeout(() => {
        if (!remoteVideoRef.current?.videoWidth) {
          stopUnproductiveSession("摄像头上传正常，但 Decart 在 15 秒内没有返回视频。");
        }
      }, 15000);
      await realtime.set({ image: initialGarment, prompt: prompt.trim() });
      if (realtimeRef.current === realtime) {
        setDiagnostic("Decart 已确认服装指令 · 等待返回画面");
      }
    } catch (connectionError) {
      if (remoteFrameTimeoutRef.current) window.clearTimeout(remoteFrameTimeoutRef.current);
      intentionalDisconnectRef.current = true;
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
      console.error(connectionError);
      setError(userFacingError(connectionError, "试穿启动失败，请稍后重试。"));
      setStatus("error");
    }
  }, [applyGarment, attachRemoteStream, getGarmentBlob, openCamera, prompt, speed, stopUnproductiveSession]);

  const chooseProduct = useCallback(async (product) => {
    setSelected(product);
    setPrompt(product.prompt);
    setGarmentFile(null);
    setGarmentPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return "";
    });

    if (realtimeRef.current) {
      try {
        setStatus("generating");
        const blob = await normalizeGarmentBlob(await imageUrlToBlob(product.image));
        await realtimeRef.current.set({
          image: blob,
          prompt: product.prompt,
          enhance: false,
        });
        setDiagnostic("新服装图片已提交 · 等待画面更新");
      } catch (switchError) {
        setError(switchError.message || "商品切换失败，请重试。");
        setStatus("error");
      }
    }
  }, []);

  const handleGarmentChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("商品图片不能超过 10MB。");
      return;
    }
    setGarmentFile(file);
    setGarmentPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    stopSession();
    const url = URL.createObjectURL(file);
    videoObjectUrlRef.current = url;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.src = url;
      await localVideoRef.current.play();
      const stream = localVideoRef.current.captureStream?.();
      if (stream) {
        localStreamRef.current = stream;
        setStatus("ready");
      } else {
        setError("当前浏览器不支持从上传视频建立实时流，请使用 Chrome。 ");
        setStatus("error");
      }
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#" aria-label="试衣镜首页">试衣镜</a>
        <div className="header-meta">
          <span className={`header-status status-${status}`}><Icon name="camera" size={18} />{status === "idle" ? "摄像头未开启" : status === "error" ? "连接异常" : "设备已就绪"}</span>
        </div>
      </header>

      <div className="workspace">
        <ProductRail products={products} selectedId={selected.id} onSelect={chooseProduct} busy={busy} />
        <TryOnStage
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          cameraOn={cameraOn}
          remoteReady={remoteReady}
          mirrored={mirrored}
          status={status}
          error={error}
          diagnostic={diagnostic}
          onOpenCamera={openCamera}
          onUploadVideo={handleVideoUpload}
          onToggleMirror={() => setMirrored((value) => !value)}
          onStop={stopSession}
        />
        <SettingsPanel
          product={selected}
          prompt={prompt}
          onPromptChange={setPrompt}
          garmentPreview={garmentPreview}
          onGarmentChange={handleGarmentChange}
          speed={speed}
          onSpeedChange={setSpeed}
          onStart={startTryOn}
          canStart={Boolean(prompt.trim())}
          busy={busy}
          active={active}
        />
      </div>
    </div>
  );
}
