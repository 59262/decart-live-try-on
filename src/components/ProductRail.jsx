export function ProductRail({ products, selectedId, onSelect, busy }) {
  return (
    <aside className="product-rail" aria-label="商品列表">
      <h2>选择商品</h2>
      <div className="product-list">
        {products.map((product) => (
          <button
            className={`product-item ${selectedId === product.id ? "is-selected" : ""}`}
            key={product.id}
            onClick={() => onSelect(product)}
            disabled={busy}
          >
            <span className="product-image-wrap">
              <img src={product.image} alt={product.name} />
            </span>
            <span className="product-name">{product.name}</span>
            <span className="product-price">¥{product.price}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
