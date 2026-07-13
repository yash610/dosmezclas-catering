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

// Service charge is now driven entirely by which service tier the guest
// picks — Drop-Off carries none, Drop-Off + Setup adds 18%, Full-Service
// adds 25%. There are no separate flat/per-guest delivery fees; delivery
// within 10 miles of Aubrey, TX is free on every tier. Locations outside
// that radius are flagged (see `withinDeliveryRadius`) for manual follow-up
// rather than auto-calculated, since we don't have distance lookup wired in.
const SERVICE_TYPES = {
  drop_off: {
    label: 'Drop-Off Catering',
    description: 'Free delivery within 10 miles of Aubrey, TX. Food delivered ready to serve — no additional service charge.',
    serviceChargeRate: 0,
  },
  drop_off_setup: {
    label: 'Drop-Off + Setup',
    description: 'Delivery, setup with burners and warmers, and pickup of equipment after the event.',
    serviceChargeRate: 0.18,
  },
  full_service: {
    label: 'Full-Service Catering',
    description: 'Delivery, setup, servers during the event, and cleanup of our catering equipment.',
    serviceChargeRate: 0.25,
  },
};

const TAX_RATE = 0.0825; // Aubrey, TX
const DEPOSIT_RATE = 0.30;
const PROMO_CODES = {
  DOSMEZCLAS10: 0.10,
};
const MIN_GUESTS = 10;
const DELIVERY_RADIUS_MILES = 10;

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
 * @param {boolean} [input.withinDeliveryRadius] - defaults true; flags out-of-radius leads for manual delivery-fee follow-up
 */
function calculateQuote(input) {
  const { packages = [], addons = [], serviceType, guestCount, promoCode, withinDeliveryRadius = true } = input;

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
      withinDeliveryRadius,
      serviceType: { key: serviceType, label: service.label, description: service.description, serviceChargeRate: service.serviceChargeRate },
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

  const preDiscountSubtotal = round2(foodSubtotal + addonsSubtotal);

  let discountRate = 0;
  let discountLabel = null;
  if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
    discountRate = PROMO_CODES[promoCode.toUpperCase()];
    discountLabel = `Promo code ${promoCode.toUpperCase()}`;
  }
  const discountAmount = round2(preDiscountSubtotal * discountRate);

  const netSubtotal = round2(preDiscountSubtotal - discountAmount);

  const serviceChargeRate = service.serviceChargeRate;
  const serviceCharge = round2(netSubtotal * serviceChargeRate);
  const tax = round2(netSubtotal * TAX_RATE);

  const total = round2(netSubtotal + serviceCharge + tax);
  const depositDue = round2(total * DEPOSIT_RATE);
  const balanceDue = round2(total - depositDue);

  return {
    ok: true,
    requiresManualQuote: false,
    guestCount: guests,
    withinDeliveryRadius,
    packages: packageLines,
    addons: addonLines,
    serviceType: { key: serviceType, label: service.label, description: service.description, serviceChargeRate },
    breakdown: {
      foodSubtotal,
      addonsSubtotal,
      preDiscountSubtotal,
      discountRate,
      discountLabel,
      discountAmount,
      netSubtotal,
      serviceChargeRate,
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

module.exports = { PACKAGES, ADDONS, SERVICE_TYPES, TAX_RATE, DEPOSIT_RATE, MIN_GUESTS, DELIVERY_RADIUS_MILES, calculateQuote };
