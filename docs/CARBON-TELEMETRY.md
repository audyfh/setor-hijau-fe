# Digital Carbon Footprint Telemetry (`@tgwf/co2` · SWDM v4)

This document specifies how `setor-hijau-fe` measures its own web transfer footprint, displays real-time session estimates to users, and reports raw transfer telemetry to the backend Net Impact Meter.

---

## 1. Alignment with Backend Methodology (ADR 0010 & `CARBON-METHOD.md` Section 8)

Setor Hijau uses the **Sustainable Web Design Model (SWDM) Version 4** standardized by The Green Web Foundation's CO2.js (`@tgwf/co2`, installed `^0.19.0`):

- **Client `@tgwf/co2` v0.19.0 SWDM v4**:
  - Uses `@tgwf/co2`'s built-in `SWDV4` constants (`0.300 kWh / GB` total across operational + embodied data center, network, and user device segments × `494 g CO2e / kWh` = `148.2 g CO2e / GB`).
  - Supports `greenHosting` toggle (`dataCenterOperationalCO2e` zeroed when hosted on green infrastructure).
- **Backend Deterministic Ledger Formula (`CARBON-METHOD.md` Section 8.1–8.2)**:
  - Uses `0.072 kWh / GB × 494 g CO2e / kWh = 35.568 g CO2e / GB` (`35,568,000 µg CO2e / GB`) with segment split: Data center 15%, Network 14%, User device 52%, Embodied hardware 19%.

### Exact Deterministic Integer Formula (Cross-verified with Backend)
In `lib/carbon/swdm.ts` (`calculateDeterministicSWDMv4`), for $B \ge 0$ integer bytes transferred:

$$\text{estimatedCo2eMicrograms} = \left\lfloor \frac{B \times 35{,}568 + 500{,}000}{1{,}000{,}000} \right\rfloor$$

$$\text{estimatedCo2eGrams} = \left\lfloor \frac{\text{estimatedCo2eMicrograms} + 500{,}000}{1{,}000{,}000} \right\rfloor$$

Calculations use `BigInt` internally so large session byte counts never lose integer precision before conversion.
Meanwhile, `estimateWithCO2js()` invokes `@tgwf/co2` (`new co2({ model: "swd", version: 4 }).perByte(...)`) and exposes **both** `estimatedCo2eGramsFloat` (CO2.js v0.19.0) and the backend-aligned deterministic `estimatedCo2eMicrograms` / `estimatedCo2eGrams`.

---

## 2. Dual Role of `@tgwf/co2` in the Frontend

1. **Real-Time Client Estimation (`estimateWithCO2js`)**:
   - Instantiates `new co2({ model: "swd", version: 4 })` from `@tgwf/co2`.
   - Calls `swdmV4.perByte(bytesTransferred, greenHosting)` to compute the official CO2.js SWDM v4 estimate (`estimatedCo2eGramsFloat`).
   - Combines it with `calculateDeterministicSWDMv4(bytesTransferred)` (`estimatedCo2eMicrograms`, `estimatedCo2eGrams`).
   - Powers `<SessionCarbonBadge />` (`"Estimasi Jejak Digital Sesi Ini (SWDM v4 · CO2.js)"`) so users see the live footprint of their browsing session.

2. **Backend Telemetry Reporting (`POST /api/v1/public/impact/telemetry`)**:
   - The frontend collects transferred bytes per route and submits `RecordTelemetryPayload`:
     ```json
     {
       "page_path": "/",
       "data_bytes_transferred": 145000,
       "visitor_type": "new",
       "session_id": "uuid",
       "bank_sampah_code": "BSM-RW05",
       "client_timestamp": "2026-11-18T14:30:00.000Z"
     }
     ```
   - The Go backend (`internal/impact/service.go`) recomputes `co2e_micrograms` and `co2e_grams` server-side from `data_bytes_transferred` so stored database rows remain tamper-resistant and 100% reproducible.

---

## 3. Browser Measurement & Loop Prevention

### Byte Collection (`PerformanceObserver`)
- `<CarbonTelemetryProvider>` subscribes to `PerformanceObserver` for `"navigation"` and `"resource"` entry types (`buffered: true`).
- Each observed entry is tracked in a `WeakSet<PerformanceEntry>` so buffered entries are never double-counted.
- `extractTransferredBytes()` reads `entry.transferSize` when `> 0`, falling back to `entry.encodedBodySize` for cross-origin resources that omit `Timing-Allow-Origin` headers.

### Telemetry Loop Prevention (`shouldTrackResourceUrl`)
Requests to `/api/v1/public/impact/telemetry` as well as `data:` and `blob:` URIs are **explicitly ignored** by `shouldTrackResourceUrl()` so sending a telemetry beacon never triggers another telemetry measurement.

### Flush Lifecycle
- Accumulated unreported bytes for the active `page_path` are flushed:
  1. When navigating to a new route (`pathname` change).
  2. When the browser tab becomes hidden (`document.visibilityState === "hidden"`).
- Dispatch uses `navigator.sendBeacon` (with `application/json` `Blob`) and falls back to `fetch(..., { method: "POST", keepalive: true })`.
- Network failures during telemetry dispatch fail silently without interrupting offline or low-connectivity waste bank workflows.
