// Dos Mezclas Catering — pricing engine.
// Single source of truth for quote math. Keep client-side preview and
// server-side authoritative calculation using the same module (client calls
// the API rather than re-implementing this) so numbers can never drift.

const PACKAGES = {
  fajita_chicken: { label: 'Fajitas – Chicken', pricePerGuest: 14 },
  fajita_beef: { label: 'Fajitas – Beef', pricePerGuest: 14 },
  fajita_mixed: { label: 'Fajitas – Mixed (Most Popular)', pricePerGuest: 15 },
  tacos: { label: 'Tacos Bar', pricePerGuest: 14 },
  custom: { label: 'Custom Menu (quoted manually)', pricePerGuest: null },
};

const ADDONS = {
  chips_salsa: { label: 'Chips & Salsa', pricePerGuest: 2 },
  guacamole: { label: 'Guacamole', pricePerGuest: 2.5 },
  queso: { label: 'Queso', pricePerGuest: 2.5 },
  churros: { label: 'Churros', pricePerGuest: 3 },
  gulab_churro_balls: { label: 'Gulab Churro Balls', pricePerGuest: 3.5 },
};

const SERVICE_TYPES = {
  pickup: { label: 'Pickup', flatFee: 0, perGuestFee: 0 },
  delivery: { label: 'Delivery', flatFee: 35, perGuestFee: 0 },
  full_service: { label: 'Full Service (Setup + Servers)', flatFee: 75, perGuestFee: 8 },
};

const TAX_RATE = 0.0825; // Aubrey, TX
const SERVICE_CHARGE_RATE = 0.18;
const DEPOSIT_RATE = 0.30;
const PROMO_CODES = {
  DOSMEZCLAS10: 0.10,
};
const MIN_GUESTS = 10;

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * @param {object} input
 * @param {string[]} input.packages - keys into PACKAGES (one or more — guests can mix menus)
 * @param {string[]} input.addons - keys into ADDONS
 * @param {string} input.serviceType - key into SERVICE_TYPES
 * @param {number} input.guestCount
 * @param {string} [input.promoCode]
 */
function calculateQuote(input) {
  const { packages = [], addons = [], serviceType, guestCount, promoCode } = input;

  const errors = [];

  if (!Array.isArray(packages) || packages.length === 0) {
    errors.push('Select at least one main package');
  }
  const invalidPackages = packages.filter((p) => !PACKAGES[p]);
  if (invalidPackages.length) errors.push(`Unknown package(s): ${invalidPackages.join(', ')}`);

  const service = SERVICE_TYPES[serviceType];
  if (!service) errors.push(`Unknown service type: ${serviceType}`);

  const guests = Number(guestCount);
  if (!Number.isFinite(guests) || guests < MIN_GUESTS) {
    errors.push(`Guest count must be a number of at least ${MIN_GUESTS}`);
  }

  const invalidAddons = addons.filter((a) => !ADDONS[a]);
  if (invalidAddons.length) errors.push(`Unknown add-ons: ${invalidAddons.join(', ')}`);

  if (errors.length) {
    return { ok: false, errors };
  }

  const selectedPackages = packages.map((key) => ({ key, ...PACKAGES[key] }));

  // Custom menu (or any package priced null) can't be auto-priced — flag for manual follow-up.
  if (selectedPackages.some((p) => p.pricePerGuest === null)) {
    return {
      ok: true,
      requiresManualQuote: true,
      packages: selectedPackages.map((p) => ({ key: p.key, label: p.label })),
      guestCount: guests,
      serviceType: { key: serviceType, label: service.label },
      message: 'Custom menus are quoted individually. We’ll follow up within 24 hours with pricing.',
    };
  }

  const packageLines = selectedPackages.map((p) => {
    const lineTotal = round2(p.pricePerGuest * guests);
    return { key: p.key, label: p.label, pricePerGuest: p.pricePerGuest, total: lineTotal };
  });
  const foodSubtotal = round2(packageLines.reduce((sum, l) => sum + l.total, 0));

  const addonLines = addons.map((key) => {
    const a = ADDONS[key];
    const lineTotal = round2(a.pricePerGuest * guests);
    return { key, label: a.label, pricePerGuest: a.pricePerGuest, total: lineTotal };
  });
  const addonsSubtotal = round2(addonLines.reduce((sum, l) => sum + l.total, 0));

  const serviceFee = round2(service.flatFee + service.perGuestFee * guests);

  const preDiscountSubtotal = round2(foodSubtotal + addonsSubtotal + serviceFee);

  let discountRate = 0;
  let discountLabel = null;
  if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
    discountRate = PROMO_CODES[promoCode.toUpperCase()];
    discountLabel = `Promo code ${promoCode.toUpperCase()}`;
  }
  const discountAmount = round2(preDiscountSubtotal * discountRate);

  const netSubtotal = round2(preDiscountSubtotal - discountAmount);

  const serviceCharge = round2(netSubtotal * SERVICE_CHARGE_RATE);
  const tax = round2(netSubtotal * TAX_RATE);

  const total = round2(netSubtotal + serviceCharge + tax);
  const depositDue = round2(total * DEPOSIT_RATE);
  const balanceDue = round2(total - depositDue);

  return {
    ok: true,
    requiresManualQuote: false,
    guestCount: guests,
    packages: packageLines,
    addons: addonLines,
    serviceType: { key: serviceType, label: service.label, flatFee: service.flatFee, perGuestFee: service.perGuestFee, total: serviceFee },
    breakdown: {
      foodSubtotal,
      addonsSubtotal,
      serviceFee,
      preDiscountSubtotal,
      discountRate,
      discountLabel,
      discountAmount,
      netSubtotal,
      serviceChargeRate: SERVICE_CHARGE_RATE,
      serviceCharge,
      taxRate: TAX_RATE,
      tax,
      total,
      depositRate: DEPOSIT_RATE,
      depositDue,
      balanceDue,
    },
  };
}

module.exports = { PACKAGES, ADDONS, SERVICE_TYPES, TAX_RATE, SERVICE_CHARGE_RATE, DEPOSIT_RATE, MIN_GUESTS, calculateQuote };
