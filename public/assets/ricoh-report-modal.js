/**
 * TCF InfraCore - Ricoh User & Device Activity Report Engine
 * High-Tech Executive Modal, Real-time Stats, Document History & Excel Export
 */

(function () {
  if (window.__RICOH_REPORT_MODAL_V2_LOADED) return;
  window.__RICOH_REPORT_MODAL_V2_LOADED = true;

  // Session Token helper
  function getAuthToken() {
    try {
      const match = document.cookie.match(new RegExp('(^| )pa_session=([^;]+)'));
      if (match) return match[2];
      const local = localStorage.getItem('token') || localStorage.getItem('pa_token') || sessionStorage.getItem('token');
      if (local) return local;
    } catch (e) {}
    return '';
  }

  // Active Organization / Plant helper (SG vs KG)
  function getCurrentOrg() {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (user && user.role && !['super_user', 'superuser', 'administrator', 'admin'].includes(user.role.toLowerCase()) && user.organization) {
        return user.organization;
      }
    } catch (e) {}
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('org') || sessionStorage.getItem('organization') || localStorage.getItem('organization') || 'TCF-SG';
  }

  // Inject Modal Root if missing
  let modalContainer = document.getElementById('ricoh-user-report-modal-root');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'ricoh-user-report-modal-root';
    document.body.appendChild(modalContainer);
  }

  let currentReportData = null;
  let currentSearchQuery = '';

  window.openRicohUserReport = async function (computerName, userName) {
    const query = computerName || userName;
    if (!query) return;

    const org = getCurrentOrg();
    renderLoadingModal(query, org);

    try {
      const token = getAuthToken();
      const headers = token ? { 'Authorization': 'Bearer ' + token, 'X-Organization': org } : { 'X-Organization': org };
      const url = `/api/ricoh/reports/user-details?computer_name=${encodeURIComponent(computerName || '')}&user_name=${encodeURIComponent(userName || '')}&org=${encodeURIComponent(org)}`;
      
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat data laporan aktivasi`);
      }
      const data = await res.json();
      currentReportData = data;
      currentReportData._currentOrg = org;
      currentSearchQuery = '';
      renderReportModal(data);
    } catch (err) {
      renderErrorModal(query, err.message);
    }
  };

  function renderLoadingModal(title, org) {
    const orgLabel = (org || getCurrentOrg()) === 'TCF-KG' ? 'KG (Karawang)' : 'SG (Sadang)';
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
            <div class="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <div>
            <h3 class="font-black text-slate-800 text-base">Memuat Aktivitas Cetak (${orgLabel})</h3>
            <p class="text-xs font-mono font-bold text-blue-600 mt-1">${escapeHtml(title)}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderErrorModal(title, errorMsg) {
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onclick="window.closeRicohUserReport()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full text-center" onclick="event.stopPropagation()">
          <div class="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h3 class="font-black text-slate-800 text-base">Gagal Membuka Laporan</h3>
          <p class="text-xs text-slate-500 mt-1 font-mono">${escapeHtml(title)}</p>
          <p class="text-xs text-rose-600 font-semibold mt-2">${escapeHtml(errorMsg)}</p>
          <button onclick="window.closeRicohUserReport()" class="mt-5 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition-all">
            Tutup
          </button>
        </div>
      </div>
    `;
  }

  window.closeRicohUserReport = function () {
    modalContainer.innerHTML = '';
    currentReportData = null;
  };

  window.exportCurrentUserExcel = function () {
    if (!currentReportData || !currentReportData.profile) return;
    const compName = currentReportData.profile.computer_name;
    const userName = currentReportData.profile.user_name || currentReportData.profile.contact;
    const org = currentReportData._currentOrg || getCurrentOrg();
    const token = getAuthToken();
    const url = `/api/ricoh/reports/user-details/export?computer_name=${encodeURIComponent(compName || '')}&user_name=${encodeURIComponent(userName || '')}&org=${encodeURIComponent(org)}`;

    const btn = document.getElementById('btn-export-excel-modal');
    if (btn) {
      btn.innerText = 'Mengunduh...';
      btn.disabled = true;
    }

    fetch(url, { headers: token ? { 'Authorization': 'Bearer ' + token, 'X-Organization': org } : { 'X-Organization': org } })
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengunduh file Excel');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const orgLabel = org === 'TCF-KG' ? 'KG' : 'SG';
        const filename = `Report_Print_${orgLabel}_${compName || userName || 'User'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        if (btn) {
          btn.innerHTML = '✓ Terunduh';
          setTimeout(() => {
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg><span class="hidden sm:inline">Export Excel</span>`;
            btn.disabled = false;
          }, 2000);
        }
      })
      .catch(err => {
        alert('Gagal mengunduh Excel: ' + err.message);
        if (btn) {
          btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg><span class="hidden sm:inline">Export Excel</span>`;
          btn.disabled = false;
        }
      });
  };

  window.filterReportJobs = function (query) {
    currentSearchQuery = (query || '').toLowerCase().trim();
    const tbody = document.getElementById('report-jobs-tbody');
    const emptyRow = document.getElementById('report-jobs-empty');
    if (!tbody || !currentReportData) return;

    let matchCount = 0;
    tbody.querySelectorAll('tr[data-job]').forEach(tr => {
      const text = tr.innerText.toLowerCase();
      if (text.includes(currentSearchQuery)) {
        tr.style.display = '';
        matchCount++;
      } else {
        tr.style.display = 'none';
      }
    });

    if (emptyRow) {
      emptyRow.style.display = matchCount === 0 ? '' : 'none';
    }
  };

  function renderReportModal(data) {
    const p = data.profile || {};
    const s = data.stats || {};
    const jobs = data.jobs || [];

    const activeOrg = data._currentOrg || getCurrentOrg();
    const plantBadgeText = activeOrg === 'TCF-KG' ? 'Plant Karawang (KG)' : 'Plant Sadang (SG)';

    const isLocked = p.status === 'locked';
    const isCopyLocked = p.copier_status === 'locked';

    const quotaBwPct = Math.min(Math.round(((p.current_usage_bw || 0) / (p.monthly_quota_bw || 1)) * 100), 100);
    const quotaColorPct = Math.min(Math.round(((p.current_usage_color || 0) / (p.monthly_quota_color || 1)) * 100), 100);
    const currentCopyTotal = (Number(p.current_usage_copier_bw) || 0) + (Number(p.current_usage_copier_color) || 0);
    const quotaCopyPct = Math.min(Math.round((currentCopyTotal / (p.monthly_quota_copier || 1)) * 100), 100);

    const jobsRowsHtml = jobs.length > 0 ? jobs.map((j) => {
      const dt = j.created_at ? new Date(j.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : (j.timestamp || '-');
      const isComplete = (j.status || '').toLowerCase().includes('complete') || (j.status || '').toLowerCase().includes('success');
      const loginInfo = j.user_name || j.user_id ? `${escapeHtml(j.user_name || '-')}${j.user_id ? ' (' + escapeHtml(j.user_id) + ')' : ''}` : '';
      return `
        <tr data-job class="hover:bg-blue-50/50 transition-colors border-b border-slate-100 text-[11px]">
          <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[10px]">${dt}</td>
          <td class="py-2.5 px-3 font-bold text-slate-800 max-w-[280px]" title="${escapeHtml(j.document_name || 'Document')}">
            <div class="truncate flex items-center gap-1.5">
              <span class="text-blue-500">📄</span>
              <span>${escapeHtml(j.document_name || 'Dokumen Tanpa Nama')}</span>
            </div>
            ${loginInfo ? `<span class="text-[9px] text-slate-400 font-mono block mt-0.5">PC / Login: ${loginInfo}</span>` : ''}
          </td>
          <td class="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap text-[10px] font-mono">${escapeHtml(j.printer_name || j.printer_ip || 'TCF-SG')}</td>
          <td class="py-2.5 px-3 text-center">
            <span class="inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
              ${Number(j.pages || 1).toLocaleString()} lbr
            </span>
          </td>
          <td class="py-2.5 px-3 text-right">
            <span class="inline-block px-2 py-0.5 rounded-md font-bold text-[9px] ${isComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
              ${escapeHtml(j.status || 'Success')}
            </span>
          </td>
        </tr>
      `;
    }).join('') : `
      <tr id="report-jobs-empty">
        <td colspan="5" class="py-10 text-center text-slate-400 text-xs font-semibold">
          Belum ada riwayat dokumen cetak yang tercatat untuk perangkat/user ini.
        </td>
      </tr>
    `;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onclick="window.closeRicohUserReport()">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up" onclick="event.stopPropagation()">
          <div class="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
            <div class="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl pointer-events-none"></div>
            
            <div class="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30 shrink-0">
                💻
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-base sm:text-xl font-black tracking-tight text-white truncate font-mono">
                    ${escapeHtml(p.computer_name || 'Device')}
                  </h2>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isLocked ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'}">
                    ${isLocked ? 'Blocked' : 'Allowed'}
                  </span>
                  ${p.user_code ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/25 text-purple-300 border border-purple-500/40 font-mono">PIN: ${escapeHtml(p.user_code)}</span>` : ''}
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${activeOrg === 'TCF-KG' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'} flex items-center gap-1 font-mono">
                    <span class="w-1.5 h-1.5 rounded-full ${activeOrg === 'TCF-KG' ? 'bg-amber-400' : 'bg-cyan-400'} animate-pulse"></span>
                    ${escapeHtml(plantBadgeText)}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-300 font-medium">
                  <span class="font-bold text-white flex items-center gap-1">👤 ${escapeHtml(p.user_name || p.contact || 'User')}</span>
                  <span>•</span>
                  <span class="text-indigo-300 font-semibold">🏢 ${escapeHtml(p.department || 'General')}</span>
                  ${p.user_whatsapp ? `<span>•</span><span class="text-emerald-400 font-bold flex items-center gap-1">📱 ${escapeHtml(p.user_whatsapp)}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 relative z-10 shrink-0">
              <button id="btn-export-excel-modal" onclick="window.exportCurrentUserExcel()" class="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer" title="Unduh Riwayat & Ringkasan ke Excel">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span class="hidden sm:inline">Export Excel</span>
              </button>
              <button onclick="window.closeRicohUserReport()" class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all text-sm font-bold cursor-pointer" title="Tutup">
                ✕
              </button>
            </div>
          </div>
          <div class="p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#F8FAFC] flex-1">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Cetak Hari Ini</span>
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div class="mt-2 flex items-baseline gap-1.5">
                  <span class="text-xl sm:text-2xl font-black text-slate-900">${Number(s.today_pages || 0).toLocaleString()}</span>
                  <span class="text-[11px] font-bold text-slate-500">lbr</span>
                </div>
                <span class="text-[10px] text-slate-400 font-semibold mt-1">${Number(s.today_jobs || 0).toLocaleString()} dokumen hari ini</span>
              </div>
              <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">7 Hari Terakhir</span>
                <div class="mt-2 flex items-baseline gap-1.5">
                  <span class="text-xl sm:text-2xl font-black text-blue-600">${Number(s.week_pages || 0).toLocaleString()}</span>
                  <span class="text-[11px] font-bold text-slate-500">lbr</span>
                </div>
                <span class="text-[10px] text-slate-400 font-semibold mt-1">${Number(s.week_jobs || 0).toLocaleString()} dokumen seminggu</span>
              </div>
              <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Siklus Bulan Ini</span>
                <div class="mt-2 flex items-baseline gap-1.5">
                  <span class="text-xl sm:text-2xl font-black text-purple-600">${Number(p.total_usage_cycle || 0).toLocaleString()}</span>
                  <span class="text-[11px] font-bold text-slate-500">lbr</span>
                </div>
                <span class="text-[10px] text-purple-600 font-bold mt-1">Periode Tgl 21 s/d 21</span>
              </div>
              <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Status Akses Mesin</span>
                <div class="mt-2 flex items-center gap-2">
                  <span class="text-sm sm:text-base font-black ${isLocked ? 'text-rose-600' : 'text-emerald-600'}">
                    ${isLocked ? '⛔ DIBLOKIR' : '✅ DIIZINKAN'}
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 font-medium mt-1">
                  Fotokopi: ${isCopyLocked ? '<span class="text-rose-600 font-bold">Terkunci</span>' : '<span class="text-emerald-600 font-bold">Aktif</span>'}
                </span>
              </div>

            </div>
            <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Rincian Kuota Bulanan (B/W, Warna & Fotokopi)</span>
                <span class="text-[10px] font-bold text-slate-400">Periode Aktif</span>
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
                  <div class="flex justify-between text-xs font-bold mb-1.5">
                    <span class="text-slate-600">Print Hitam Putih (B/W)</span>
                    <span class="font-black text-slate-900">${quotaBwPct}%</span>
                  </div>
                  <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-slate-600 to-slate-900 rounded-full" style="width: ${quotaBwPct}%"></div>
                  </div>
                  <div class="text-[10px] font-bold text-slate-500 mt-1 flex justify-between">
                    <span>${Number(p.current_usage_bw || 0).toLocaleString()} lembar</span>
                    <span>/ ${Number(p.monthly_quota_bw || 1000).toLocaleString()} maks</span>
                  </div>
                </div>
                <div class="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
                  <div class="flex justify-between text-xs font-bold mb-1.5">
                    <span class="text-indigo-600">Print Berwarna (Color)</span>
                    <span class="font-black text-indigo-700">${quotaColorPct}%</span>
                  </div>
                  <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style="width: ${quotaColorPct}%"></div>
                  </div>
                  <div class="text-[10px] font-bold text-slate-500 mt-1 flex justify-between">
                    <span>${Number(p.current_usage_color || 0).toLocaleString()} lembar</span>
                    <span>/ ${Number(p.monthly_quota_color || 500).toLocaleString()} maks</span>
                  </div>
                </div>
                <div class="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
                  <div class="flex justify-between text-xs font-bold mb-1.5">
                    <span class="text-teal-600">Fotokopi Kaca</span>
                    <span class="font-black text-teal-700">${quotaCopyPct}%</span>
                  </div>
                  <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full" style="width: ${quotaCopyPct}%"></div>
                  </div>
                  <div class="text-[10px] font-bold text-slate-500 mt-1 flex justify-between">
                    <span>${currentCopyTotal.toLocaleString()} lembar <span class="text-slate-400 font-normal">(${Number(p.current_usage_copier_bw || 0)} BW${Number(p.current_usage_copier_color || 0) > 0 ? ` • ${Number(p.current_usage_copier_color)} Col` : ''})</span></span>
                    <span>/ ${Number(p.monthly_quota_copier || 200).toLocaleString()} maks</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div class="p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-black uppercase tracking-wider text-slate-800">Riwayat Dokumen Yang Dicetak</h4>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    ${jobs.length} Dokumen
                  </span>
                </div>
                <div class="relative w-full sm:w-64">
                  <input 
                    type="text" 
                    placeholder="Cari nama dokumen / file..." 
                    oninput="window.filterReportJobs(this.value)"
                    class="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div class="overflow-x-auto max-h-72 overflow-y-auto">
                <table class="w-full text-left">
                  <thead class="bg-slate-50/80 sticky top-0 border-b border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-wider">
                    <tr>
                      <th class="py-2.5 px-3">Waktu</th>
                      <th class="py-2.5 px-3">Nama Dokumen / File</th>
                      <th class="py-2.5 px-3">Printer</th>
                      <th class="py-2.5 px-3 text-center">Halaman</th>
                      <th class="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody id="report-jobs-tbody">
                    ${jobsRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
          <div class="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
            <span class="text-[11px] text-slate-500 font-medium hidden sm:inline">
              💡 Klik tombol <b>Export Excel</b> untuk mengunduh laporan lengkap riwayat cetak ini.
            </span>
            <div class="flex items-center gap-2 ml-auto">
              <button onclick="window.closeRicohUserReport()" class="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                Tutup
              </button>
              <button onclick="window.exportCurrentUserExcel()" class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer">
                📥 Unduh Excel (.xlsx)
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Keyboard shortcut: Escape to close modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      window.closeRicohUserReport();
    }
  });

  // Global delegated click listener
  document.addEventListener('click', function (e) {
    const target = e.target;

    // Check if clicked our custom report trigger button
    const reportBtn = target.closest('.ricoh-report-btn, [data-ricoh-user-report]');
    if (reportBtn) {
      e.preventDefault();
      e.stopPropagation();
      const comp = reportBtn.getAttribute('data-computer') || '';
      const user = reportBtn.getAttribute('data-user') || '';
      window.openRicohUserReport(comp, user);
      return;
    }

    // Check if clicked computer name link
    const link = target.closest('a[title*="Power Asset"], a[title*="Inventory"], a[href*="/ict/assets/"]');
    if (link) {
      // Allow opening report directly by clicking on device name
      const compName = link.innerText.trim();
      if (compName && compName.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
        window.openRicohUserReport(compName);
        return;
      }
    }

    // Check if clicked on a table row's device name or user cell
    const cell = target.closest('td');
    if (cell && cell.parentElement && cell.parentElement.closest('table')) {
      // If clicked the device/user header cell (first column)
      if (cell === cell.parentElement.children[0]) {
        const textEl = cell.querySelector('span.font-black, a');
        if (textEl && textEl.innerText) {
          const compName = textEl.innerText.trim();
          if (compName && compName.length >= 3 && !compName.includes('%') && !compName.includes('BW') && !compName.includes('PAGES')) {
            // If user clicked directly on the laptop icon or name
            if (target === textEl || target.closest('.w-12.h-12') || target.closest('.w-9.h-9') || target.closest('.flex.flex-col')) {
              e.preventDefault();
              e.stopPropagation();
              window.openRicohUserReport(compName);
            }
          }
        }
      }
    }
  });

  // Dynamic Row Enhancer: Injects a sleek [📊 Laporan] button into Controls column of every row
  function enhanceRicohTableRows() {
    try {
      const rows = document.querySelectorAll('table tbody tr');
      rows.forEach(tr => {
        // Skip if already enhanced
        if (tr.hasAttribute('data-ricoh-enhanced')) return;

        // Try to identify computer name or user name in first cell
        const firstCell = tr.children[0];
        if (!firstCell) return;

        const nameEl = firstCell.querySelector('a, span.font-black, span.font-bold');
        if (!nameEl) return;
        const nameText = nameEl.innerText.trim();
        if (!nameText || nameText.includes('%') || nameText.includes('BW')) return;

        // Mark as enhanced
        tr.setAttribute('data-ricoh-enhanced', 'true');

        // Style the name to indicate it is clickable
        nameEl.style.cursor = 'pointer';
        nameEl.setAttribute('title', 'Klik untuk melihat Laporan Aktivitas Cetak Lengkap');

        // Clean up messy Postgres IP formatting {"192.4.1.99","..."}
        firstCell.querySelectorAll('span, div').forEach(el => {
          if (el.innerText && el.innerText.startsWith('{"') && el.innerText.endsWith('"}')) {
            try {
              const cleaned = el.innerText.replace(/[{}"]/g, '').split(',').join(' • ');
              el.innerText = cleaned;
              el.style.wordBreak = 'break-all';
            } catch (e) {}
          }
        });

        // Find controls column (last cell)
        const lastCell = tr.children[tr.children.length - 1];
        if (lastCell) {
          const buttonGroup = lastCell.querySelector('.flex.justify-end, .inline-flex');
          if (buttonGroup && !buttonGroup.querySelector('.ricoh-report-btn') && !buttonGroup.querySelector('button[title*="Laporan"]')) {
            // Create sleek modern report button
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ricoh-report-btn px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 text-[10px] font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer mr-1';
            btn.setAttribute('data-computer', nameText);
            btn.setAttribute('title', `Buka Laporan Aktivitas & Riwayat Dokumen Cetak (${nameText})`);
            btn.innerHTML = '<span>📊</span><span class="hidden sm:inline">Laporan</span>';
            buttonGroup.insertBefore(btn, buttonGroup.firstChild);
          }
        }
      });
    } catch (e) {
      // ignore
    }
  }

  // Run enhancer periodically to support live tab changes and search filtering
  setInterval(enhanceRicohTableRows, 800);
  document.addEventListener('DOMContentLoaded', enhanceRicohTableRows);

  console.log('[Ricoh Engine] ✅ Ricoh User & Device Activity Report Engine v2.0 initialized.');
})();
