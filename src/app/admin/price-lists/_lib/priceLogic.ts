/**
 * Celtronics Mission Control V4 - Pricing Logic Engine
 * Implements the strategic discount matrix: Grupa (Tier) x Producent/Kategoria x Wolumen.
 */

export interface PricingFactor {
  tierName: string;
  categoryDiscount: Record<string, number>; // CategoryID -> Discount %
  manufacturerDiscount: Record<string, number>; // Manufacturer -> Discount %
  defaultDiscount: number;
}

// Representative Matrix Data (In a real app, this might come from db.json or a specific settings file)
export const PRICING_MATRIX: Record<string, PricingFactor> = {
  "PARTNER": {
    tierName: "PARTNER",
    categoryDiscount: {
      "sswin": 20,
      "cctv": 15,
      "kd": 18,
      "fire": 10
    },
    manufacturerDiscount: {
      "Satel": 25,
      "Hikvision": 18,
      "Dahua": 20
    },
    defaultDiscount: 10
  },
  "VIP": {
    tierName: "VIP",
    categoryDiscount: {
      "sswin": 30,
      "cctv": 25,
      "kd": 28,
      "fire": 20
    },
    manufacturerDiscount: {
      "Satel": 35,
      "Hikvision": 28,
      "Dahua": 30
    },
    defaultDiscount: 20
  },
  "BASIC": {
    tierName: "BASIC",
    categoryDiscount: {},
    manufacturerDiscount: {},
    defaultDiscount: 5
  }
};

/**
 * Calculates the final merchant price for a B2B partner.
 * Priority: Manufacturer Discount > Category Discount > Default Tier Discount
 */
export function calculateB2BPrice(product: any, tier: string = "BASIC"): { price: number; discount: number } {
  const factor = PRICING_MATRIX[tier] || PRICING_MATRIX["BASIC"];
  
  let discount = factor.defaultDiscount;

  // 1. Check Category
  if (product.categoryId && factor.categoryDiscount[product.categoryId]) {
    discount = factor.categoryDiscount[product.categoryId];
  }

  // 2. Check Manufacturer (Highest Priority)
  if (product.manufacturer && factor.manufacturerDiscount[product.manufacturer]) {
    discount = factor.manufacturerDiscount[product.manufacturer];
  }

  const finalPrice = product.price * (1 - discount / 100);
  
  return {
    price: parseFloat(finalPrice.toFixed(2)),
    discount
  };
}

/**
 * Service/Installation Calculator
 * Logic for "Kalkulator Usług Dodatkowych"
 */
export function calculateServiceCost(hours: number, difficulty: 'STAN' | 'EXP' | 'IND'): number {
  const rates = {
    'STAN': 150, // Standard rate
    'EXP': 250,  // Expert rate
    'IND': 400   // Industrial/High-Risk
  };
  
  return hours * rates[difficulty];
}
