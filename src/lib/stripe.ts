export const STRIPE_TIERS = {
  pro: {
    monthly: {
      priceId: "price_1TCDFh6hiMehSWzzKk0cOUpg",
      productId: "prod_UAYMwXIi5tuZHz",
      amount: 499,
    },
    yearly: {
      priceId: "price_1TCDGC6hiMehSWzzTziwZei2",
      productId: "prod_UAYMBrz7ULA8Lt",
      amount: 3999,
    },
  },
  premium: {
    monthly: {
      priceId: "price_1TCDGd6hiMehSWzza2AVoAxp",
      productId: "prod_UAYNY7GTr8Qvfh",
      amount: 999,
    },
    yearly: {
      priceId: "price_1TCDH96hiMehSWzzbJgoTi4Q",
      productId: "prod_UAYNwDvW28cbDt",
      amount: 7999,
    },
  },
} as const;
