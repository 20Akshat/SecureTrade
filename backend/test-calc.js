function calcPremium(spot, strike, dte, isCall, iv) {
  const T = Math.max(dte, 0.5) / 365;
  const sigma = iv;
  const r = 0.07; // 7% risk-free interest rate in India
  
  const stdNormalCDF = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) return 1 - prob;
    return prob;
  };
  
  const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const Nd1 = stdNormalCDF(d1);
  const Nd2 = stdNormalCDF(d2);
  const N_d1 = stdNormalCDF(-d1);
  const N_d2 = stdNormalCDF(-d2);
  
  const discount = Math.exp(-r * T);
  
  const premium = isCall 
    ? (spot * Nd1 - strike * discount * Nd2) 
    : (strike * discount * N_d2 - spot * N_d1);
    
  return Math.max(0.05, Math.round(premium * 20) / 20);
}

for (let spot = 23350; spot <= 23450; spot += 10) {
  console.log(`Spot: ${spot} -> CE: ${calcPremium(spot, 22900, 5, true, 0.13)}, PE: ${calcPremium(spot, 22900, 5, false, 0.13)}`);
}
