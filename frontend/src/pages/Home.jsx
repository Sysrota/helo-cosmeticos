import { useEffect, useState } from "react";
import Hero from "../components/Hero";
import HomeBenefits from "../components/HomeBenefits";
import ProductsSection from "../components/ProductsSection";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFeaturedProducts() {
      try {
        const [productsResponse, featuredResponse] = await Promise.all([
          fetch(`${API_URL}/products?active=true&limit=3&sort=new`),
          fetch(`${API_URL}/products?active=true&featured=true&limit=1`),
        ]);

        if (!productsResponse.ok || !featuredResponse.ok) {
          throw new Error("Falha ao carregar produtos");
        }

        const [productsData, featuredData] = await Promise.all([
          productsResponse.json(),
          featuredResponse.json(),
        ]);
        const highlights = Array.isArray(productsData.items)
          ? productsData.items.slice(0, 3)
          : [];
        const featured =
          Array.isArray(featuredData.items) && featuredData.items[0]
            ? featuredData.items[0]
            : highlights[0] || null;

        if (active) {
          setProducts(highlights);
          setFeaturedProduct(featured);
        }
      } catch {
        if (active) {
          setProducts([]);
          setFeaturedProduct(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFeaturedProducts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <Hero featuredProduct={featuredProduct} />
      <HomeBenefits />
      <ProductsSection items={products} loading={loading} />
    </div>
  );
}
