function runBlackScholes(spot, strike, dte, isCall, iv) {
    const T = Math.max(dte, 0.5) / 365;
    const sigma = iv;
    const r = 0.07;
    
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
    
    console.log("d1:", d1, "d2:", d2, "Nd1:", Nd1, "Nd2:", Nd2);
    
    const discount = Math.exp(-r * T);
    
    const premium = isCall 
        ? (spot * Nd1 - strike * discount * Nd2) 
        : (strike * discount * N_d2 - spot * N_d1);
        
    return Math.max(0.05, Math.round(premium * 20) / 20);
}

runBlackScholes(24096, 24100, 5, true, 0.13);
