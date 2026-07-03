"use client";

import { useEffect, useState } from "react";

interface PriceData {
  sol: number;
  lastUpdated: number;
}

export function usePrices() {
  const [prices, setPrices] = useState<PriceData>({ sol: 0, lastUpdated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112"
        );
        const data = await res.json();
        const solPrice = Number(
          data?.data?.So11111111111111111111111111111111111111112?.price ?? 0
        );
        setPrices({ sol: solPrice, lastUpdated: Date.now() });
      } catch {
        // Fallback for devnet
        setPrices({ sol: 150, lastUpdated: Date.now() });
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10_000);
    return () => clearInterval(interval);
  }, []);

  return { prices, loading };
}
