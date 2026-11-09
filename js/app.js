const APP_DATA = window.APP_DATA;
    const I18N = APP_DATA.i18n;
    const SAMPLE_SVGS = APP_DATA.svgs;

    const state = window.state = {
      currentView: 'public_lead_form',
      homeownerTab: 'form', // 'form' or 'track'
      selectedLeadId: 1,
      selectedQuoteId: 1,
      currentUser: null,
      lang: 'en',
      modal: null,

      liveSizing: {
        name: '',
        mobile: '',
        ownership: 'owner',
        roof_type: 'flat_slab',
        roof_type_custom: '',
        free_roof_area: '',
        monthly_bill: '',
        pincode: '',
        selected_kw: 3,
        uploadedFile: null,
        aiChecked: false,
        aiReadable: true,
        aiScanning: false,
        aiDetails: {
          consumer_no: '410018294801',
          tariff: 'LT-I Residential',
          sanctioned_load: 3.0,
          monthly_units: 340
        }
      },

      qbState: {
        kw: 3,
        segment: 'home',
        discount: 0
      },

      priceTable: APP_DATA.prices,
      leads: APP_DATA.leads,
      quotes: APP_DATA.quotes,
      projects: APP_DATA.projects,
      users: APP_DATA.users,

      messageLog: [
        { id: 1, customer: 'Prashant Wankhede', type: 'WhatsApp', text: 'Hi Prashant, your 3 kW quote is ready. View at: https://vidarbhasolar.in/status/tok_prashant', time: '10:05 AM' },
        { id: 2, customer: 'Sunita Kulkarni', type: 'SMS', text: 'Vidarbha Solar: Your DISCOM Net Meter application has been filed (Ref PRJ-8002).', time: '11:30 AM' }
      ]
    };

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function preserveLeadFormInputs() {
      const pfName = document.getElementById('pf-name');
      if (pfName) state.liveSizing.name = pfName.value;
      const pfMob = document.getElementById('pf-mobile');
      if (pfMob) state.liveSizing.mobile = pfMob.value;
      const pfArea = document.getElementById('pf-area');
      if (pfArea) state.liveSizing.free_roof_area = pfArea.value;
      const pfBill = document.getElementById('pf-bill');
      if (pfBill) state.liveSizing.monthly_bill = pfBill.value;
      const pfPin = document.getElementById('pf-pin');
      if (pfPin) state.liveSizing.pincode = pfPin.value;
      const pfRoofCust = document.getElementById('pf-roof-manual');
      if (pfRoofCust) state.liveSizing.roof_type_custom = pfRoofCust.value;
      const checkedOwn = document.querySelector('input[name="ownership"]:checked');
      if (checkedOwn) state.liveSizing.ownership = checkedOwn.value;
      const trackMob = document.getElementById('track-mobile');
      if (trackMob) state.trackMobile = trackMob.value;
    }

    function t(key, params) {
      const dict = (I18N.TRANSLATIONS[state.lang] || I18N.TRANSLATIONS.en);
      let s = dict[key] || (I18N.TRANSLATIONS.en[key] || key);
      if (params) {
        Object.keys(params).forEach(function (k) {
          s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
        });
      }
      return s;
    }

    function formatInr(n) {
      const num = Math.round(Number(n) || 0);
      const sign = num < 0 ? '-' : '';
      let s = Math.abs(num).toString();
      let lastThree = s.substring(s.length - 3);
      let otherNumbers = s.substring(0, s.length - 3);
      if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
      }
      let res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
      return sign + '₹' + res;
    }

    function formatLakh(amount) {
      const val = Number(amount) || 0;
      if (Math.abs(val) >= 100000) {
        return '₹' + (val / 100000).toFixed(1) + ' Lakh';
      }
      return formatInr(val);
    }

    function calcSystemMath(kw, segment, monthlyBill, monthlyUnits, discount) {
      kw = Math.max(1, Math.min(10, Math.round(Number(kw) || 1)));
      segment = segment || 'home';
      discount = Number(discount) || 0;
      const price = state.priceTable[kw] || (kw * 62000);

      // Central Residential PM Surya Ghar Subsidy
      let subsidy = 0;
      if (segment === 'home') {
        const t1 = Math.min(kw, 2) * 30000;
        const t2 = Math.min(Math.max(kw - 2, 0), 1) * 18000;
        subsidy = Math.min(t1 + t2, 78000, price);
      }

      const netCost = Math.max(price - discount - subsidy, 0);
      const generation = kw * 1400; // 1,400 kWh/kW/year in Vidarbha
      const yearlyUnits = (monthlyUnits && monthlyUnits > 0) ? (monthlyUnits * 12) : (monthlyBill ? Math.round(monthlyBill / 8.5) * 12 : 4080);
      const tariff = segment === 'business' ? 10.5 : 8.5;
      const usableUnits = Math.min(generation, yearlyUnits);
      const annualSaving = Math.round(usableUnits * tariff);
      const paybackYears = annualSaving > 0 ? (Math.round((netCost / annualSaving) * 10) / 10).toFixed(1) : '—';
      const roi25 = annualSaving * 25 - netCost;
      const advance10 = Math.round(netCost * 0.10);

      return {
        kw: kw,
        segment: segment,
        price: price,
        discount: discount,
        subsidy: subsidy,
        netCost: netCost,
        generation: generation,
        yearlyUnits: yearlyUnits,
        usableUnits: usableUnits,
        tariff: tariff,
        annualSaving: annualSaving,
        paybackYears: paybackYears,
        roi25: roi25,
        advance10: advance10
      };
    }

    function getBrandLogoHtml() {
      return `
        <div class="brand-badge">
          <div class="brand-emblem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <circle cx="12" cy="7" r="3.5" fill="#F59E0B" stroke="#F59E0B"/>
              <path d="M12 1v2M12 11v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M1 7h2M21 7h2" stroke="#F59E0B"/>
              <path d="M3 21l9-7 9 7" stroke="#FFFFFF" stroke-linecap="round"/>
              <path d="M6 18.5V22M18 18.5V22" stroke="#FFFFFF"/>
            </svg>
          </div>
          <div class="brand-text-col">
            <span class="brand-title">${t('brand_name')}</span>
            <span class="brand-sub">${t('brand_region')}</span>
          </div>
        </div>
      `;
    }

    function renderPublicShell(innerHtml) {
      const langBtns = Object.keys(I18N.SUPPORTED_LANGS).map(function (code) {
        const active = state.lang === code ? 'active' : '';
        return '<button type="button" data-set-lang="' + code + '" class="lang-pill-btn ' + active + '">' + I18N.SUPPORTED_LANGS[code] + '</button>';
      }).join('');

      return `
        <header class="app-header no-print">
          <div class="header-container">
            <a href="#home" data-nav="public_lead_form" style="text-decoration:none;">
              ${getBrandLogoHtml()}
            </a>
            <div class="header-controls">
              <div class="lang-pill-group">${langBtns}</div>
              ${state.currentUser ? `
                <button type="button" class="staff-btn" data-action="back-to-staff" style="background:var(--primary-light); border-color:var(--primary); color:var(--primary); font-weight:700;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Back to ${state.currentUser.role.toUpperCase()} Workspace
                </button>
              ` : `
                <a href="#login" data-nav="login" class="staff-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  ${t('staff_signin')}
                </a>
              `}
            </div>
          </div>
        </header>
        <main class="page-container">
          ${innerHtml}
        </main>
        <footer class="no-print" style="background:#FFFFFF; border-top:1px solid var(--border); padding:24px 20px; margin-top:40px; font-size:13px; color:var(--text-muted); text-align:center;">
          <div style="max-width:1160px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>&copy; 2026 Vidarbha Solar • PM Surya Ghar Rooftop Solar • Nagpur &amp; Vidarbha</div>
            <div style="display:flex; gap:16px;">
              <a href="#privacy" data-nav="public_privacy" style="color:var(--primary); font-weight:600; text-decoration:none;">DPDP Privacy Notice</a>
              <a href="#rules" data-nav="admin_rules" style="color:var(--text-secondary); text-decoration:none;">Tariffs &amp; Price Schedules</a>
            </div>
          </div>
        </footer>
      `;
    }

    function renderStaffShell(innerHtml, activePage) {
      const user = state.currentUser || { full_name: 'Founder-MD (Executive)', role: 'founder', email: 'founder@companya.in' };
      const navItems = [
        { id: 'founder_dashboard', label: 'Executive Dashboard', roles: ['founder'] },
        { id: 'founder_approvals', label: 'Discount Approvals', roles: ['founder'] },
        { id: 'sales_leads', label: 'Leads &amp; Quotes', roles: ['founder', 'sales'] },
        { id: 'sales_calls', label: 'Call Queue', roles: ['founder', 'sales'] },
        { id: 'coordinator_projects', label: 'Project Tracker', roles: ['founder', 'coordinator'] },
        { id: 'admin_rules', label: 'Rules &amp; Prices', roles: ['founder', 'admin'] }
      ];

      const visibleNav = navItems.filter(item => item.roles.includes(user.role) || user.role === 'founder');

      return `
        <div style="display:flex; min-height:100vh;">
          <!-- Staff Sidebar -->
          <aside class="no-print" style="width:250px; background:#0B3B32; color:#FFFFFF; flex-shrink:0; display:flex; flex-direction:column; padding:20px 16px;">
            <div style="margin-bottom:28px;">
              <a href="#home" data-nav="public_lead_form" style="text-decoration:none; color:#FFFFFF;">
                <div style="font-size:18px; font-weight:800; letter-spacing:-0.02em;">Vidarbha Solar</div>
                <div style="font-size:11px; color:#A7F3D0; font-weight:600;">Staff Operations Portal</div>
              </a>
            </div>

            <div style="padding:10px 12px; background:rgba(255,255,255,0.08); border-radius:8px; margin-bottom:20px;">
              <div style="font-size:13px; font-weight:700;">${user.full_name}</div>
              <div style="font-size:11px; color:#A7F3D0; text-transform:uppercase; font-weight:800; margin-top:2px;">Role: ${user.role}</div>
            </div>

            <nav style="display:flex; flex-direction:column; gap:4px; flex:1;">
              ${visibleNav.map(n => `
                <a href="#${n.id}" data-nav="${n.id}" style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; font-size:13.5px; font-weight:600; text-decoration:none; color:${activePage === n.id ? '#FFFFFF' : '#A7F3D0'}; background:${activePage === n.id ? 'rgba(255,255,255,0.15)' : 'transparent'};">
                  ${n.label}
                </a>
              `).join('')}
            </nav>

            <div style="padding-top:16px; border-top:1px solid rgba(255,255,255,0.15);">
              <a href="#logout" data-action="staff-logout" style="display:flex; align-items:center; gap:8px; font-size:13px; color:#FCA5A5; text-decoration:none; font-weight:600; padding:8px 12px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </a>
            </div>
          </aside>

          <!-- Main Content -->
          <div style="flex:1; background:var(--bg-page); display:flex; flex-direction:column; overflow-x:hidden;">
            <header class="no-print" style="background:#FFFFFF; border-bottom:1px solid var(--border); padding:12px 28px; display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:14px; font-weight:700; color:var(--text-muted);">
                Vidarbha Solar CRM &bull; Nagpur Operations
              </div>
              <div style="display:flex; align-items:center; gap:12px;">
                <a href="#home" data-nav="public_lead_form" class="btn-outline" style="font-size:12px; padding:6px 12px;">
                  &larr; Homeowner Portal
                </a>
              </div>
            </header>
            <main style="padding:28px; flex:1; max-width:1200px; width:100%;">
              ${innerHtml}
            </main>
          </div>
        </div>
      `;
    }

    function viewPublicLeadForm() {
      const s = state.liveSizing;
      const kw = s.selected_kw || 3;
      const isOwner = s.ownership === 'owner';
      const math = calcSystemMath(kw, isOwner ? 'home' : 'home', s.monthly_bill, null, 0);

      // Dual Navigation Header
      const tabsHtml = `
        <div class="dual-nav-tabs">
          <button type="button" class="dual-tab-btn ${state.homeownerTab === 'form' ? 'active' : ''}" data-action="switch-home-tab" data-tab="form">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ${t('tab_calc')}
          </button>
          <button type="button" class="dual-tab-btn ${state.homeownerTab === 'track' ? 'active' : ''}" data-action="switch-home-tab" data-tab="track">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${t('tab_track')}
          </button>
        </div>
      `;

      if (state.homeownerTab === 'track') {
        // Track Existing Application View
        return renderPublicShell(tabsHtml + `
          <div class="exec-card" style="max-width:680px; margin:0 auto;">
            <div class="hero-badge-pill">
              <span class="pulse-beacon"></span>
              Live Application Tracking
            </div>
            <h1 style="font-size:24px; font-weight:800; margin:0 0 8px;">${t('track_title')}</h1>
            <p style="font-size:14px; color:var(--text-secondary); margin:0 0 22px;">
              ${t('track_desc')}
            </p>

            <form id="track-login-form" style="margin-bottom:24px;">
              <div class="field-group">
                <label for="track-mobile" class="field-label">${t('label_registered_mobile')}</label>
                <div style="display:flex; gap:10px;">
                  <input type="tel" id="track-mobile" placeholder="9823011881" value="${escapeHtml(state.trackMobile || '9823011881')}" maxlength="10" inputmode="numeric" required class="input-text" style="font-size:16px; font-weight:700;">
                  <button type="submit" class="btn-primary" style="width:auto; white-space:nowrap; padding:12px 22px;">${t('btn_open_dashboard')}</button>
                </div>
              </div>
            </form>

            <div style="padding-top:20px; border-top:1px solid var(--border);">
              <div style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:12px;">
                ${t('or_preview_profiles')}
              </div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <button type="button" class="btn-outline" data-action="open-customer" data-lead-id="1" style="justify-content:space-between; padding:12px 16px; text-align:left;">
                  <span><strong>Prashant Wankhede</strong> (Manish Nagar &bull; High Score &bull; 3 kW)</span>
                  <span style="font-size:12px; font-weight:700; color:var(--primary); background:var(--primary-light); padding:3px 10px; border-radius:999px;">Quote Issued &bull; Net ₹1,08,000 &rarr;</span>
                </button>
                <button type="button" class="btn-outline" data-action="open-customer" data-lead-id="2" style="justify-content:space-between; padding:12px 16px; text-align:left;">
                  <span><strong>Rohit Meshram</strong> (Dharampeth &bull; Tenant &bull; Advisory Call)</span>
                  <span style="font-size:12px; font-weight:700; color:var(--warning); background:var(--warning-light); padding:3px 10px; border-radius:999px;">Consult Scheduled &rarr;</span>
                </button>
                <button type="button" class="btn-outline" data-action="open-customer" data-lead-id="4" style="justify-content:space-between; padding:12px 16px; text-align:left;">
                  <span><strong>Vidarbha Agro Sweets</strong> (MIDC Hingna &bull; Commercial 10 kW)</span>
                  <span style="font-size:12px; font-weight:700; color:var(--success); background:var(--success-light); padding:3px 10px; border-radius:999px;">8-Stage Project Active &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        `);
      }

      // Primary Sizing & Lead Form View
      const subsidyPct = Math.round((math.subsidy / math.price) * 100);
      const netPct = 100 - subsidyPct;

      return renderPublicShell(tabsHtml + `
        <!-- Hero Title -->
        <div style="text-align:center; max-width:820px; margin:0 auto 28px;">
          <div class="hero-badge-pill">
            <span class="pulse-beacon"></span>
            ${t('hero_badge')}
          </div>
          <h1 style="font-size:32px; font-weight:800; letter-spacing:-0.03em; margin:0 0 12px; color:var(--text-main); line-height:1.2;">
            ${t('hero_title')}
          </h1>
          <p style="font-size:15.5px; color:var(--text-secondary); margin:0;">
            ${t('hero_sub')}
          </p>
        </div>

        <!-- Interactive Live Sizing & ROI Command Center -->
        <div class="sizer-box">
          <div class="sizer-header">
            <div class="sizer-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--accent-sun);"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2"/></svg>
              ${t('sizer_title')}
            </div>
            <span style="font-size:12px; font-weight:700; color:var(--success); background:#D1FAE5; padding:3px 10px; border-radius:999px;">
              ${t('central_subsidy_eligible')}
            </span>
          </div>

          <!-- Capacity Selector Chips -->
          <div class="capacity-chip-bar">
            ${[1, 2, 3, 4, 5, 6, 8, 10].map(k => `
              <button type="button" class="cap-chip ${kw === k ? 'active' : ''}" data-action="set-kw" data-kw="${k}">
                ${k} kW
                ${k === 3 ? `<span class="chip-tag">${t('tag_popular')}</span>` : ''}
              </button>
            `).join('')}
          </div>

          <!-- Synchronized Range Slider -->
          <div class="slider-wrapper">
            <input type="range" min="1" max="10" step="1" value="${kw}" id="live-kw-slider" class="slider-input">
            <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:var(--text-muted); margin-top:4px;">
              <span>1 kW (Compact)</span>
              <span>3 kW (Optimal Home)</span>
              <span>5 kW (Medium)</span>
              <span>10 kW (Commercial)</span>
            </div>
          </div>

          <!-- Proportional Financial Composition Bar -->
          <div class="ratio-bar-box">
            <div class="ratio-labels">
              <span><strong>${t('financial_ratio_title')}:</strong> Turnkey Price ${formatInr(math.price)}</span>
              <span><strong>Payback:</strong> ${math.paybackYears} Years</span>
            </div>
            <div class="ratio-track">
              <div class="ratio-seg-subsidy" style="width:${subsidyPct}%;" title="Central Subsidy: ${formatInr(math.subsidy)}"></div>
              <div class="ratio-seg-net" style="width:${netPct}%;" title="Net Cost: ${formatInr(math.netCost)}"></div>
            </div>
            <div class="ratio-labels">
              <span style="color:#059669;">&bull; ${t('ratio_subsidy')}: ${formatInr(math.subsidy)} (${subsidyPct}%)</span>
              <span style="color:var(--primary);">&bull; ${t('ratio_net')}: ${formatInr(math.netCost)} (${netPct}%)</span>
            </div>
          </div>

          <!-- 4 Metric Cards Grid -->
          <div class="hero-metric-grid">
            <div class="hero-metric-card">
              <span class="metric-label">${t('stat_capacity')}</span>
              <span class="metric-value" id="disp-kw">${kw} kW</span>
              <span class="metric-sub">~${kw * 100} sq.ft roof required</span>
            </div>
            <div class="hero-metric-card" style="border-left:3px solid #10B981;">
              <span class="metric-label">${t('stat_subsidy')}</span>
              <span class="metric-value" style="color:#059669;" id="disp-sub">${formatInr(math.subsidy)}</span>
              <span class="metric-sub">Direct DBT to bank account</span>
            </div>
            <div class="hero-metric-card highlight">
              <span class="metric-label">${t('stat_net_cost')}</span>
              <span class="metric-value emerald" id="disp-net">${formatInr(math.netCost)}</span>
              <span class="metric-sub">10% Advance: ${formatInr(math.advance10)}</span>
            </div>
            <div class="hero-metric-card">
              <span class="metric-label">${t('stat_saving')}</span>
              <span class="metric-value" id="disp-save">${formatInr(math.annualSaving)} / ${t('per_year')}</span>
              <span class="metric-sub">Payback in <strong>${math.paybackYears} yrs</strong></span>
            </div>
          </div>
        </div>

        <!-- The Lead Assessment Form -->
        <div class="exec-card" style="max-width:960px; margin:0 auto;">
          <h2 style="font-size:22px; font-weight:800; margin:0 0 6px;">${t('form_title')}</h2>
          <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 24px;">
            ${t('hero_subtitle')}
          </p>

          <form id="lead-assessment-form">
            <!-- 1. Customer Name and Mobile -->
            <div class="form-row">
              <div class="field-group">
                <label for="pf-name" class="field-label">${t('label_name')}</label>
                <input type="text" id="pf-name" class="input-text" placeholder="${t('placeholder_name')}" value="${escapeHtml(s.name || '')}" required>
              </div>
              <div class="field-group">
                <label for="pf-mobile" class="field-label">${t('label_mobile')}</label>
                <input type="tel" id="pf-mobile" class="input-text" placeholder="${t('placeholder_mobile')}" value="${escapeHtml(s.mobile || '')}" maxlength="10" inputmode="numeric" required>
              </div>
            </div>

            <!-- 2. Ownership Segmented Cards (Clean SVG, Zero Emojis) -->
            <div class="field-group">
              <label class="field-label" id="lbl-own-heading">${t('label_ownership')}</label>
              <div class="ownership-grid" role="radiogroup" aria-labelledby="lbl-own-heading">
                <!-- Option A: Home / Shop Owner -->
                <label class="ownership-card ${isOwner ? 'selected' : ''}" id="card-own-owner">
                  <input type="radio" name="ownership" value="owner" ${isOwner ? 'checked' : ''} style="position:absolute; opacity:0; pointer-events:none;">
                  <div class="own-header">
                    <div class="own-icon-title">
                      <div class="own-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                      <span class="own-title">${t('opt_owner')}</span>
                    </div>
                    <span class="radio-pill-check">
                      ${isOwner ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </span>
                  </div>
                  <span class="own-sub">${t('opt_owner_sub')}</span>
                  <span class="own-badge">${t('tag_dbt_eligible')}</span>
                </label>

                <!-- Option B: Tenant (Rented) -->
                <label class="ownership-card ${!isOwner ? 'selected' : ''}" id="card-own-tenant">
                  <input type="radio" name="ownership" value="tenant" ${!isOwner ? 'checked' : ''} style="position:absolute; opacity:0; pointer-events:none;">
                  <div class="own-header">
                    <div class="own-icon-title">
                      <div class="own-icon-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </div>
                      <span class="own-title">${t('opt_tenant')}</span>
                    </div>
                    <span class="radio-pill-check">
                      ${!isOwner ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </span>
                  </div>
                  <span class="own-sub">${t('opt_tenant_sub')}</span>
                  <span class="own-badge">${t('tag_phone_advisory')}</span>
                </label>
              </div>
            </div>

            <!-- 3. Roof Structure Selection & Manual Entry -->
            <div class="field-group">
              <label class="field-label">${t('label_roof_type')}</label>
              <div class="roof-cards-grid">
                ${[
                  { id: 'flat_slab', title: t('roof_rcc_title'), sub: t('roof_rcc_sub') },
                  { id: 'tin_sheet', title: t('roof_tin_title'), sub: t('roof_tin_sub') },
                  { id: 'tiled', title: t('roof_tiled_title'), sub: t('roof_tiled_sub') },
                  { id: 'custom', title: 'Other / Custom Roof', sub: 'Type specific details below' }
                ].map(r => `
                  <div class="roof-card ${s.roof_type === r.id ? 'selected' : ''}" data-action="set-roof" data-roof="${r.id}">
                    <div class="roof-card-title">${r.title}</div>
                    <div class="roof-card-sub">${r.sub}</div>
                  </div>
                `).join('')}
              </div>

              <!-- Manual Roof Entry Field (Optional / Custom Details) -->
              <div style="margin-top:10px;">
                <label for="pf-roof-manual" style="font-size:12.5px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:5px;">
                  Or enter specific roof / structure details manually:
                </label>
                <input type="text" id="pf-roof-manual" class="input-text" placeholder="e.g. RCC terrace with elevated pergola structure, corrugated GI sheet, clay tile..." value="${escapeHtml(s.roof_type_custom || '')}">
              </div>
              <input type="hidden" id="pf-roof" value="${s.roof_type}">
            </div>

            <!-- 4. Area, Monthly Bill, Pincode -->
            <div class="form-row">
              <div class="field-group">
                <label for="pf-area" class="field-label">
                  <span>${t('label_free_roof_area')}</span>
                  <span style="font-weight:600; color:var(--primary);" id="area-rec-badge">${s.free_roof_area ? '~' + Math.round(s.free_roof_area / 100) + ' kW capacity' : 'Enter roof area'}</span>
                </label>
                <input type="number" id="pf-area" class="input-text" placeholder="e.g. 450" value="${escapeHtml(s.free_roof_area || '')}" min="50" step="25" inputmode="numeric" required>
                <div class="quick-pill-row">
                  <span class="field-hint">${t('quick_area_step')}</span>
                  <button type="button" class="quick-pill" data-action="set-area" data-val="300">300 sq ft (3 kW)</button>
                  <button type="button" class="quick-pill" data-action="set-area" data-val="450">450 sq ft (4.5 kW)</button>
                  <button type="button" class="quick-pill" data-action="set-area" data-val="600">600 sq ft (6 kW)</button>
                  <button type="button" class="quick-pill" data-action="add-area" data-delta="50">+50 sq ft</button>
                </div>
              </div>

              <div class="field-group">
                <label for="pf-bill" class="field-label">${t('label_monthly_bill')}</label>
                <input type="number" id="pf-bill" class="input-text" placeholder="e.g. 3200" value="${escapeHtml(s.monthly_bill || '')}" min="100" step="100" inputmode="numeric" required>
                <div class="quick-pill-row">
                  <span class="field-hint">${t('quick_fill_bill')}</span>
                  <button type="button" class="quick-pill" data-action="set-bill" data-val="1500">₹1,500</button>
                  <button type="button" class="quick-pill" data-action="set-bill" data-val="3200">₹3,200</button>
                  <button type="button" class="quick-pill" data-action="set-bill" data-val="5500">₹5,500</button>
                  <button type="button" class="quick-pill" data-action="set-bill" data-val="8000">₹8,000</button>
                </div>
              </div>
            </div>

            <div class="field-group">
              <label for="pf-pin" class="field-label">
                <span>${t('label_pincode')}</span>
                <span style="font-size:11.5px; font-weight:700; color:var(--primary);" id="pin-zone-badge">Zone 1: Nagpur Core (Same-Day Survey)</span>
              </label>
              <input type="text" id="pf-pin" class="input-text" placeholder="e.g. 440010" value="${escapeHtml(s.pincode || '')}" maxlength="6" inputmode="numeric" required style="max-width:240px;">
            </div>

            <!-- 5. Enterprise AI Bill Scanner & Upload Zone -->
            <div class="field-group">
              <label class="field-label">${t('upload_zone_title')}</label>
              
              <div class="ai-drop-zone ${s.aiScanning ? 'scanning' : ''}" id="ai-file-dropzone">
                <div class="laser-beam"></div>
                <input type="file" id="pf-file-input" accept="image/*,application/pdf" style="position:absolute; inset:0; opacity:0; cursor:pointer;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                  <div style="width:48px; height:48px; border-radius:50%; background:var(--primary-light); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <strong style="font-size:15px; color:var(--text-main);">${t('upload_zone_sub')}</strong>
                  <button type="button" class="btn-outline" style="pointer-events:none; margin-top:4px;">${t('upload_zone_btn')}</button>
                </div>
              </div>

              <!-- Instant AI Extracted Data Card Preview -->
              <div class="ai-result-card" id="ai-scan-card">
                <div>
                  <div class="ai-field-label">${t('consumer_no_label')}</div>
                  <div class="ai-field-val" id="ai-disp-cno">${s.aiDetails.consumer_no}</div>
                </div>
                <div>
                  <div class="ai-field-label">${t('tariff_category_label')}</div>
                  <div class="ai-field-val" id="ai-disp-tariff">${s.aiDetails.tariff}</div>
                </div>
                <div>
                  <div class="ai-field-label">${t('sanctioned_load_label')}</div>
                  <div class="ai-field-val" id="ai-disp-load">${s.aiDetails.sanctioned_load} kW</div>
                </div>
                <div>
                  <div class="ai-field-label">${t('monthly_units_label')}</div>
                  <div class="ai-field-val" id="ai-disp-units">${s.aiDetails.monthly_units} kWh</div>
                </div>
              </div>

              <!-- 1-Click Verified Sample Bills -->
              <div style="margin-top:14px; padding:12px 14px; background:var(--bg-subtle); border-radius:var(--radius-md); border:1px solid var(--border);">
                <span style="font-size:12px; font-weight:800; text-transform:uppercase; color:var(--text-muted); display:block; margin-bottom:8px;">
                  ${t('test_bills_title')}
                </span>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button type="button" class="quick-pill" data-action="load-sample" data-sample="bill_LD_30881_prashant.svg">Prashant (340u &bull; 3 kW)</button>
                  <button type="button" class="quick-pill" data-action="load-sample" data-sample="bill_LD_30902_rohit.svg">Rohit (210u &bull; Tenant)</button>
                  <button type="button" class="quick-pill" data-action="load-sample" data-sample="bill_LD_30915_ayesha.svg">Ayesha (85u &bull; 1 kW)</button>
                  <button type="button" class="quick-pill" data-action="load-sample" data-sample="bill_LD_30850_haldiram_annex.svg">Vidarbha Agro (Commercial 10 kW)</button>
                  <button type="button" class="quick-pill" data-action="load-sample" data-sample="bill_poor_blur_sample.svg">Blurry Test (&lt; 12 KB)</button>
                </div>
              </div>
            </div>

            <!-- DPDP Consent Note -->
            <div style="font-size:12px; color:var(--text-muted); margin:20px 0 24px; display:flex; gap:8px; align-items:flex-start;">
              <input type="checkbox" id="pf-consent" checked required style="margin-top:2px;">
              <label for="pf-consent">${t('privacy_note')}</label>
            </div>

            <button type="submit" class="btn-primary" id="btn-submit-assessment">
              ${t('btn_submit_lead')}
            </button>
          </form>
        </div>
      `);
    }

    // ==========================================
    // 2. VIEW: BILL CONFIRM
    // ==========================================
    function viewPublicBillConfirm() {
      const lead = state.leads.find(l => l.id === state.selectedLeadId) || state.leads[0];
      const svgKey = lead.bill_svg_key || 'bill_LD_30881_prashant.svg';
      const svgData = SAMPLE_SVGS[svgKey] || '';

      return renderPublicShell(`
        <div class="exec-card" style="max-width:980px; margin:0 auto;">
          <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">Is this information accurate?</h1>
          <p style="font-size:14px; color:var(--text-muted); margin:0 0 20px;">
            Our Vision AI automatically extracted these 4 connection parameters from your MSEDCL electricity bill. Please verify before proceeding.
          </p>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
            <!-- Bill Image / SVG Preview -->
            <div style="border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; background:#F8FAFC; padding:12px; text-align:center;">
              <span style="font-size:11.5px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:8px;">Uploaded Document Scan</span>
              ${svgData ? `<img src="${svgData}" alt="Electricity Bill" style="max-width:100%; height:auto; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">` : '<div style="padding:60px 20px; color:var(--text-muted);">PDF Document Attached</div>'}
            </div>

            <!-- Extraction Fields -->
            <div>
              <div class="field-group">
                <label class="field-label">Consumer Number</label>
                <input type="text" class="input-text" value="${lead.consumer_no || '410018294801'}" style="font-family:monospace; font-weight:700;">
              </div>
              <div class="field-group">
                <label class="field-label">Tariff Category</label>
                <input type="text" class="input-text" value="${lead.tariff_category || 'LT-I Residential'}">
              </div>
              <div class="field-group">
                <label class="field-label">Sanctioned Load (kW)</label>
                <input type="number" class="input-text" value="${lead.sanctioned_load_kw || 3.0}" step="0.5">
              </div>
              <div class="field-group">
                <label class="field-label">Monthly Consumption (Units / kWh)</label>
                <input type="number" class="input-text" value="${lead.monthly_units || 340}">
              </div>

              <div style="display:flex; gap:12px; margin-top:24px;">
                <button type="button" class="btn-primary" data-nav="public_status" data-lead-id="${lead.id}" style="flex:1;">
                  Yes, this is correct &rarr;
                </button>
                <button type="button" class="btn-outline" data-nav="public_lead_form">
                  Upload different file
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    // ==========================================
    // 3. VIEW: CUSTOMER SOLAR DASHBOARD
    // ==========================================
    function viewPublicStatus() {
      const lead = state.leads.find(l => l.id === state.selectedLeadId) || state.leads[0];
      let quote = state.quotes.find(q => q.lead_id === lead.id);
      if (!quote) {
        // Dynamically build quote tailored to this specific lead
        const kw = lead.recommended_kw || (lead.ownership === 'tenant' ? 3 : Math.max(1, Math.min(10, Math.round((lead.monthly_units || 340) * 12 / 1400))));
        quote = {
          id: 100 + lead.id,
          quote_code: 'QT-' + (5000 + lead.id),
          lead_id: lead.id,
          segment: lead.segment || 'home',
          selected_kw: kw,
          discount: 0
        };
      }
      let project = state.projects.find(p => p.lead_id === lead.id);
      if (!project) {
        // Project timeline tailored to lead's current stage
        project = {
          id: 200 + lead.id,
          project_code: 'PRJ-' + (8000 + lead.id),
          lead_id: lead.id,
          current_stage: lead.ownership === 'tenant' ? 'documents_collected' : 'application_filed'
        };
      }
      const math = calcSystemMath(quote.selected_kw, quote.segment, lead.monthly_bill, lead.monthly_units, quote.discount);

      const balance90 = math.netCost - math.advance10;

      return renderPublicShell(`
        <div style="max-width:1040px; margin:0 auto;">
          ${state.currentUser ? `
            <div class="no-print" style="background:#0F5C4D; color:#FFFFFF; padding:12px 20px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; box-shadow:0 4px 12px rgba(15,92,77,0.2);">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:999px; font-size:12px; font-weight:800; text-transform:uppercase;">Logged in as ${state.currentUser.role}</span>
                <span style="font-size:13.5px; font-weight:600;">You are previewing this Homeowner / Tenant Dashboard as staff</span>
              </div>
              <button type="button" class="btn-outline" data-action="back-to-staff" style="background:#FFFFFF; color:#0F5C4D; border:none; font-weight:800; padding:6px 14px; font-size:13px;">
                &larr; Return to ${state.currentUser.role.toUpperCase()} Workspace
              </button>
            </div>
          ` : ''}
          <!-- Customer Banner Header -->
          <div class="exec-card" style="padding:22px 28px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <div class="hero-badge-pill" style="margin-bottom:6px;">
                <span class="pulse-beacon"></span>
                Application ID: ${lead.lead_code} &bull; Status: Active
              </div>
              <h1 style="font-size:24px; font-weight:800; margin:0 0 4px;">Welcome, ${lead.name || 'Homeowner'}</h1>
              <div style="font-size:13px; color:var(--text-muted);">
                Consumer ID: <strong>${lead.consumer_no ? lead.consumer_no.slice(0, 4) + '••••' + lead.consumer_no.slice(-4) : '••••••••4801'}</strong> &bull; ${lead.tariff_category || 'LT-I Residential'} &bull; Pincode ${lead.pincode || '440010'}
              </div>
            </div>

            <div style="display:flex; gap:12px; align-items:center;">
              ${state.currentUser ? `
                <button type="button" class="btn-outline" data-action="back-to-staff" style="background:#0F5C4D; color:#FFFFFF; border-color:#0F5C4D; font-weight:700;">
                  &larr; Back to ${state.currentUser.role.toUpperCase()} Workspace
                </button>
              ` : ''}
              <button type="button" class="btn-primary" data-nav="public_quote" style="width:auto; padding:10px 20px;">
                Open Full Quote Engine &rarr;
              </button>
            </div>
          </div>

          <!-- Hero Metrics Overview -->
          <div class="hero-metric-grid" style="margin-bottom:24px;">
            <div class="hero-metric-card">
              <span class="metric-label">${t('stat_capacity')}</span>
              <span class="metric-value">${quote.selected_kw} kW</span>
              <span class="metric-sub">${quote.selected_kw * 1400} kWh/yr estimated generation</span>
            </div>
            <div class="hero-metric-card" style="border-left:3px solid #10B981;">
              <span class="metric-label">${t('stat_subsidy')}</span>
              <span class="metric-value" style="color:#059669;">${formatInr(math.subsidy)}</span>
              <span class="metric-sub">PM Surya Ghar Direct DBT</span>
            </div>
            <div class="hero-metric-card highlight">
              <span class="metric-label">${t('stat_net_cost')}</span>
              <span class="metric-value emerald">${formatInr(math.netCost)}</span>
              <span class="metric-sub">10% Advance: ${formatInr(math.advance10)}</span>
            </div>
            <div class="hero-metric-card">
              <span class="metric-label">${t('stat_saving')}</span>
              <span class="metric-value">${formatInr(math.annualSaving)} / ${t('per_year')}</span>
              <span class="metric-sub">Payback in <strong>${math.paybackYears} yrs</strong></span>
            </div>
          </div>

          <!-- Clear Transparent Pricing & Payment Schedule Card -->
          <div class="exec-card" style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
              <div>
                <h2 style="font-size:18px; font-weight:800; margin:0 0 4px;">System Pricing &amp; Payment Breakdown</h2>
                <div style="font-size:13px; color:var(--text-muted);">Exact turnkey costs, government DBT subsidy, and structured payment milestones</div>
              </div>
              <span style="font-size:12px; font-weight:700; color:var(--primary); background:var(--primary-light); padding:4px 12px; border-radius:999px;">
                Price Guaranteed for 30 Days
              </span>
            </div>

            <table class="math-table" style="margin-top:0;">
              <thead>
                <tr>
                  <th>Item / Milestone</th>
                  <th>Formula / Details</th>
                  <th>Status</th>
                  <th class="num">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Turnkey System Price</strong></td>
                  <td>Complete ${quote.selected_kw} kW package (Bi-facial Tier-1 panels, DCR inverter, structure &amp; cabling)</td>
                  <td><span style="color:#047857; font-weight:700;">Locked</span></td>
                  <td class="num">${formatInr(math.price)}</td>
                </tr>
                <tr>
                  <td><strong>Central DBT Subsidy</strong></td>
                  <td>PM Surya Ghar Muft Bijli Yojana (2 kW &times; ₹30k + 1 kW &times; ₹18k)</td>
                  <td><span style="color:#059669; font-weight:700;">Direct DBT to Bank</span></td>
                  <td class="num" style="color:#059669; font-weight:700;">&minus; ${formatInr(math.subsidy)}</td>
                </tr>
                <tr>
                  <td><strong>Special Promotional Discount</strong></td>
                  <td>Vidarbha Green Energy festival concession</td>
                  <td><span style="color:#B45309; font-weight:700;">Applied</span></td>
                  <td class="num" style="color:#B45309;">&minus; ${formatInr(math.discount)}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Total Net Investment (You Pay)</strong></td>
                  <td>Turnkey Price &minus; Central Subsidy &minus; Discount</td>
                  <td><span style="color:var(--primary); font-weight:800;">Payable</span></td>
                  <td class="num" style="font-size:18px; color:var(--primary); font-weight:800;">${formatInr(math.netCost)}</td>
                </tr>
                <tr>
                  <td>&bull; Milestone 1: Booking Advance (10%)</td>
                  <td>Slot reservation &amp; MSEDCL net-meter application fee</td>
                  <td><span style="background:#D1FAE5; color:#065F46; padding:2px 8px; border-radius:4px; font-size:11.5px; font-weight:700;">Paid &bull; Slot Confirmed</span></td>
                  <td class="num"><strong>${formatInr(math.advance10)}</strong></td>
                </tr>
                <tr>
                  <td>&bull; Milestone 2: Balance on Delivery &amp; Install (90%)</td>
                  <td>Due upon panel mounting &amp; inverter installation at site</td>
                  <td><span style="background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:4px; font-size:11.5px; font-weight:700;">Due on Installation</span></td>
                  <td class="num"><strong>${formatInr(balance90)}</strong></td>
                </tr>
              </tbody>
            </table>

            <div style="background:var(--bg-subtle); padding:14px 18px; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; font-size:13px;">
              <div>
                <strong>Estimated Annual Savings:</strong> ${formatInr(math.annualSaving)} / year &bull; <strong>Payback:</strong> ${math.paybackYears} years &bull; <strong>25-Year Net ROI:</strong> ${formatInr(math.roi25)}
              </div>
              <button type="button" class="btn-primary" data-nav="public_quote" style="width:auto; padding:8px 18px; font-size:13px;">
                Customize Sizing in Quote Engine &rarr;
              </button>
            </div>
          </div>

          <!-- 4 Assessment Milestones -->
          <div class="exec-card" style="margin-bottom:20px;">
            <h3 style="font-size:16px; font-weight:800; margin:0 0 14px;">${t('assessment_milestones')}</h3>
            <div class="milestones-bar">
              <div class="milestone-step done">
                <div class="ms-top">
                  <span class="ms-dot">&check;</span>
                  <span style="font-size:11px; font-weight:700; color:var(--success);">Completed</span>
                </div>
                <div class="ms-title">${t('step_1_title')}</div>
                <div class="ms-sub">${t('step_1_sub')}</div>
              </div>
              <div class="milestone-step done">
                <div class="ms-top">
                  <span class="ms-dot">&check;</span>
                  <span style="font-size:11px; font-weight:700; color:var(--success);">Verified</span>
                </div>
                <div class="ms-title">${t('step_2_title')}</div>
                <div class="ms-sub">${t('step_2_sub')}</div>
              </div>
              <div class="milestone-step done">
                <div class="ms-top">
                  <span class="ms-dot">&check;</span>
                  <span style="font-size:11px; font-weight:700; color:var(--success);">Approved</span>
                </div>
                <div class="ms-title">${t('step_3_title')}</div>
                <div class="ms-sub">${t('step_3_sub')}</div>
              </div>
              <div class="milestone-step current">
                <div class="ms-top">
                  <span class="ms-dot">4</span>
                  <span style="font-size:11px; font-weight:700; color:var(--primary);">Active</span>
                </div>
                <div class="ms-title">${t('step_4_title')}</div>
                <div class="ms-sub">${t('step_4_sub')}</div>
              </div>
            </div>
          </div>

          <!-- 8-Stage PM Surya Ghar Execution Tracker -->
          <div class="exec-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
              <div>
                <h3 style="font-size:16px; font-weight:800; margin:0 0 4px;">${t('execution_pipeline_title')}</h3>
                <div style="font-size:13px; color:var(--text-muted);">Current Active Phase: <strong>${project ? project.current_stage.replace(/_/g, ' ').toUpperCase() : 'APPLICATION FILED'}</strong></div>
              </div>
              <span style="font-size:12px; font-weight:700; color:var(--success); background:var(--success-light); padding:4px 10px; border-radius:999px;">
                MSEDCL Nagpur Division Fast-Track
              </span>
            </div>
            <div class="exec-stages-grid">
              ${renderExecutionStages(project)}
            </div>
          </div>
        </div>
      `);
    }

    function renderExecutionStages(project) {
      const stages = [
        { key: 'advance_received' },
        { key: 'documents_collected' },
        { key: 'application_filed' },
        { key: 'installation' },
        { key: 'inspection' },
        { key: 'net_meter_fitted' },
        { key: 'subsidy_applied' },
        { key: 'subsidy_credited' }
      ];

      const currIdx = stages.findIndex(s => s.key === project.current_stage);

      return stages.map((s, idx) => {
        const isDone = idx < currIdx;
        const isCurr = idx === currIdx;
        const cls = isDone ? 'done' : (isCurr ? 'current' : '');
        const iconSvg = isDone
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:var(--success);"><polyline points="20 6 9 17 4 12"/></svg>'
          : (isCurr
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--primary);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-subtle);"><circle cx="12" cy="12" r="9"/></svg>');
        const stLabel = (I18N.STAGE_LABELS[state.lang] || I18N.STAGE_LABELS.en)[s.key] || s.key;
        const stStatus = isDone ? t('stage_status_completed') : (isCurr ? t('stage_status_in_progress') : t('stage_status_pending'));
        const stepTxt = t('step_prefix', { n: idx + 1 });

        return `
          <div class="exec-stage-card ${cls}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:11px; font-weight:800; color:var(--text-muted);">${stepTxt}</span>
              ${iconSvg}
            </div>
            <strong style="font-size:13px; color:var(--text-main); line-height:1.2;">${stLabel}</strong>
            <span style="font-size:11px; color:var(--text-muted); margin-top:4px;">${stStatus}</span>
          </div>
        `;
      }).join('');
    }

    // ==========================================
    // 4. VIEW: QUOTE BUILDER & BOOKING
    // ==========================================
    function viewPublicQuote() {
      const lead = state.leads.find(l => l.id === state.selectedLeadId) || state.leads[0];
      const qb = state.qbState;
      const math = calcSystemMath(qb.kw, qb.segment, lead.monthly_bill, lead.monthly_units, qb.discount);

      return renderPublicShell(`
        <div style="max-width:980px; margin:0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <a href="#back" data-nav="public_status" class="btn-outline">
              ${t('back_to_dash')}
            </a>
            <div style="display:flex; align-items:center; gap:10px;">
              ${state.currentUser ? `
                <button type="button" class="btn-outline" data-action="back-to-staff" style="background:#0F5C4D; color:#FFFFFF; border-color:#0F5C4D; font-weight:700;">
                  &larr; Back to ${state.currentUser.role.toUpperCase()} Workspace
                </button>
              ` : ''}
              <span style="font-size:12px; font-weight:700; color:var(--primary); background:var(--primary-light); padding:4px 12px; border-radius:999px;">
                ${t('same_day_quote_engine')}
              </span>
            </div>
          </div>

          <div class="exec-card">
            <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">${t('quote_calc_title')}</h1>
            <p style="font-size:14px; color:var(--text-muted); margin:0 0 20px;">
              ${t('quote_calc_sub')}
            </p>

            <!-- Capacity Chips -->
            <label class="field-label">${t('select_capacity_label')}</label>
            <div class="capacity-chip-bar" style="margin-bottom:18px;">
              ${[2, 3, 4, 5, 6, 8, 10].map(k => `
                <button type="button" class="cap-chip ${qb.kw === k ? 'active' : ''}" data-action="set-qb-kw" data-kw="${k}">
                  ${k} kW ${k === 3 ? `(${t('option_recommended')})` : ''}
                </button>
              `).join('')}
            </div>

            <div class="form-row">
              <div class="field-group">
                <label for="qb-segment" class="field-label">${t('consumer_segment_label')}</label>
                <select id="qb-segment" class="select-input">
                  <option value="home" ${qb.segment === 'home' ? 'selected' : ''}>${t('segment_home')}</option>
                  <option value="business" ${qb.segment === 'business' ? 'selected' : ''}>${t('segment_business')}</option>
                </select>
              </div>

              <div class="field-group">
                <label for="qb-discount" class="field-label">${t('special_discount_label')}</label>
                <input type="number" id="qb-discount" value="${qb.discount}" min="0" step="1000" class="input-text">
                <div class="field-hint">${t('discount_limit_hint')}</div>
              </div>
            </div>

            <!-- Discount Alert if > 10,000 -->
            <div id="qb-approval-alert" style="display:${qb.discount > 10000 ? 'flex' : 'none'}; align-items:center; gap:8px; background:#FEF3C7; border:1px solid #FCD34D; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:13px; color:#92400E;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>${t('discount_approval_alert', { amount: formatInr(qb.discount) })}</span>
            </div>

            <!-- Math Breakdown Table -->
            <table class="math-table">
              <thead>
                <tr>
                  <th>${t('table_col_component')}</th>
                  <th>${t('table_col_formula')}</th>
                  <th class="num">${t('table_col_amount')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${t('table_row_price')}</strong></td>
                  <td>${t('schedule_for_kw', { kw: math.kw })}</td>
                  <td class="num">${formatInr(math.price)}</td>
                </tr>
                <tr>
                  <td><strong>${t('table_row_subsidy')}</strong></td>
                  <td>${math.segment === 'home' ? t('res_subsidy_calc') : t('biz_subsidy_calc')}</td>
                  <td class="num" style="color:#059669; font-weight:700;">&minus; ${formatInr(math.subsidy)}</td>
                </tr>
                <tr>
                  <td><strong>${t('table_row_discount')}</strong></td>
                  <td>${t('special_discount_table')}</td>
                  <td class="num" style="color:#B45309;">&minus; ${formatInr(math.discount)}</td>
                </tr>
                <tr class="highlight">
                  <td><strong>${t('table_row_net')}</strong></td>
                  <td>${t('formula_net_cost')}</td>
                  <td class="num" style="font-size:18px; color:var(--primary); font-weight:800;">${formatInr(math.netCost)}</td>
                </tr>
                <tr>
                  <td>${t('table_row_gen')}</td>
                  <td>${t('gen_calc_formula', { kw: math.kw })}</td>
                  <td class="num">${math.generation.toLocaleString('en-IN')} ${t('units_per_year')}</td>
                </tr>
                <tr>
                  <td>${t('table_row_saving')}</td>
                  <td>${t('saving_calc_formula', { gen: math.usableUnits.toLocaleString('en-IN') })}</td>
                  <td class="num" style="color:#059669; font-weight:700;">${formatInr(math.annualSaving)} / ${t('per_year')}</td>
                </tr>
                <tr>
                  <td><strong>${t('table_row_payback')}</strong></td>
                  <td>${t('formula_payback')}</td>
                  <td class="num"><strong>${math.paybackYears} ${t('years_suffix')}</strong></td>
                </tr>
              </tbody>
            </table>

            <!-- Booking Section -->
            <div style="background:var(--primary-light); border:1px solid var(--primary-border); border-radius:var(--radius-md); padding:18px 22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
              <div>
                <div style="font-size:13px; font-weight:700; color:var(--primary);">${t('booking_advance_10')}</div>
                <div style="font-size:24px; font-weight:800; color:var(--primary);">${formatInr(math.advance10)}</div>
                <div style="font-size:12px; color:var(--text-muted);">Adjusted against turnkey price upon project commencement</div>
              </div>
              <button type="button" class="btn-primary" data-action="pay-advance" data-amount="${formatInr(math.advance10)}" style="width:auto; padding:12px 28px;">
                ${t('btn_accept_advance_fmt', { amount: formatInr(math.advance10) })} &rarr;
              </button>
            </div>
          </div>
        </div>
      `);
    }

    // ==========================================
    // 5. VIEW: STAFF LOGIN
    // ==========================================
    function viewLogin() {
      return renderPublicShell(`
        <div class="exec-card" style="max-width:440px; margin:40px auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <a href="#home" data-nav="public_lead_form" class="btn-outline" style="font-size:12px; padding:5px 10px;">
              &larr; Homeowner Portal
            </a>
            <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Staff Sign In</span>
          </div>

          <h2 style="font-size:22px; font-weight:800; margin:0 0 6px;">Vidarbha Solar Staff</h2>
          <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 20px;">
            Sign in to access your designated workspace based on role permissions.
          </p>

          <div style="background:var(--primary-light); border:1px solid var(--primary-border); padding:10px 14px; border-radius:8px; margin-bottom:18px; font-size:12.5px; color:#065F46;">
            <strong>Fixed Staff Credentials:</strong> Password for all staff accounts is <code>solar123</code>. Click any role button below to fill and access instantly.
          </div>

          <form id="staff-login-form">
            <div class="field-group">
              <label class="field-label">Email Address</label>
              <input type="email" id="login-email" class="input-text" value="sales@companya.in" required>
            </div>
            <div class="field-group">
              <label class="field-label">Password</label>
              <input type="password" id="login-password" class="input-text" value="solar123" required>
            </div>
            <button type="submit" class="btn-primary" style="margin-top:6px; width:100%;">
              Sign In with Credentials &rarr;
            </button>
          </form>

          <div style="margin-top:22px; padding-top:16px; border-top:1px solid var(--border);">
            <div style="font-size:12px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">
              Or select role to load fixed username &amp; password:
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <button type="button" class="btn-outline" data-action="fill-login" data-role="sales" data-email="sales@companya.in" style="justify-content:flex-start; text-align:left;">
                <div>
                  <div style="font-weight:800; color:var(--text-main);">Sales Exec</div>
                  <div style="font-size:11px; color:var(--text-muted);">sales@companya.in</div>
                </div>
              </button>
              <button type="button" class="btn-outline" data-action="fill-login" data-role="founder" data-email="founder@companya.in" style="justify-content:flex-start; text-align:left;">
                <div>
                  <div style="font-weight:800; color:var(--text-main);">Founder-MD</div>
                  <div style="font-size:11px; color:var(--text-muted);">founder@companya.in</div>
                </div>
              </button>
              <button type="button" class="btn-outline" data-action="fill-login" data-role="coordinator" data-email="coord@companya.in" style="justify-content:flex-start; text-align:left;">
                <div>
                  <div style="font-weight:800; color:var(--text-main);">Coordinator</div>
                  <div style="font-size:11px; color:var(--text-muted);">coord@companya.in</div>
                </div>
              </button>
              <button type="button" class="btn-outline" data-action="fill-login" data-role="admin" data-email="admin@companya.in" style="justify-content:flex-start; text-align:left;">
                <div>
                  <div style="font-weight:800; color:var(--text-main);">System Admin</div>
                  <div style="font-size:11px; color:var(--text-muted);">admin@companya.in</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      `);
    }

    // ==========================================
    // 6. VIEW: FOUNDER DASHBOARD
    // ==========================================
    function viewFounderDashboard() {
      return renderStaffShell(`
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <h1 style="font-size:24px; font-weight:800; margin:0 0 4px;">Founder &amp; Managing Director Cockpit</h1>
              <div style="font-size:13.5px; color:var(--text-muted);">Real-time Vidarbha Operations &bull; Commercial Sizing &bull; Margin Governance</div>
            </div>
            <button type="button" class="btn-primary" data-nav="founder_approvals" style="width:auto; padding:9px 18px; font-size:13.5px;">
              View Approvals Queue (1 Pending) &rarr;
            </button>
          </div>

          <!-- KPI Cards Grid -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; margin-bottom:24px;">
            <div class="hero-metric-card" style="border-left:3px solid var(--primary);">
              <span class="metric-label">Unqualified Surveys</span>
              <span class="metric-value">20.0%</span>
              <span class="metric-sub">1 of 5 surveys unsuitable (Target &le; 15%)</span>
            </div>
            <div class="hero-metric-card" style="border-left:3px solid var(--success);">
              <span class="metric-label">Same-Day Quote Turnaround</span>
              <span class="metric-value" style="color:var(--success);">100%</span>
              <span class="metric-sub">Avg 0.0 days from roof survey</span>
            </div>
            <div class="hero-metric-card">
              <span class="metric-label">Survey Savings Delivered</span>
              <span class="metric-value">₹13.2 Lakh</span>
              <span class="metric-sub">2 visits avoided via pre-qualification</span>
            </div>
            <div class="hero-metric-card" style="border-left:3px solid #DC2626;">
              <span class="metric-label">Stuck Project SLA Alert</span>
              <span class="metric-value" style="color:#DC2626;">1 Project</span>
              <span class="metric-sub">PRJ-8001: 12 days in filing (limit 7)</span>
            </div>
          </div>

          <!-- Discount Approvals Summary Card -->
          <div class="exec-card" style="margin-bottom:24px;">
            <h3 style="font-size:16px; font-weight:800; margin:0 0 12px;">Discount Approvals Requiring Founder Sign-off (&gt; ₹10,000)</h3>
            <table class="math-table">
              <thead>
                <tr>
                  <th>Lead / Customer</th>
                  <th>System Size</th>
                  <th>Turnkey Price</th>
                  <th>Discount Requested</th>
                  <th>Net Customer Cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Rohit Meshram</strong> (LD-30902)</td>
                  <td>3 kW Home</td>
                  <td class="num">₹1,86,000</td>
                  <td class="num" style="color:#B45309; font-weight:800;">₹15,000</td>
                  <td class="num">₹93,000</td>
                  <td>
                    <button type="button" class="btn-primary" data-action="approve-quote" data-quote-id="2" style="width:auto; padding:6px 14px; font-size:12px;">
                      Approve &amp; Release &rarr;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `, 'founder_dashboard');
    }

    // ==========================================
    // 7. VIEW: FOUNDER APPROVALS
    // ==========================================
    function viewFounderApprovals() {
      return renderStaffShell(`
        <div>
          <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">Discount Approvals Queue</h1>
          <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 20px;">
            Quotes with discounts exceeding ₹10,000 are placed on hold. Customer pricing is locked until approved.
          </p>

          <div class="exec-card">
            <table class="math-table">
              <thead>
                <tr>
                  <th>Quote Ref</th>
                  <th>Customer</th>
                  <th>Capacity</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>QT-5002</strong></td>
                  <td>Rohit Meshram</td>
                  <td>3 kW</td>
                  <td class="num" style="color:#B45309; font-weight:800;">₹15,000</td>
                  <td><span style="background:#FEF3C7; color:#92400E; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700;">Pending Approval</span></td>
                  <td>
                    <div style="display:flex; gap:8px;">
                      <button type="button" class="btn-primary" data-action="approve-quote" data-quote-id="2" style="width:auto; padding:6px 12px; font-size:12px;">Approve</button>
                      <button type="button" class="btn-outline" data-action="reject-quote" data-quote-id="2" style="font-size:12px; padding:6px 12px; color:#DC2626;">Reject</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `, 'founder_approvals');
    }

    // ==========================================
    // 8. VIEW: SALES LEADS
    // ==========================================
    function viewSalesLeads() {
      return renderStaffShell(`
        <div>
          <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">Sales Leads Pipeline</h1>
          <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 20px;">
            High and Medium score leads receive prioritized rooftop site surveys. Low score leads receive phone consultations.
          </p>

          <div class="exec-card">
            <table class="math-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Score</th>
                  <th>Size</th>
                  <th>Bill (Units)</th>
                  <th>Next Step</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${state.leads.map(l => `
                  <tr>
                    <td><strong>${l.lead_code}</strong></td>
                    <td>${l.name}</td>
                    <td>
                      <span style="display:inline-block; padding:3px 8px; border-radius:4px; font-size:11.5px; font-weight:800; background:${l.score === 'High' ? '#D1FAE5' : (l.score === 'Medium' ? '#FEF3C7' : '#FEE2E2')}; color:${l.score === 'High' ? '#065F46' : (l.score === 'Medium' ? '#92400E' : '#991B1B')};">
                        ${l.score}
                      </span>
                    </td>
                    <td>${l.recommended_kw || '—'} kW</td>
                    <td class="num">${formatInr(l.monthly_bill)} (${l.monthly_units} u)</td>
                    <td>${l.next_step === 'roof_visit' ? 'Roof Visit' : 'Short Call'}</td>
                    <td>
                      <button type="button" class="btn-outline" data-nav="sales_lead_detail" data-lead-id="${l.id}" style="font-size:11.5px; padding:4px 8px;">
                        Open Lead &rarr;
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `, 'sales_leads');
    }

    // ==========================================
    // 9. VIEW: SALES CALLS
    // ==========================================
    
    function viewSalesLeadDetail() {
      const lead = state.leads.find(l => l.id === state.selectedLeadId) || state.leads[0];
      const quotes = state.quotes.filter(q => q.lead_id === lead.id);
      const svgKey = lead.bill_svg_key || 'bill_LD_30881_prashant.svg';
      const svgData = SAMPLE_SVGS[svgKey] || '';

      return renderStaffShell(`
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="font-size:12px; color:var(--text-muted); font-family:monospace; margin-bottom:4px;">
                ${lead.lead_code} &bull; Pincode ${lead.pincode} &bull; Consumer Ref: ${lead.consumer_no || '410018294801'}
              </div>
              <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">${lead.name}</h1>
              <div style="font-size:13.5px; color:var(--text-secondary);">
                Phone: <a href="tel:${lead.mobile}" style="color:var(--primary); font-weight:700;">${lead.mobile}</a> &bull;
                Ownership: <strong>${lead.ownership === 'tenant' ? 'Tenant (Rented)' : 'Home / Shop Owner'}</strong> &bull;
                Roof: <strong>${lead.roof_type || 'flat_slab'} (${lead.free_roof_area || 450} sq ft)</strong> &bull;
                Bill: <strong>${formatInr(lead.monthly_bill)} (${lead.monthly_units || 340} kWh/mo)</strong>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button type="button" class="btn-primary" data-nav="public_quote" data-lead-id="${lead.id}" style="width:auto; padding:9px 18px; font-size:13.5px;">
                + Build Quote &rarr;
              </button>
              <button type="button" class="btn-outline" data-nav="public_status" data-lead-id="${lead.id}" style="font-size:13.5px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview Homeowner View &rarr;
              </button>
              <button type="button" class="btn-outline" data-nav="sales_leads" style="font-size:13.5px;">
                &larr; Back to Leads
              </button>
            </div>
          </div>

          <!-- Row 1: Score & Sizing Governance + Bill Scan with Extracted Data -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
            <!-- Left: Qualification Score Card & Actions -->
            <div class="exec-card" style="margin-bottom:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h3 style="font-size:16px; font-weight:800; margin:0;">Transparent Score &amp; Sizing</h3>
                <span style="display:inline-block; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:800; background:${lead.score === 'High' ? '#D1FAE5' : (lead.score === 'Medium' ? '#FEF3C7' : '#FEE2E2')}; color:${lead.score === 'High' ? '#065F46' : (lead.score === 'Medium' ? '#92400E' : '#991B1B')};">
                  ${lead.score} Score
                </span>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px; background:var(--bg-subtle); border-radius:8px; margin-bottom:16px;">
                <div>
                  <div style="font-size:11.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Recommended Size</div>
                  <div style="font-size:22px; font-weight:800; color:var(--primary);">${lead.recommended_kw ? lead.recommended_kw + ' kW' : 'No Size'}</div>
                  <div style="font-size:11px; color:var(--text-muted);">${lead.score_reason || (lead.ownership === 'tenant' ? 'Tenant without roof rights' : 'Consumption-based match')}</div>
                </div>
                <div>
                  <div style="font-size:11.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Effective Next Step</div>
                  <div style="font-size:18px; font-weight:800; color:var(--text-main); margin-top:2px;">
                    ${lead.next_step === 'roof_visit' ? 'Roof Visit' : 'Short Phone Call'}
                  </div>
                  <div style="font-size:11px; color:var(--text-muted);">${lead.next_step === 'roof_visit' ? 'High-fit survey prioritized' : 'Avoid wasted surveyor travel'}</div>
                </div>
              </div>

              <!-- Next Step Override -->
              <div style="margin-bottom:16px;">
                <label style="font-size:12.5px; font-weight:700; display:block; margin-bottom:6px;">Next Step Action</label>
                <div style="display:flex; gap:8px;">
                  <select id="staff-next-step" class="select-input" style="flex:1;">
                    <option value="roof_visit" ${lead.next_step === 'roof_visit' ? 'selected' : ''}>Schedule Roof Site Visit</option>
                    <option value="short_call" ${lead.next_step === 'short_call' ? 'selected' : ''}>Route to Short Telephone Advisory</option>
                  </select>
                  <button type="button" class="btn-outline" data-action="save-lead-step" style="font-size:12.5px; padding:8px 14px;">Save</button>
                </div>
              </div>

              <!-- Roof Survey Outcome Recorder -->
              <div style="border-top:1px solid var(--border); padding-top:16px;">
                <h4 style="font-size:14px; font-weight:800; margin:0 0 10px;">Record Roof Survey Outcome</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                  <div>
                    <label style="font-size:11.5px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Survey Date</label>
                    <input type="date" id="staff-survey-date" class="input-text" value="${lead.survey_date || '2026-11-06'}">
                  </div>
                  <div>
                    <label style="font-size:11.5px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Roof Suitability</label>
                    <select id="staff-survey-status" class="select-input">
                      <option value="suitable" ${lead.survey_status === 'suitable' ? 'selected' : ''}>Suitable for Solar (100% Shadow-free)</option>
                      <option value="unsuitable" ${lead.survey_status === 'unsuitable' ? 'selected' : ''}>Unsuitable (Heavy shadow / structure weak)</option>
                    </select>
                  </div>
                </div>
                <button type="button" class="btn-primary" data-action="save-survey-outcome" style="width:auto; padding:8px 16px; font-size:12.5px;">
                  Record Survey &amp; Update KPIs &rarr;
                </button>
              </div>
            </div>

            <!-- Right: Bill Scan with Extracted Data -->
            <div class="exec-card" style="margin-bottom:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h3 style="font-size:16px; font-weight:800; margin:0;">MSEDCL Electricity Bill &amp; AI Extraction</h3>
                <span style="font-size:11.5px; font-weight:700; color:var(--primary); background:var(--primary-light); padding:3px 8px; border-radius:4px;">
                  ${lead.bill_readable ? 'AI Verified (98.4%)' : 'Photo Quality Low'}
                </span>
              </div>

              <div style="border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; background:#F8FAFC; padding:10px; text-align:center; margin-bottom:14px; max-height:220px;">
                ${svgData ? `<img src="${svgData}" alt="Bill Scan" style="max-width:100%; max-height:200px; height:auto; border-radius:4px;">` : '<div style="padding:40px 10px; color:var(--text-muted);">PDF Document Attached</div>'}
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px;">
                <div style="padding:8px 10px; background:var(--bg-subtle); border-radius:6px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Consumer No</span>
                  <strong style="font-family:monospace;">${lead.consumer_no || '410018294801'}</strong>
                </div>
                <div style="padding:8px 10px; background:var(--bg-subtle); border-radius:6px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Tariff Category</span>
                  <strong>${lead.tariff_category || 'LT-I Residential'}</strong>
                </div>
                <div style="padding:8px 10px; background:var(--bg-subtle); border-radius:6px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Sanctioned Load</span>
                  <strong>${lead.sanctioned_load_kw || 3.0} kW</strong>
                </div>
                <div style="padding:8px 10px; background:var(--bg-subtle); border-radius:6px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Monthly Units</span>
                  <strong>${lead.monthly_units || 340} kWh</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 2: Quotes Issued for this Lead -->
          <div class="exec-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <div>
                <h3 style="font-size:16px; font-weight:800; margin:0 0 2px;">Quotes Issued for this Lead</h3>
                <div style="font-size:12.5px; color:var(--text-muted);">Same-day quotes prepared after roof survey verification</div>
              </div>
              <button type="button" class="btn-primary" data-nav="public_quote" data-lead-id="${lead.id}" style="width:auto; padding:8px 16px; font-size:13px;">
                + Build New Quote
              </button>
            </div>

            <table class="math-table" style="margin-top:0;">
              <thead>
                <tr>
                  <th>Quote Ref</th>
                  <th>System Size</th>
                  <th>Turnkey Price</th>
                  <th>Subsidy</th>
                  <th>Discount</th>
                  <th>Net Customer Cost</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${quotes.length > 0 ? quotes.map(q => {
                  const qMath = calcSystemMath(q.selected_kw, q.segment, lead.monthly_bill, lead.monthly_units, q.discount);
                  return `
                    <tr>
                      <td><strong>${q.quote_code}</strong></td>
                      <td>${q.selected_kw} kW ${q.segment === 'home' ? 'Residential' : 'Commercial'}</td>
                      <td class="num">${formatInr(qMath.price)}</td>
                      <td class="num" style="color:#059669;">− ${formatInr(qMath.subsidy)}</td>
                      <td class="num" style="color:#B45309;">${q.discount > 0 ? '− ' + formatInr(q.discount) : '₹0'}</td>
                      <td class="num" style="font-weight:800; color:var(--primary);">${formatInr(qMath.netCost)}</td>
                      <td>
                        <span style="display:inline-block; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; background:${q.status === 'pending_founder_approval' ? '#FEF3C7' : '#D1FAE5'}; color:${q.status === 'pending_founder_approval' ? '#92400E' : '#065F46'};">
                          ${q.status === 'pending_founder_approval' ? 'Pending Approval' : 'Issued / Active'}
                        </span>
                      </td>
                      <td>
                        <button type="button" class="btn-outline" data-nav="public_quote" data-lead-id="${lead.id}" style="font-size:11.5px; padding:4px 8px;">
                          Edit / View &rarr;
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="8" style="text-align:center; color:var(--text-muted); padding:20px;">
                      No quote created yet. Click "+ Build New Quote" to generate a same-day proposal.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      `, 'sales_leads');
    }
function viewSalesCalls() {
      const calls = state.leads.filter(l => l.score === 'Low');
      return renderStaffShell(`
        <div>
          <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">Sales Call Queue (Low-Score Leads)</h1>
          <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 20px;">
            Unqualified or small-bill leads are handled by telephone advisory to avoid wasted surveyor site visits.
          </p>

          <div class="exec-card">
            <table class="math-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Reason</th>
                  <th>Bill Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${calls.map(c => `
                  <tr>
                    <td><strong>${c.name}</strong> (${c.lead_code})</td>
                    <td><a href="tel:${c.mobile}" style="color:var(--primary); font-weight:700;">${c.mobile}</a></td>
                    <td>${c.score_reason || 'Tenant / Small Bill'}</td>
                    <td class="num">${formatInr(c.monthly_bill)}</td>
                    <td>
                      <button type="button" class="btn-primary" style="width:auto; padding:4px 10px; font-size:12px;">Call Logged &check;</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `, 'sales_calls');
    }

    // ==========================================
    // 10. VIEW: COORDINATOR PROJECTS
    // ==========================================
    function viewCoordinatorProjects() {
      return renderStaffShell(`
        <div>
          <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">Coordinator 8-Stage Execution Tracker</h1>
          <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 20px;">
            Manage DISCOM filing, panel installation, CEIG inspection, net meter setup, and PM Surya Ghar subsidy disbursement.
          </p>

          <!-- Stuck SLA Alert Card -->
          <div style="background:#FEE2E2; border:1px solid #F87171; border-radius:var(--radius-md); padding:16px 20px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#991B1B; font-size:14.5px;">&bull; 1 Project Exceeding Stage SLA (PRJ-8001 &bull; Vidarbha Agro)</strong>
              <div style="font-size:12.5px; color:#B91C1C; margin-top:2px;">12 days elapsed in "Application filed" stage (Maximum limit: 7 days)</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-outline" data-nav="coordinator_project_detail" data-project-id="1" style="background:#FFFFFF; color:#991B1B; border-color:#F87171; font-weight:700; padding:6px 12px; font-size:12px;">
                Inspect Stuck Project (PRJ-8001) &rarr;
              </button>
              <button type="button" class="btn-primary" data-action="advance-stage" data-project-id="1" style="width:auto; background:#DC2626; padding:6px 14px; font-size:12px;">
                Advance Stage &rarr;
              </button>
            </div>
          </div>

          <div class="exec-card">
            <table class="math-table">
              <thead>
                <tr>
                  <th>Project Code</th>
                  <th>Customer</th>
                  <th>System Size</th>
                  <th>Current Stage</th>
                  <th>Days in Stage</th>
                  <th>SLA Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong><a href="#proj" data-nav="coordinator_project_detail" data-project-id="1" style="color:var(--primary); text-decoration:underline;">PRJ-8001</a></strong></td>
                  <td>Vidarbha Agro Sweets</td>
                  <td>10 kW</td>
                  <td><strong>Application filed</strong></td>
                  <td class="num" style="color:#DC2626; font-weight:800;">12 days</td>
                  <td><span style="color:#DC2626; font-weight:800;">&bull; Stuck Exceeding SLA</span></td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button type="button" class="btn-outline" data-nav="coordinator_project_detail" data-project-id="1" style="font-size:11.5px; padding:4px 8px;">
                        Open Detail &rarr;
                      </button>
                      <button type="button" class="btn-primary" data-action="advance-stage" data-project-id="1" style="width:auto; padding:4px 10px; font-size:11.5px;">
                        Advance &rarr;
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `, 'coordinator_projects');
    }

    // ==========================================
    // 11. VIEW: ADMIN RULES & PRICES
    // ==========================================
    
    function viewCoordinatorProjectDetail() {
      const proj = state.projects[0];
      const lead = state.leads.find(l => l.id === proj.lead_id) || state.leads[3];

      return renderStaffShell(`
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="font-size:12px; color:var(--text-muted); font-family:monospace; margin-bottom:4px;">
                ${proj.project_code} &bull; Lead Ref: ${lead.lead_code} &bull; Customer Language: ${lead.lang ? lead.lang.toUpperCase() : 'EN'}
              </div>
              <h1 style="font-size:24px; font-weight:800; margin:0 0 6px;">${lead.name} (${proj.system_kw} kW System)</h1>
              <div style="font-size:13.5px; color:var(--text-secondary);">
                Net Cost: <strong>${formatInr(proj.net_cost)}</strong> &bull;
                Current Phase: <strong style="color:#DC2626;">Application filed (12 days in stage, Limit: 7d)</strong> &bull;
                Consumer No: <strong>${lead.consumer_no || '410018501923'}</strong>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button type="button" class="btn-primary" data-action="advance-stage" data-project-id="${proj.id}" style="width:auto; padding:9px 18px; font-size:13.5px; background:#059669;">
                Move to: Installation &rarr;
              </button>
              <button type="button" class="btn-outline" data-nav="public_status" data-lead-id="${lead.id}" style="font-size:13.5px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview Homeowner Status &rarr;
              </button>
              <button type="button" class="btn-outline" data-nav="coordinator_projects" style="font-size:13.5px;">
                &larr; Back to Tracker
              </button>
            </div>
          </div>

          <!-- Stuck Alert Banner in Detail View -->
          <div style="background:#FEE2E2; border:1px solid #F87171; border-radius:var(--radius-md); padding:14px 18px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#991B1B; font-size:14px;">&bull; Project SLA Overdue by 5 Days</strong>
              <div style="font-size:12px; color:#B91C1C; margin-top:2px;">
                MSEDCL Nagpur Division portal filing completed on 2026-10-25. Site sanction is pending at Hingna Division sub-station.
              </div>
            </div>
            <button type="button" class="btn-primary" data-action="advance-stage" data-project-id="${proj.id}" style="width:auto; background:#DC2626; padding:6px 14px; font-size:12px;">
              Mark Feasibility Sanctioned &rarr;
            </button>
          </div>

          <!-- Two Column Grid: 8-Stage Progression vs Document Repository -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
            <!-- Left: 8-Stage Forward-Only Progression -->
            <div class="exec-card" style="margin-bottom:0;">
              <h3 style="font-size:16px; font-weight:800; margin:0 0 14px;">8-Stage Project Workflow (Strictly Forward-Only)</h3>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${[
                  { name: '1. Advance Received', status: 'Completed (2026-10-19)', done: true },
                  { name: '2. Documents Collected', status: 'Completed (2026-10-22)', done: true },
                  { name: '3. Application Filed', status: 'Active • 12 days in stage (Limit 7d)', current: true },
                  { name: '4. System Installation', status: 'Pending MSEDCL Sanction' },
                  { name: '5. CEIG Electrical Inspection', status: 'Pending installation' },
                  { name: '6. Net Meter Fitted', status: 'Pending inspection' },
                  { name: '7. Subsidy Applied (National Portal)', status: 'Pending net meter' },
                  { name: '8. Subsidy Credited in Bank', status: 'Pending national portal claim' }
                ].map(s => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-radius:8px; border:1px solid ${s.done ? '#A7F3D0' : (s.current ? '#F87171' : 'var(--border)')}; background:${s.done ? '#F0FDF4' : (s.current ? '#FEF2F2' : '#FFFFFF')}; font-size:13px;">
                    <div>
                      <strong>${s.name}</strong>
                      <div style="font-size:11.5px; color:${s.current ? '#991B1B' : 'var(--text-muted)'};">${s.status}</div>
                    </div>
                    <span>
                      ${s.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : (s.current ? '<span style="color:#DC2626; font-size:11px; font-weight:800;">STUCK</span>' : '<span style="color:var(--text-muted); font-size:11px;">PENDING</span>')}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Right: Document Uploads & Customer Notification Log -->
            <div class="exec-card" style="margin-bottom:0;">
              <h3 style="font-size:16px; font-weight:800; margin:0 0 14px;">Project Documents &amp; Compliance Files</h3>
              <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-subtle); border-radius:6px; font-size:12.5px;">
                  <span><strong>MSEDCL A-1 Net-Metering Application Form</strong> (PDF)</span>
                  <span style="color:#059669; font-weight:700;">Verified &bull; Uploaded</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-subtle); border-radius:6px; font-size:12.5px;">
                  <span><strong>Property Tax Paid Receipt (Nagpur Municipal Corp)</strong></span>
                  <span style="color:#059669; font-weight:700;">Verified &bull; Uploaded</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-subtle); border-radius:6px; font-size:12.5px;">
                  <span><strong>Applicant Aadhaar &amp; Cancelled Cheque (DBT Bank Account)</strong></span>
                  <span style="color:#059669; font-weight:700;">Verified &bull; Uploaded</span>
                </div>
              </div>

              <!-- Upload New Project Document Form -->
              <div style="border-top:1px solid var(--border); padding-top:14px;">
                <h4 style="font-size:13.5px; font-weight:800; margin:0 0 8px;">Upload Stage Document</h4>
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                  <input type="text" class="input-text" placeholder="Document label e.g. CEIG Inspection Certificate" style="font-size:12.5px;">
                  <button type="button" class="btn-primary" style="width:auto; padding:6px 14px; font-size:12.5px; white-space:nowrap;">Upload</button>
                </div>
                <div style="font-size:11px; color:var(--text-muted);">Homeowner status view displays document names only; files remain private on secure server.</div>
              </div>
            </div>
          </div>
        </div>
      `, 'coordinator_projects');
    }
function viewAdminRules() {
      return renderStaffShell(`
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <div>
              <h1 style="font-size:24px; font-weight:800; margin:0 0 4px;">Rules, Prices, Tariffs &amp; System Settings</h1>
              <div style="font-size:13.5px; color:var(--text-muted);">Manage dated pricing &amp; subsidy rules. Adding a new dated row closes the predecessor row automatically.</div>
            </div>
            <div style="display:flex; gap:10px;">
              <span style="background:var(--primary-light); color:var(--primary); border:1.5px solid var(--primary-border); padding:6px 14px; border-radius:999px; font-size:12px; font-weight:800;">
                All Issued Quotes Remain Frozen
              </span>
            </div>
          </div>

          <!-- Section 1: Dated Subsidy Rules -->
          <div class="exec-card" style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 style="font-size:16px; font-weight:800; margin:0 0 2px;">1. Dated Subsidy Rules (Home Segment — Business Gets ₹0)</h3>
                <div style="font-size:12.5px; color:var(--text-muted);">Central PM Surya Ghar Muft Bijli Yojana calculation rules by effective date window</div>
              </div>
              <button type="button" class="btn-outline" data-action="toggle-admin-form" data-target="form-add-subsidy">
                + Add Dated Subsidy Rule
              </button>
            </div>

            <table class="math-table" style="margin:0 0 16px;">
              <thead>
                <tr>
                  <th>Scheme / Segment</th>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Tier 1 (kW &times; Rate)</th>
                  <th>Tier 2 (kW &times; Rate)</th>
                  <th class="num">Max Cap</th>
                  <th>Rule Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>PM Surya Ghar (Home)</strong></td>
                  <td style="font-family:monospace;">2024-03-01</td>
                  <td style="font-family:monospace;">Open (Current)</td>
                  <td>2 kW &times; ₹30,000</td>
                  <td>1 kW &times; ₹18,000</td>
                  <td class="num" style="color:#059669; font-weight:800;">₹78,000</td>
                  <td><span style="background:#D1FAE5; color:#065F46; padding:3px 9px; border-radius:4px; font-size:11px; font-weight:800;">Active Now</span></td>
                </tr>
                <tr>
                  <td><strong>Pre-Scheme Baseline</strong></td>
                  <td style="font-family:monospace;">2020-01-01</td>
                  <td style="font-family:monospace;">2024-02-29</td>
                  <td>0 kW &times; ₹0</td>
                  <td>0 kW &times; ₹0</td>
                  <td class="num" style="color:var(--text-muted);">₹0</td>
                  <td><span style="background:#F1F5F9; color:var(--text-muted); padding:3px 9px; border-radius:4px; font-size:11px; font-weight:800;">Archived</span></td>
                </tr>
              </tbody>
            </table>

            <!-- Add Subsidy Form Box -->
            <div id="form-add-subsidy" style="display:none; background:var(--bg-subtle); padding:16px 18px; border-radius:12px; border:1.5px solid var(--border); margin-top:14px;">
              <h4 style="font-size:14px; font-weight:800; margin:0 0 10px;">Add New Dated Subsidy Rule Window</h4>
              <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:12px;">
                <div><label style="font-size:12px; font-weight:700;">Effective From</label><input type="date" class="input-text" value="2027-04-01"></div>
                <div><label style="font-size:12px; font-weight:700;">Effective To</label><input type="date" class="input-text" placeholder="Open"></div>
                <div><label style="font-size:12px; font-weight:700;">Tier 1 kW &amp; Rate</label><input type="text" class="input-text" value="2 kW @ ₹25,000"></div>
                <div><label style="font-size:12px; font-weight:700;">Max Cap (₹)</label><input type="number" class="input-text" value="60000"></div>
              </div>
              <button type="button" class="btn-primary" data-action="save-mock-rule" style="width:auto; padding:8px 18px; font-size:13px;">Save &amp; Close Previous Rule &rarr;</button>
            </div>
          </div>

          <!-- Section 2: Turnkey System Price Schedule -->
          <div class="exec-card" style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 style="font-size:16px; font-weight:800; margin:0 0 2px;">2. Dated Turnkey System Price Schedules (1 kW to 10 kW)</h3>
                <div style="font-size:12.5px; color:var(--text-muted);">Standard turnkey pricing including Tier-1 bi-facial modules, DCR inverters &amp; MSEDCL net metering</div>
              </div>
              <span style="font-size:12px; font-weight:800; color:var(--primary); background:var(--primary-light); padding:5px 12px; border-radius:999px;">
                Effective Schedule: 2024-01-01 to Present
              </span>
            </div>

            <table class="math-table" style="margin:0;">
              <thead>
                <tr>
                  <th>Capacity</th>
                  <th class="num">Turnkey Price</th>
                  <th class="num">Central Subsidy</th>
                  <th class="num">Net Customer Cost</th>
                  <th class="num">Annual Units</th>
                  <th class="num">Yearly Saving</th>
                  <th>Payback</th>
                </tr>
              </thead>
              <tbody>
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => {
                  const math = calcSystemMath(k, 'home', 5000, null, 0);
                  return `
                    <tr class="${k === 3 ? 'highlight' : ''}">
                      <td><strong>${k} kW</strong> ${k === 3 ? '<span style="font-size:10px; background:var(--accent-sun); color:#FFF; padding:2px 7px; border-radius:999px; margin-left:4px; font-weight:800;">RECOMMENDED</span>' : ''}</td>
                      <td class="num">${formatInr(math.price)}</td>
                      <td class="num" style="color:#059669; font-weight:700;">− ${formatInr(math.subsidy)}</td>
                      <td class="num" style="color:var(--primary); font-weight:800;">${formatInr(math.netCost)}</td>
                      <td class="num">${math.generation.toLocaleString('en-IN')} kWh</td>
                      <td class="num" style="color:#059669; font-weight:700;">${formatInr(math.annualSaving)}</td>
                      <td><strong>${math.paybackYears} yrs</strong></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Section 3 & 4: Dated Tariffs & System Settings Grid -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
            <!-- Section 3: Dated Tariffs -->
            <div class="exec-card" style="margin-bottom:0;">
              <h3 style="font-size:16px; font-weight:800; margin:0 0 12px;">3. Dated Electricity Tariffs (MSEDCL Nagpur)</h3>
              <table class="math-table" style="margin-top:0;">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Effective From</th>
                    <th>Status</th>
                    <th class="num">Rate per Unit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Residential (Home LT-I)</strong></td>
                    <td style="font-family:monospace;">2024-01-01</td>
                    <td><span style="color:#059669; font-weight:700;">Active</span></td>
                    <td class="num"><strong>₹8.50 / kWh</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Commercial (Shop LT-II)</strong></td>
                    <td style="font-family:monospace;">2024-01-01</td>
                    <td><span style="color:#059669; font-weight:700;">Active</span></td>
                    <td class="num"><strong>₹10.50 / kWh</strong></td>
                  </tr>
                </tbody>
              </table>
              <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">
                Tariffs apply based on consumer bill classification extracted during AI verification.
              </div>
            </div>

            <!-- Section 4: Operational Settings & SLA Limits -->
            <div class="exec-card" style="margin-bottom:0;">
              <h3 style="font-size:16px; font-weight:800; margin:0 0 12px;">4. System Parameters &amp; Stage SLA Limits</h3>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
                <div style="padding:12px; background:var(--bg-subtle); border-radius:8px; border:1px solid var(--border);">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Generation Factor</span>
                  <strong style="font-size:15px; color:var(--primary);">1,400 units / kW / yr</strong>
                </div>
                <div style="padding:12px; background:var(--bg-subtle); border-radius:8px; border:1px solid var(--border);">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Default Advance %</span>
                  <strong style="font-size:15px; color:var(--primary);">10% of Net Cost</strong>
                </div>
                <div style="padding:12px; background:var(--bg-subtle); border-radius:8px; border:1px solid var(--border);">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Discount Escalation Limit</span>
                  <strong style="font-size:15px; color:#B45309;">&gt; ₹10,000 (Founder-MD)</strong>
                </div>
                <div style="padding:12px; background:var(--bg-subtle); border-radius:8px; border:1px solid var(--border);">
                  <span style="font-size:11px; font-weight:700; color:var(--text-muted); display:block;">Avoided Survey Cost</span>
                  <strong style="font-size:15px; color:#059669;">₹2,500 / visit saved</strong>
                </div>
              </div>

              <div style="font-size:12px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
                Stage SLA Limits (Days before flagging Stuck):
              </div>
              <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; font-size:12px;">
                <div style="padding:8px; background:#FFFFFF; border:1.5px solid var(--border); border-radius:6px; text-align:center;">
                  <span style="color:var(--text-muted); display:block;">Docs</span><strong>7 Days</strong>
                </div>
                <div style="padding:8px; background:#FFFFFF; border:1.5px solid var(--border); border-radius:6px; text-align:center;">
                  <span style="color:var(--text-muted); display:block;">Filing</span><strong>7 Days</strong>
                </div>
                <div style="padding:8px; background:#FFFFFF; border:1.5px solid var(--border); border-radius:6px; text-align:center;">
                  <span style="color:var(--text-muted); display:block;">Install</span><strong>14 Days</strong>
                </div>
                <div style="padding:8px; background:#FFFFFF; border:1.5px solid var(--border); border-radius:6px; text-align:center;">
                  <span style="color:var(--text-muted); display:block;">Meter</span><strong>7 Days</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      `, 'admin_rules');
    }

    function viewPublicPrivacy() {
      return renderPublicShell(`
        <div class="exec-card" style="max-width:800px; margin:0 auto;">
          <h1 style="font-size:24px; font-weight:800; margin:0 0 10px;">DPDP Act 2023 Privacy Notice</h1>
          <p style="font-size:14px; color:var(--text-secondary); line-height:1.7;">
            Under India's Digital Personal Data Protection (DPDP) Act 2023, Vidarbha Solar collects electricity bill details and contact information strictly for preparing technical rooftop solar feasibility assessments, calculating government subsidies, and filing net-metering applications with MSEDCL.
          </p>
          <p style="font-size:14px; color:var(--text-secondary); line-height:1.7;">
            Your information is never sold to third parties. Personal data can be erased at any time upon request by emailing privacy@companya.in or through our admin verification desk.
          </p>
          <button type="button" class="btn-primary" data-nav="public_lead_form" style="width:auto; margin-top:16px;">
            &larr; Back to Assessment
          </button>
        </div>
      `);
    }

    // ==========================================
    // NAVIGATION & RENDER
    // ==========================================
    function navigate(view, leadId) {
      state.currentView = view;
      if (leadId) state.selectedLeadId = leadId;
      render();
      window.scrollTo(0, 0);
    }

    function renderModal(modal) {
      return `
        <div class="modal-overlay" id="active-modal">
          <div class="modal-card">
            <h3 style="font-size:18px; font-weight:800; margin:0 0 8px;">${modal.title}</h3>
            <p style="font-size:13.5px; color:var(--text-muted); margin:0 0 16px;">${modal.desc}</p>
            <div style="margin-bottom:20px;">
              ${modal.body || ''}
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="btn-outline" data-action="close-modal">Cancel</button>
              <button type="button" class="btn-primary" data-action="confirm-modal" style="width:auto;">${modal.confirmLabel || 'OK'}</button>
            </div>
          </div>
        </div>
      `;
    }

    function render() {
      const root = document.getElementById('app-root');
      if (!root) return;

      let html = '';
      switch (state.currentView) {
        case 'public_lead_form': html = viewPublicLeadForm(); break;
        case 'public_bill_confirm': html = viewPublicBillConfirm(); break;
        case 'public_status': html = viewPublicStatus(); break;
        case 'public_quote': html = viewPublicQuote(); break;
        case 'public_privacy': html = viewPublicPrivacy(); break;
        case 'login': html = viewLogin(); break;
        case 'founder_dashboard': html = viewFounderDashboard(); break;
        case 'founder_approvals': html = viewFounderApprovals(); break;
        case 'sales_leads': html = viewSalesLeads(); break;
        case 'sales_lead_detail': html = viewSalesLeadDetail(); break;
        case 'sales_calls': html = viewSalesCalls(); break;
        case 'coordinator_projects': html = viewCoordinatorProjects(); break;
        case 'coordinator_project_detail': html = viewCoordinatorProjectDetail(); break;
        case 'admin_rules': html = viewAdminRules(); break;
        default: html = viewPublicLeadForm();
      }

      if (state.modal) {
        html += renderModal(state.modal);
      }

      root.innerHTML = html;
      bindEvents();


    }

    function bindEvents() {
      const root = document.getElementById('app-root');

      // Navigation clicks
      root.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          const view = el.getAttribute('data-nav');
          const id = el.getAttribute('data-lead-id');
          navigate(view, id ? Number(id) : null);
        });
      });

      // Language Switcher (Preserves inputs & live re-renders in EN, MR, HI)
      root.querySelectorAll('[data-set-lang]').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          preserveLeadFormInputs();
          state.lang = el.getAttribute('data-set-lang');
          render();
        });
      });

      // Dual Tab Switcher on Homeowner Page
      root.querySelectorAll('[data-action="switch-home-tab"]').forEach(btn => {
        btn.addEventListener('click', () => {
          preserveLeadFormInputs();
          state.homeownerTab = btn.getAttribute('data-tab');
          render();
        });
      });

      // Open Customer Status
      root.querySelectorAll('[data-action="open-customer"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-lead-id')) || 1;
          state.selectedLeadId = id;
          navigate('public_status', id);
        });
      });

      // Track Mobile Login Form
      const trackForm = document.getElementById('track-login-form');
      if (trackForm) {
        trackForm.addEventListener('submit', e => {
          e.preventDefault();
          const mob = document.getElementById('track-mobile').value.trim();
          const found = state.leads.find(l => l.mobile === mob) || state.leads[0];
          state.selectedLeadId = found.id;
          navigate('public_status', found.id);
        });
      }

      // Ownership Segmented Card Click
      const cardOwner = document.getElementById('card-own-owner');
      const cardTenant = document.getElementById('card-own-tenant');
      if (cardOwner && cardTenant) {
        cardOwner.addEventListener('click', () => {
          cardOwner.classList.add('selected');
          cardTenant.classList.remove('selected');
          state.liveSizing.ownership = 'owner';
          const r = cardOwner.querySelector('input[type="radio"]');
          if (r) r.checked = true;
          updateLiveSizer();
        });
        cardTenant.addEventListener('click', () => {
          cardTenant.classList.add('selected');
          cardOwner.classList.remove('selected');
          state.liveSizing.ownership = 'tenant';
          const r = cardTenant.querySelector('input[type="radio"]');
          if (r) r.checked = true;
          updateLiveSizer();
        });
      }

      // Roof Option Cards
      root.querySelectorAll('[data-action="set-roof"]').forEach(card => {
        card.addEventListener('click', () => {
          const val = card.getAttribute('data-roof');
          state.liveSizing.roof_type = val;
          const inp = document.getElementById('pf-roof');
          if (inp) inp.value = val;
          root.querySelectorAll('[data-action="set-roof"]').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');

          const manualInp = document.getElementById('pf-roof-manual');
          if (manualInp && val !== 'custom') {
            if (val === 'flat_slab') manualInp.value = 'Flat RCC Slab terrace';
            else if (val === 'tin_sheet') manualInp.value = 'Tin / Metal corrugated sheet';
            else if (val === 'tiled') manualInp.value = 'Tiled / Slanted roof structure';
            state.liveSizing.roof_type_custom = manualInp.value;
          }
        });
      });

      const manualRoofInp = document.getElementById('pf-roof-manual');
      if (manualRoofInp) {
        manualRoofInp.addEventListener('input', () => {
          state.liveSizing.roof_type_custom = manualRoofInp.value;
          state.liveSizing.roof_type = 'custom';
          const hiddenRoof = document.getElementById('pf-roof');
          if (hiddenRoof) hiddenRoof.value = 'custom';
        });
      }

      // Capacity Chips on Front Sizer
      root.querySelectorAll('[data-action="set-kw"]').forEach(chip => {
        chip.addEventListener('click', () => {
          const kw = Number(chip.getAttribute('data-kw')) || 3;
          state.liveSizing.selected_kw = kw;
          updateLiveSizer();
          root.querySelectorAll('[data-action="set-kw"]').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const slider = document.getElementById('live-kw-slider');
          if (slider) slider.value = kw;
        });
      });

      // Range Slider on Front Sizer
      const slider = document.getElementById('live-kw-slider');
      if (slider) {
        slider.addEventListener('input', e => {
          const kw = Number(e.target.value) || 3;
          state.liveSizing.selected_kw = kw;
          updateLiveSizer();
          root.querySelectorAll('[data-action="set-kw"]').forEach(c => {
            c.classList.toggle('active', Number(c.getAttribute('data-kw')) === kw);
          });
        });
      }

      // Quick Bill & Area buttons
      root.querySelectorAll('[data-action="set-bill"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = Number(btn.getAttribute('data-val'));
          const inp = document.getElementById('pf-bill');
          if (inp) {
            inp.value = val;
            state.liveSizing.monthly_bill = val;
            updateLiveSizer();
          }
        });
      });

      root.querySelectorAll('[data-action="add-area"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const delta = Number(btn.getAttribute('data-delta'));
          const inp = document.getElementById('pf-area');
          if (inp) {
            const nv = (Number(inp.value) || 350) + delta;
            inp.value = nv;
            state.liveSizing.free_roof_area = nv;
            updateLiveSizer();
          }
        });
      });

      root.querySelectorAll('[data-action="set-area"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = Number(btn.getAttribute('data-val'));
          const inp = document.getElementById('pf-area');
          if (inp) {
            inp.value = val;
            state.liveSizing.free_roof_area = val;
            updateLiveSizer();
          }
        });
      });

      // Load Sample Bills
      root.querySelectorAll('[data-action="load-sample"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sampleKey = btn.getAttribute('data-sample');
          simulateAiScan(sampleKey);
        });
      });

      // File Drop Zone input
      const fileInput = document.getElementById('pf-file-input');
      if (fileInput) {
        fileInput.addEventListener('change', e => {
          if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            simulateAiScan(f.name);
          }
        });
      }

      // Continuous Input Syncing
      const pfName = document.getElementById('pf-name');
      if (pfName) pfName.addEventListener('input', () => { state.liveSizing.name = pfName.value; });
      const pfMob = document.getElementById('pf-mobile');
      if (pfMob) pfMob.addEventListener('input', () => { state.liveSizing.mobile = pfMob.value; });
      const pfArea = document.getElementById('pf-area');
      if (pfArea) pfArea.addEventListener('input', () => { state.liveSizing.free_roof_area = Number(pfArea.value) || 350; updateLiveSizer(); });
      const pfBill = document.getElementById('pf-bill');
      if (pfBill) pfBill.addEventListener('input', () => { state.liveSizing.monthly_bill = Number(pfBill.value) || 3200; updateLiveSizer(); });
      const pfPin = document.getElementById('pf-pin');
      if (pfPin) pfPin.addEventListener('input', () => { state.liveSizing.pincode = pfPin.value; });

      // Lead Form Submit
      const leadForm = document.getElementById('lead-assessment-form');
      if (leadForm) {
        leadForm.addEventListener('submit', e => {
          e.preventDefault();
          preserveLeadFormInputs();
          const newLead = {
            id: state.leads.length + 1,
            lead_code: 'LD-309' + (state.leads.length + 10),
            name: state.liveSizing.name,
            mobile: state.liveSizing.mobile,
            ownership: state.liveSizing.ownership,
            segment: 'home',
            roof_type: state.liveSizing.roof_type,
            free_roof_area: state.liveSizing.free_roof_area,
            monthly_bill: state.liveSizing.monthly_bill,
            pincode: state.liveSizing.pincode,
            consumer_no: state.liveSizing.aiDetails.consumer_no,
            tariff_category: state.liveSizing.aiDetails.tariff,
            sanctioned_load_kw: state.liveSizing.aiDetails.sanctioned_load,
            monthly_units: state.liveSizing.aiDetails.monthly_units,
            score: state.liveSizing.ownership === 'tenant' ? 'Low' : 'High'
          };
          state.leads.push(newLead);
          state.selectedLeadId = newLead.id;
          navigate('public_bill_confirm', newLead.id);
        });
      }

      // Quote Builder interactive inputs
      root.querySelectorAll('[data-action="set-qb-kw"]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.qbState.kw = Number(btn.getAttribute('data-kw')) || 3;
          render();
        });
      });

      const qbSeg = document.getElementById('qb-segment');
      if (qbSeg) {
        qbSeg.addEventListener('change', () => {
          state.qbState.segment = qbSeg.value;
          render();
        });
      }

      const qbDisc = document.getElementById('qb-discount');
      if (qbDisc) {
        qbDisc.addEventListener('input', () => {
          state.qbState.discount = Number(qbDisc.value) || 0;
          const alertBox = document.getElementById('qb-approval-alert');
          if (alertBox) {
            alertBox.style.display = state.qbState.discount > 10000 ? 'flex' : 'none';
          }
        });
      }

      // Advance Payment Booking Modal
      root.querySelectorAll('[data-action="pay-advance"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const amt = btn.getAttribute('data-amount') || '₹10,800';
          state.modal = {
            title: 'Simulate Advance Payment & Confirm Booking',
            desc: 'Secure your PM Surya Ghar installation slot with a 10% booking deposit.',
            body: `
              <div style="padding:14px; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:8px; margin-bottom:14px;">
                <div style="font-size:13px; font-weight:700; color:#065F46;">Amount Due: ${amt}</div>
                <div style="font-size:12px; color:#047857;">MSEDCL Grid-Tie Net-Metering Slot Reserved</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:13px;"><input type="radio" name="pay-method" checked> UPI / QR Code (Google Pay, PhonePe, Paytm)</label>
                <label style="display:flex; align-items:center; gap:8px; font-size:13px;"><input type="radio" name="pay-method"> Net Banking (SBI, HDFC, ICICI, Axis)</label>
                <label style="display:flex; align-items:center; gap:8px; font-size:13px;"><input type="radio" name="pay-method"> Debit / Credit Card</label>
              </div>
            `,
            confirmLabel: 'Confirm Payment (' + amt + ')',
            onConfirm: () => {
              state.modal = null;
              navigate('public_status');
            }
          };
          render();
        });
      });

      // Fill Login Credentials and submit/navigate
      root.querySelectorAll('[data-action="fill-login"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const role = btn.getAttribute('data-role');
          const email = btn.getAttribute('data-email');
          const emailInp = document.getElementById('login-email');
          const passInp = document.getElementById('login-password');
          if (emailInp) emailInp.value = email;
          if (passInp) passInp.value = 'solar123';
          
          state.currentUser = { full_name: role.toUpperCase() + ' User', role: role, email: email };
          if (role === 'founder') navigate('founder_dashboard');
          else if (role === 'sales') navigate('sales_leads');
          else if (role === 'coordinator') navigate('coordinator_projects');
          else navigate('admin_rules');
        });
      });

      // Staff Login Form Submit
      const staffForm = document.getElementById('staff-login-form');
      if (staffForm) {
        staffForm.addEventListener('submit', e => {
          e.preventDefault();
          const email = (document.getElementById('login-email').value || 'sales@companya.in').toLowerCase().trim();
          let role = 'sales';
          if (email.includes('founder') || email.includes('md')) role = 'founder';
          else if (email.includes('coord')) role = 'coordinator';
          else if (email.includes('admin')) role = 'admin';

          state.currentUser = { full_name: role.toUpperCase() + ' User', role: role, email: email };
          if (role === 'founder') navigate('founder_dashboard');
          else if (role === 'sales') navigate('sales_leads');
          else if (role === 'coordinator') navigate('coordinator_projects');
          else navigate('admin_rules');
        });
      }

      // Toggle Admin Forms
      root.querySelectorAll('[data-action="toggle-admin-form"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const box = document.getElementById(targetId);
          if (box) {
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
          }
        });
      });

      // Save Mock Rule Action
      root.querySelectorAll('[data-action="save-mock-rule"]').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.textContent = 'Rule Saved & Predecessor Closed ✓';
          btn.style.background = '#059669';
          btn.disabled = true;
        });
      });

      // Staff Logout
      root.querySelectorAll('[data-action="staff-logout"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          state.currentUser = null;
          navigate('login');
        });
      });

      // Modal buttons
      root.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.modal = null;
          render();
        });
      });

      root.querySelectorAll('[data-action="confirm-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (state.modal && state.modal.onConfirm) state.modal.onConfirm();
          else {
            state.modal = null;
            render();
          }
        });
      });

      // Return to Staff Workspace from Homeowner views
      root.querySelectorAll('[data-action="back-to-staff"]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!state.currentUser) {
            navigate('login');
            return;
          }
          const role = state.currentUser.role;
          if (role === 'founder') navigate('founder_dashboard');
          else if (role === 'sales') navigate('sales_leads');
          else if (role === 'coordinator') navigate('coordinator_projects');
          else navigate('admin_rules');
        });
      });

      // Approve Quote Action
      root.querySelectorAll('[data-action="approve-quote"]').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.textContent = 'Approved ✓';
          btn.style.background = '#059669';
          btn.disabled = true;
        });
      });

      // Advance Project Stage Action
      root.querySelectorAll('[data-action="advance-stage"]').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.textContent = 'Advanced to Installation ✓';
          btn.style.background = '#059669';
          btn.disabled = true;
        });
      });

      // Save Lead Next Step Override in Staff Lead Detail
      root.querySelectorAll('[data-action="save-lead-step"]').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.textContent = 'Saved ✓';
          btn.style.background = '#059669';
          btn.style.color = '#FFFFFF';
        });
      });

      // Record Survey Outcome in Staff Lead Detail
      root.querySelectorAll('[data-action="save-survey-outcome"]').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.textContent = 'Survey Recorded ✓ (KPIs Updated)';
          btn.style.background = '#059669';
          btn.disabled = true;
        });
      });
    }

    function simulateAiScan(sampleKey) {
      const dropZone = document.getElementById('ai-file-dropzone');
      if (dropZone) dropZone.classList.add('scanning');

      setTimeout(() => {
        if (dropZone) dropZone.classList.remove('scanning');
        const isPoor = sampleKey.includes('blur') || sampleKey.includes('poor');
        if (isPoor) {
          state.liveSizing.aiDetails = { consumer_no: 'UNREADABLE', tariff: 'UNREADABLE', sanctioned_load: 0, monthly_units: 0 };
          const cno = document.getElementById('ai-disp-cno');
          if (cno) cno.textContent = 'UNREADABLE (Blurry)';
          const t = document.getElementById('ai-disp-tariff');
          if (t) t.textContent = 'Photo Quality Low';
        } else if (sampleKey.includes('haldiram')) {
          state.liveSizing.aiDetails = { consumer_no: '410018501923', tariff: 'LT-II Commercial', sanctioned_load: 10.0, monthly_units: 1180 };
          syncAiDisplay();
        } else if (sampleKey.includes('ayesha')) {
          state.liveSizing.aiDetails = { consumer_no: '410019150021', tariff: 'LT-I Residential', sanctioned_load: 2.0, monthly_units: 85 };
          syncAiDisplay();
        } else if (sampleKey.includes('rohit')) {
          state.liveSizing.aiDetails = { consumer_no: '410019020491', tariff: 'LT-I Residential', sanctioned_load: 3.0, monthly_units: 210 };
          syncAiDisplay();
        } else {
          state.liveSizing.aiDetails = { consumer_no: '410018294801', tariff: 'LT-I Residential', sanctioned_load: 3.0, monthly_units: 340 };
          syncAiDisplay();
        }
      }, 600);
    }

    function syncAiDisplay() {
      const d = state.liveSizing.aiDetails;
      const cno = document.getElementById('ai-disp-cno');
      if (cno) cno.textContent = d.consumer_no;
      const tf = document.getElementById('ai-disp-tariff');
      if (tf) tf.textContent = d.tariff;
      const ld = document.getElementById('ai-disp-load');
      if (ld) ld.textContent = d.sanctioned_load + ' kW';
      const un = document.getElementById('ai-disp-units');
      if (un) un.textContent = d.monthly_units + ' kWh';
    }

    function updateLiveSizer() {
      const s = state.liveSizing;
      const kw = s.selected_kw || 3;
      const isOwner = s.ownership === 'owner';
      const math = calcSystemMath(kw, isOwner ? 'home' : 'home', s.monthly_bill, null, 0);

      const dKw = document.getElementById('disp-kw');
      if (dKw) dKw.textContent = kw + ' kW';
      const dSub = document.getElementById('disp-sub');
      if (dSub) dSub.textContent = formatInr(math.subsidy);
      const dNet = document.getElementById('disp-net');
      if (dNet) dNet.textContent = formatInr(math.netCost);
      const dSave = document.getElementById('disp-save');
      if (dSave) dSave.textContent = formatInr(math.annualSaving) + ' / ' + t('per_year');

      const areaBadge = document.getElementById('area-rec-badge');
      if (areaBadge) areaBadge.textContent = '~' + Math.round(s.free_roof_area / 100) + ' kW capacity';
    }

    // Initial Launch
    document.addEventListener('DOMContentLoaded', () => {
      render();


    });
