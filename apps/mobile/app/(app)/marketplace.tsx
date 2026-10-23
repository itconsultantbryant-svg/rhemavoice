import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, IconButton, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Product = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  product_type: string;
  category: string;
  stock: number;
  rating_avg: number;
  in_wishlist: boolean;
};

type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  line_total_cents: number;
};

type Cart = { items: CartItem[]; total_cents: number };

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MarketplaceScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({ items: [], total_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    Promise.all([api.marketplace.products(), api.marketplace.cart()])
      .then(([productData, cartData]) => {
        setProducts(productData as unknown as Product[]);
        setCart(cartData as unknown as Cart);
      })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    load();
  }, [user]);

  async function add(product: Product) {
    setBusy(true);
    try {
      await api.marketplace.addToCart(product.id);
      setCart((await api.marketplace.cart()) as unknown as Cart);
    } catch (e: any) {
      Alert.alert("Could not add item", e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CartItem) {
    setBusy(true);
    try {
      await api.marketplace.removeFromCart(item.id);
      setCart((await api.marketplace.cart()) as unknown as Cart);
    } finally {
      setBusy(false);
    }
  }

  async function toggleWishlist(product: Product) {
    await api.marketplace.wishlist(product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, in_wishlist: !p.in_wishlist } : p))
    );
  }

  async function checkout() {
    setBusy(true);
    try {
      const order = (await api.marketplace.checkout()) as { reference?: string; total_cents?: number };
      Alert.alert(
        "Order placed",
        `Reference ${order.reference || "—"}\nTotal ${money(order.total_cents || cart.total_cents)}`
      );
      setCart({ items: [], total_cents: 0 });
    } catch (e: any) {
      Alert.alert("Checkout failed", e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
          Back
        </Button>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          <Avatar.Icon size={44} icon="shopping-outline" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
          <View>
            <Text variant="headlineSmall" style={{ fontWeight: "800" }}>Marketplace</Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{products.length} products</Text>
          </View>
        </View>

        {cart.items.length > 0 && (
          <Card style={{ marginTop: 16, backgroundColor: colors.navy900, borderRadius: 16 }}>
            <Card.Content>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Your cart</Text>
              {cart.items.map((item) => (
                <View key={item.id} style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 13 }} numberOfLines={1}>{item.product.title}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                      {item.quantity} × {money(item.product.price_cents)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.gold500, fontWeight: "700", marginRight: 4 }}>{money(item.line_total_cents)}</Text>
                  <IconButton icon="close" iconColor="rgba(255,255,255,0.7)" size={18} onPress={() => remove(item)} disabled={busy} />
                </View>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Total {money(cart.total_cents)}</Text>
                <Button mode="contained" onPress={checkout} disabled={busy} style={{ backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                  Checkout
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        <Text variant="titleLarge" style={{ marginTop: 24, fontWeight: "700" }}>Products</Text>
        {products.map((product) => (
          <Card key={product.id} style={{ marginTop: 10, backgroundColor: colors.elevated }}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{product.title}</Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    <Chip compact>{product.category}</Chip>
                    {product.stock > 0 ? (
                      <Chip compact icon="package-variant">{product.stock} in stock</Chip>
                    ) : (
                      <Chip compact>Sold out</Chip>
                    )}
                    {product.rating_avg > 0 && <Chip compact icon="star">{product.rating_avg.toFixed(1)}</Chip>}
                  </View>
                </View>
                <IconButton
                  icon={product.in_wishlist ? "heart" : "heart-outline"}
                  iconColor={product.in_wishlist ? colors.gold500 : colors.inkMuted}
                  size={20}
                  onPress={() => toggleWishlist(product)}
                />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <Text style={{ color: colors.gold500, fontWeight: "800", fontSize: 16 }}>{money(product.price_cents)}</Text>
                <Button mode="outlined" onPress={() => add(product)} disabled={busy || product.stock <= 0}>
                  Add to cart
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
