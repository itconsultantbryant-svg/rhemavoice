import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type StoreProduct = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  sku: string;
  category: string;
  stock: number;
  is_featured: boolean;
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StoreScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.store
      .products()
      .then((data) => setProducts(data as unknown as StoreProduct[]))
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

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const visible = category === "all" ? products : products.filter((p) => p.category === category);

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
          Back
        </Button>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          <Avatar.Icon size={44} icon="storefront-outline" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
          <View>
            <Text variant="headlineSmall" style={{ fontWeight: "800" }}>Store</Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>Books, media, and resources</Text>
          </View>
        </View>

        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            {categories.map((c) => (
              <Chip
                key={c}
                selected={category === c}
                onPress={() => setCategory(c)}
                style={{ marginRight: 6 }}
              >
                {c === "all" ? "All" : c}
              </Chip>
            ))}
          </ScrollView>
        )}

        {visible.map((product) => (
          <Card key={product.id} style={{ marginTop: 10, backgroundColor: colors.elevated }}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <Avatar.Icon size={40} icon={product.is_featured ? "star" : "book-open-variant"} color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "700", flexShrink: 1 }}>{product.title}</Text>
                    {product.is_featured && (
                      <Chip compact style={{ backgroundColor: "rgba(197,160,72,0.15)" }} textStyle={{ color: colors.gold500, fontSize: 9 }}>
                        Featured
                      </Chip>
                    )}
                  </View>
                  <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 10, marginTop: 6 }}>
                    SKU {product.sku}{product.category ? ` · ${product.category}` : ""}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <Text style={{ color: colors.gold500, fontWeight: "800", fontSize: 16 }}>{money(product.price_cents)}</Text>
                <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                  {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        {visible.length === 0 && (
          <Text style={{ color: colors.inkMuted, textAlign: "center", marginTop: 32 }}>
            No products in this category yet.
          </Text>
        )}
      </Animated.View>
    </ScrollView>
  );
}
