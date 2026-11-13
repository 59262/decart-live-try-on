import { Icon } from "./Icons";

export function SettingsPanel({
  product,
  prompt,
  onPromptChange,
  garmentPreview,
  onGarmentChange,
  speed,
  onSpeedChange,
  onStart,
  canStart,
  busy,
  active,
}) {
  return (
    <aside className="settings-panel" aria-label="试穿设置">
      <h2>试穿设置</h2>

      <div className="selected-product">
        <span className="selected-thumb"><img src={garmentPreview || product.image} alt="" /></span>
        <span><strong>{product.name}</strong><b>¥{product.price}</b></span>
      </div>

      <div className="setting-group">
        <label className="setting-label">替换商品图</label>
        <label className="upload-zone">
          <Icon name="image" size={27} />
          <strong>点击上传图片</strong>
          <span>建议正面平铺或模特图，JPG / PNG</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onGarmentChange} />
        </label>
      </div>

      <div className="setting-group">
        <label className="setting-label" htmlFor="garment-prompt">服装描述</label>
        <textarea
          id="garment-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          maxLength={500}
          rows={5}
        />
        <span className="char-count">{prompt.length}/500</span>
      </div>

      <fieldset className="setting-group quality-group">
        <legend className="setting-label">试穿质量</legend>
        <div className="quality-options">
          <button className={speed === "standard" ? "is-selected" : ""} onClick={() => onSpeedChange("standard")}>
            <span className="radio-dot" />标准
          </button>
          <button className={speed === "fast" ? "is-selected" : ""} onClick={() => onSpeedChange("fast")}>
            <span className="radio-dot" />低延迟
          </button>
        </div>
        <p>{speed === "fast" ? "Fast 模式延迟更低，消耗 4 credits/秒" : "标准模式消耗 2 credits/秒"}</p>
      </fieldset>

      <button className="button start-button" onClick={onStart} disabled={!canStart || busy}>
        {busy ? <span className="spinner" /> : active ? <Icon name="check" /> : <Icon name="play" />}
        {busy ? "正在连接" : active ? "更新试穿效果" : "开始试穿"}
      </button>
    </aside>
  );
}
