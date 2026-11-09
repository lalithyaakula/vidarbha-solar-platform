# Vidarbha Solar — Nagpur Rooftop Solar Platform

Complete front-end application and modular source code package for **Vidarbha Solar (Company A Solar Pvt. Ltd., Nagpur)**.

## Project Structure

```text
vidarbha_solar_platform_complete/
├── index.html                                         # Modular entry point
├── vidarbha_solar_nagpur_rooftop_solar_platform.html  # Single-file standalone bundle
├── css/
│   └── styles.css                                     # Complete application stylesheet & print rules
├── js/
│   └── app.js                                         # Application state, sizing math, routing & UI views
├── data/
│   ├── app_data.js                                    # Multilingual i18n (EN/MR/HI), seeded leads, quotes & prices
│   └── app_data.json                                  # Raw JSON dataset for API/backend integration
├── sample_bills/                                      # Decoded MSEDCL sample electricity bill SVGs
│   ├── bill_LD_30881_prashant.svg
│   ├── bill_LD_30902_rohit.svg
│   ├── bill_LD_30915_ayesha.svg
│   ├── bill_LD_30850_haldiram_annex.svg
│   ├── bill_LD_30864_deshmukh.svg
│   ├── bill_LD_30872_kulkarni.svg
│   ├── bill_LD_30890_patil.svg
│   └── bill_poor_blur_sample.svg
├── server.py                                          # Zero-dependency Python HTTP server
└── README.md                                          # Documentation & quick-start guide
```

## Quick Start

### Option 1: Open Directly in Browser (Zero Setup)
Double-click `index.html` (or `vidarbha_solar_nagpur_rooftop_solar_platform.html`) in any modern browser.

### Option 2: Run with Local Python Server
```bash
python3 server.py
```
Then visit `http://localhost:8000` in your browser.

## Demo Credentials & Profiles

### Staff Sign-In (Password for all roles: `solar123`)
- **Sales & Survey Executive**: `sales@companya.in`
- **Founder & Managing Director**: `founder@companya.in`
- **Project Coordinator**: `coord@companya.in`
- **System Administrator**: `admin@companya.in`

### Pre-Seeded Homeowner & Commercial Profiles (Mobile Lookup)
- **Prashant Wankhede** (`9823011881`) — 3 kW Residential, High Score, Quote Issued (`QT-5001`)
- **Rohit Meshram** (`9422109021`) — Tenant Advisory Flow (`LD-30902`)
- **Ayesha Siddiqui** (`9765430915`) — 1 kW Small Bill Flow (`LD-30915`)
- **Vidarbha Agro & Sweets Mart** (`9823130850`) — 10 kW Commercial Active 8-Stage Project (`PRJ-8001`)
