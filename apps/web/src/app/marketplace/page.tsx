"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Product = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  product_type: string;
  category: string;
  rating_avg: number;
  in_wishlist: boolean;
};

type CartItem = {
  id: string;
  quantity: number;
  line_total_cents: number;
  product: Product;
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function MarketplacePage() {
  const { api, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [placed, setPlaced] = useState<string | null>(null);

  async function loadCart() {
    const c = await api.marketplace.cart();
    setCart(c.items as unknown as CartItem[]);
    setCartTotal(c.total_cents);
  }

  async function load() {
    setProducts((await api.marketplace.products()) as unknown as Product[]);
    await loadCart();
    setOrders(await api.marketplace.orders());
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function addToCart(id: string) {
    await api.marketplace.addToCart(id, 1);
    await loadCart();
  }

  async function removeItem(itemId: string) {
    await api.marketplace.removeFromCart(itemId);
    await loadCart();
  }

  async function checkout() {
    const order = await api.marketplace.checkout("marketplace");
    setPlaced(String(order.reference));
    await load();
  }

  return (
    <ModuleShell
      moduleId="marketplace"
      title="Marketplace"
      description="Buy and sell kingdom products and digital goods."
    >
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className="rv-card flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg">{p.title}</p>
                      <p className="text-xs text-[var(--rv-ink-muted)]">
                        {p.category} · {p.product_type}
                      </p>
                    </div>
                    <button onClick={() => api.marketplace.wishlist(p.id).then(load)} className="text-gold-500">
                      {p.in_wishlist ? "★" : "☆"}
                    </button>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-[var(--rv-ink-muted)] line-clamp-2">{p.description}</p>
                  <p className="mt-2 text-xs text-gold-500">★ {p.rating_avg.toFixed(1)}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display text-lg">{money(p.price_cents)}</span>
                    <button className="rv-btn-primary" onClick={() => addToCart(p.id)}>
                      Add to cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rv-card p-5">
              <h2 className="font-display text-xl">Cart</h2>
              <div className="mt-3 space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>
                      {item.product.title} × {item.quantity}
                    </span>
                    <span className="flex items-center gap-2">
                      {money(item.line_total_cents)}
                      <button className="text-[var(--rv-ink-muted)]" onClick={() => removeItem(item.id)}>
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
                {!cart.length && <p className="text-sm text-[var(--rv-ink-muted)]">Your cart is empty.</p>}
              </div>
              {cart.length > 0 && (
                <>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--rv-border)] pt-3">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-lg">{money(cartTotal)}</span>
                  </div>
                  <button className="rv-btn-primary mt-3 w-full" onClick={checkout}>
                    Checkout
                  </button>
                </>
              )}
              {placed && <p className="mt-3 text-sm text-gold-500">Order {placed} confirmed. Thank you!</p>}
            </div>

            <div className="rv-card p-5">
              <h2 className="font-display text-xl">Recent orders</h2>
              <div className="mt-3 space-y-2">
                {orders.map((o) => (
                  <div key={String(o.id)} className="flex items-center justify-between text-sm">
                    <span>{String(o.reference)}</span>
                    <span className="text-[var(--rv-ink-muted)]">
                      {money(Number(o.total_cents))} · {String(o.status)}
                    </span>
                  </div>
                ))}
                {!orders.length && <p className="text-sm text-[var(--rv-ink-muted)]">No orders yet.</p>}
              </div>
            </div>
          </aside>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
