/* 旅行流行病學工具箱：數值方法與模型核心。
   所有模型函式只依賴輸入參數，可在 tests.html 中驗證。 */
const Epi = (() => {
  'use strict';

  // ---------- 亂數（可設定種子以重現結果） ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = Math.random;
  const setSeed = s => { rng = Number.isFinite(s) ? mulberry32(s) : Math.random; };
  const runif = () => rng();
  function rnorm(mu = 0, sd = 1) {
    let u = 0;
    while (u === 0) u = rng();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  }
  const rlnorm = (meanlog, sdlog) => Math.exp(rnorm(meanlog, sdlog));
  function rgamma(shape, scale = 1) { // Marsaglia–Tsang
    if (shape < 1) return rgamma(shape + 1, scale) * Math.pow(rng(), 1 / shape);
    const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = rnorm(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = rng();
      if (u < 1 - 0.0331 * x ** 4) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }
  function rbeta(a, b) { const x = rgamma(a), y = rgamma(b); return x / (x + y); }

  // ---------- 特殊函數 ----------
  function lgamma(x) { // Lanczos
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function gammp(a, x) { // 正規化下不完全伽瑪函數 P(a, x)
    if (x <= 0) return 0;
    const lead = -x + a * Math.log(x) - lgamma(a);
    if (x < a + 1) {
      let ap = a, del = 1 / a, sum = del;
      for (let n = 0; n < 1000; n++) {
        ap += 1; del *= x / ap; sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
      }
      return sum * Math.exp(lead);
    }
    const TINY = 1e-300;
    let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
      c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return 1 - Math.exp(lead) * h;
  }
  const pgamma = (x, shape, scale = 1) => gammp(shape, x / scale);
  function qgamma(p, shape, scale = 1) { // 二分法
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    let lo = 0, hi = Math.max(1, shape) * 2;
    while (gammp(shape, hi) < p) hi *= 2;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (gammp(shape, mid) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-12 * Math.max(1, hi)) break;
    }
    return (lo + hi) / 2 * scale;
  }
  function qnorm(p) { // Acklam 演算法
    if (p <= 0 || p >= 1) throw new Error('qnorm 的 p 必須介於 0 與 1 之間');
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    if (p < pl) {
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p <= 1 - pl) {
      const q = p - 0.5, r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    return -qnorm(1 - p);
  }

  // ---------- 描述統計與分佈參數 ----------
  const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
  function quantile(xs, p) {
    const s = [...xs].sort((x, y) => x - y), idx = (s.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  }
  function betaFromMoments(m, sd) {
    const v = sd * sd;
    if (m <= 0 || m >= 1) throw new Error(`Beta 分佈的平均值必須介於 0 與 1 之間（目前為 ${m}）`);
    if (v >= m * (1 - m)) throw new Error(`Beta 分佈的標準差 ${sd} 過大，需小於 √(m(1−m)) = ${Math.sqrt(m * (1 - m)).toFixed(4)}`);
    const k = m * (1 - m) / v - 1;
    return [m * k, (1 - m) * k];
  }
  function gammaFromMoments(m, sd) {
    if (m <= 0) throw new Error('Gamma 分佈的平均值必須大於 0');
    return [(m / sd) ** 2, sd * sd / m];
  }
  function sampleParam(dist, m, sd) {
    if (sd <= 0) return m;
    if (dist === 'beta') { const [a, b] = betaFromMoments(m, sd); return rbeta(a, b); }
    const [k, th] = gammaFromMoments(m, sd);
    return rgamma(k, th);
  }

  // ---------- 基礎流行病學 ----------
  function twoByTwo(a, b, c, d, conf = 0.95) {
    const z = qnorm(1 - (1 - conf) / 2);
    const corrected = [a, b, c, d].some(v => v === 0);
    if (corrected) { a += 0.5; b += 0.5; c += 0.5; d += 0.5; }
    const n1 = a + b, n0 = c + d, p1 = a / n1, p0 = c / n0;
    const rr = p1 / p0, seRR = Math.sqrt(1 / a - 1 / n1 + 1 / c - 1 / n0);
    const or = (a * d) / (b * c), seOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    const rd = p1 - p0, seRD = Math.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0);
    const pe = n1 / (n1 + n0);
    return {
      corrected, p1, p0, rr, or, rd,
      rrCI: [rr * Math.exp(-z * seRR), rr * Math.exp(z * seRR)],
      orCI: [or * Math.exp(-z * seOR), or * Math.exp(z * seOR)],
      rdCI: [rd - z * seRD, rd + z * seRD],
      afe: (rr - 1) / rr,
      paf: pe * (rr - 1) / (1 + pe * (rr - 1))
    };
  }
  function poissonRateCI(x, pt, conf = 0.95) {
    const al = 1 - conf;
    return {
      rate: x / pt,
      lo: x === 0 ? 0 : qgamma(al / 2, x, 1) / pt,
      hi: qgamma(1 - al / 2, x + 1, 1) / pt
    };
  }
  function sampleSizeProportion(p, d, conf = 0.95) {
    const z = qnorm(1 - (1 - conf) / 2);
    return Math.ceil(z * z * p * (1 - p) / (d * d));
  }
  function sampleSizeTwoProportions(p1, p2, alpha = 0.05, power = 0.8) {
    const za = qnorm(1 - alpha / 2), zb = qnorm(power), pb = (p1 + p2) / 2;
    const num = za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    return Math.ceil(num * num / ((p1 - p2) ** 2));
  }
  // 固定發生率 r（每單位時間）在時間 t 內至少發生一次的機率
  const riskFromRate = (r, t) => 1 - Math.exp(-r * t);

  // ---------- 分支過程 ----------
  function extinctionProb(R, k) {
    if (R <= 1) return 1;
    const G = (!Number.isFinite(k) || k > 1e6)
      ? s => Math.exp(R * (s - 1))
      : s => Math.pow(1 + (R / k) * (1 - s), -k);
    let q = 0;
    for (let i = 0; i < 200000; i++) {
      const nq = G(q);
      if (Math.abs(nq - q) < 1e-13) return nq;
      q = nq;
    }
    return q;
  }

  // ---------- 輸出病例（Imai 等 2020） ----------
  function imaiEstimate(x, dailyTravellers, population, window, conf = 0.95) {
    const p = dailyTravellers * window / population;
    if (p <= 0 || p >= 1) throw new Error(`病例出境機率 p = ${p.toFixed(5)}，必須介於 0 與 1 之間，請檢查輸入`);
    const al = 1 - conf;
    const lo = x === 0 ? 0 : qgamma(al / 2, x, 1), hi = qgamma(1 - al / 2, x + 1, 1);
    return { p, estimate: x / p, lo: lo / p, hi: hi / p };
  }

  // ---------- 空氣傳播 ----------
  function wellsRiley({ I, q, p, t, Q, maskI = 0, maskS = 0 }) {
    const dose = I * q * p * t * (1 - maskI) * (1 - maskS) / Q;
    return { dose, P: 1 - Math.exp(-dose) };
  }
  function rudnickMilton({ C, C0, Ca, I, q, t, n }) {
    const f = (C - C0) / Ca;
    return { f, P: 1 - Math.exp(-f * I * q * t / n) };
  }

  // ---------- SEIR ----------
  function rk4Step(f, t, y, h) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y.map((v, i) => v + h / 2 * k1[i]));
    const k3 = f(t + h / 2, y.map((v, i) => v + h / 2 * k2[i]));
    const k4 = f(t + h, y.map((v, i) => v + h * k3[i]));
    return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  function seirODE({ N, I0, R0, incub, infect, days, tInt = Infinity, red = 0, dt = 0.05 }) {
    const sigma = 1 / incub, gamma = 1 / infect, beta = R0 * gamma;
    const f = (t, [S, E, I]) => {
      const b = t < tInt ? beta : beta * (1 - red);
      const inf = b * S * I / N;
      return [-inf, inf - sigma * E, sigma * E - gamma * I, gamma * I];
    };
    let y = [N - I0, 0, I0, 0];
    const steps = Math.round(1 / dt), out = [{ t: 0, S: y[0], E: y[1], I: y[2], R: y[3] }];
    for (let day = 1; day <= days; day++) {
      for (let s = 0; s < steps; s++) y = rk4Step(f, day - 1 + s * dt, y, dt);
      out.push({ t: day, S: y[0], E: y[1], I: y[2], R: y[3] });
    }
    return out;
  }
  function seirGillespie({ N, I0, R0, incub, infect, days, tInt = Infinity, red = 0 }) {
    const sigma = 1 / incub, gamma = 1 / infect, beta = R0 * gamma;
    let S = N - I0, E = 0, I = I0, t = 0, day = 0;
    const It = new Array(days + 1);
    while (day <= days) {
      const b = t < tInt ? beta : beta * (1 - red);
      const r1 = b * S * I / N, r2 = sigma * E, r3 = gamma * I, tot = r1 + r2 + r3;
      if (tot <= 0) { while (day <= days) It[day++] = I; break; }
      const tNext = t - Math.log(1 - rng()) / tot;
      if (t < tInt && tNext > tInt) { // 介入開始：指數分佈無記憶性，可在此重新抽樣
        while (day <= days && day <= tInt) It[day++] = I;
        t = tInt;
        continue;
      }
      while (day <= days && day < tNext) It[day++] = I;
      if (day > days) break;
      t = tNext;
      const u = rng() * tot;
      if (u < r1) { S--; E++; } else if (u < r1 + r2) { E--; I++; } else { I--; }
    }
    return { I: It, finalSize: N - S };
  }

  // ---------- 即時再生數（Cori 等 2013） ----------
  function discretizeGamma(m, sd, T) {
    const [shape, scale] = gammaFromMoments(m, sd);
    const w = new Array(T + 1).fill(0);
    for (let s = 1; s <= T; s++) w[s] = pgamma(s, shape, scale) - pgamma(s - 1, shape, scale);
    const tot = w.reduce((a, b) => a + b, 0);
    return w.map(v => v / tot);
  }
  function coriRt(local, imported, w, tau = 7, priorShape = 1, priorScale = 5, conf = 0.95) {
    const T = local.length, inc = local.map((v, i) => v + imported[i]), al = 1 - conf;
    const lambda = new Array(T).fill(0);
    for (let t = 0; t < T; t++) {
      let s = 0;
      for (let j = 1; j <= t && j < w.length; j++) s += w[j] * inc[t - j];
      lambda[t] = s;
    }
    const res = [];
    for (let t = tau; t < T; t++) {
      let sumL = 0, sumLam = 0;
      for (let s = t - tau + 1; s <= t; s++) { sumL += local[s]; sumLam += lambda[s]; }
      if (sumLam <= 0) continue;
      const shape = priorShape + sumL, scale = 1 / (1 / priorScale + sumLam);
      res.push({
        t, cases: sumL, mean: shape * scale,
        lo: qgamma(al / 2, shape, scale), hi: qgamma(1 - al / 2, shape, scale)
      });
    }
    return res;
  }

  // ---------- 檢疫與檢測策略 ----------
  // 時間以入境（第 0 天）為基準；感染發生在入境前 W 天內（均勻分佈）
  function quarantineSim(o) {
    let base = 0, resid = 0, detected = 0, releasedInf = 0, used = 0, tries = 0;
    while (used < o.n && tries < o.n * 50) {
      tries++;
      const tInf = -runif() * o.W;
      const onset = tInf + rlnorm(o.ml, o.sl);
      const asym = runif() < o.asym;
      if (o.excludePre && !asym && onset < 0) continue; // 出發前已發病者不會搭機
      used++;
      const a = onset - o.pre, b = onset + o.post;
      base += Math.max(0, b - Math.max(a, 0));
      let caught = o.symptomDetect && !asym && onset >= 0 && onset < o.Q;
      if (!caught) {
        for (const d of o.tests) {
          if (d <= o.Q && d >= onset - o.detPre && d <= onset + o.detPost && runif() < o.sens) { caught = true; break; }
        }
      }
      if (caught) { detected++; continue; }
      const r = Math.max(0, b - Math.max(a, o.Q));
      resid += r;
      if (r > 0) releasedInf++;
    }
    if (used === 0) throw new Error('沒有可用的模擬樣本，請檢查感染時間窗與潛伏期參數');
    return {
      n: used,
      residualFraction: base > 0 ? resid / base : 0,
      detectedFraction: detected / used,
      releasedInfectiousFraction: releasedInf / used
    };
  }

  return {
    setSeed, runif, rnorm, rlnorm, rgamma, rbeta,
    lgamma, gammp, pgamma, qgamma, qnorm,
    mean, quantile, betaFromMoments, gammaFromMoments, sampleParam,
    twoByTwo, poissonRateCI, sampleSizeProportion, sampleSizeTwoProportions, riskFromRate,
    extinctionProb, imaiEstimate, wellsRiley, rudnickMilton,
    seirODE, seirGillespie, discretizeGamma, coriRt, quarantineSim
  };
})();
