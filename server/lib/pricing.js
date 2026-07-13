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
 * @param {string} input.package - key into PACKAGES
 * @param {string[]} input.addons - keys into ADDONS
 * @param {string} input.serviceType - key into SERVICE_TYPES
 * @param {number} input.guestCount
 * @param {string} [input.promoCode]
 */
function calculateQuote(input) {
  const { package: pkgKey, addons = [], serviceType, guestCount, promoCode } = input;

  const errors = [];
  const pkg = PACKAGES[pkgKey];
  if (!pkg) errors.push(`Unknown package: ${pkgKey}`);

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

  // Custom menu can't be auto-priced — flag for manual follow-up.
  if (pkg.pricePerGuest === null) {
    return {
      ok: true,
      requiresManualQuote: true,
      package: { key: pkgKey, label: pkg.label },
      guestCount: guests,
      serviceType: { key: serviceType, label: service.label },
      message: 'Custom menus are quoted individually. We’ll follow up within 24 hours with pricing.',
    };
  }

  const foodSubtotal = round2(pkg.pricePerGuest * guests);

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
    package: { key: pkgKey, label: pkg.label, pricePerGuest: pkg.pricePerGuest, total: foodSubtotal },
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
