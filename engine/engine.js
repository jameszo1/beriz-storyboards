/* ===========================================================
   베리즈 스토리보드 공용 엔진 (범용 블록 · 멀티 화면)
   - 화면별 폴더에는 storyboard.json(내용)만 둡니다.
   - index.html 은 이 엔진을 불러오는 껍데기입니다.
   - 스키마는 engine/SCHEMA.md 참고.
   =========================================================== */
(function () {
  'use strict';

  const REPO = { owner: 'jameszo1', name: 'beriz-storyboards', branch: 'main' };
  const PAGES_URL = location.origin + location.pathname;
  let DATA = null;
  let PINS = [];   // [{key, si, bi, label, num}]

  function repoPath() {
    if (window.STORYBOARD && window.STORYBOARD.path) return window.STORYBOARD.path;
    let p = location.pathname.replace(/index\.html$/, '');
    if (!p.endsWith('/')) p += '/';
    const prefix = '/' + REPO.name + '/';
    const dir = p.startsWith(prefix) ? p.slice(prefix.length) : p.replace(/^\//, '');
    return dir + 'storyboard.json';
  }
  const PATH = repoPath();

  /* ===== 유틸 ===== */
  const esc = s => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const $ = id => document.getElementById(id);
  function hashSeed(str){ str = str || 'x'; let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0)||7919; }
  function qrCells(seed){ let rng=seed; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff; let o=''; for(let i=0;i<25;i++) o+=`<i class="${rand()>0.5?'f':''}"></i>`; return o; }
  function toB64(str){ return btoa(unescape(encodeURIComponent(str))); }
  function setStatus(cls, html){ const el=$('deployStatus'); el.className='deploy-status '+cls; el.innerHTML=html; }
  const screens = () => (DATA && Array.isArray(DATA.screens)) ? DATA.screens : [];

  /* ===== 핀 수집 (pin 속성이 있는 블록) ===== */
  function collectPins() {
    PINS = [];
    screens().forEach((sc, si) => (sc.blocks || []).forEach((b, bi) => {
      if (b && b.pin != null) PINS.push({ key: `s${si}b${bi}`, si, bi, label: b.pin, num: PINS.length + 1 });
    }));
    return PINS;
  }
  const pinFor = (si, bi) => PINS.find(p => p.si === si && p.bi === bi);

  /* ===== 블록 렌더 ===== */
  function pinBadge(si, bi) { const p = pinFor(si, bi); return p ? `<span class="pin" data-key="${p.key}">${p.num}</span>` : ''; }

  function blockHtml(b, si, bi) {
    if (!b || !b.type) return '';
    const pin = pinBadge(si, bi);
    let inner = '';
    switch (b.type) {
      case 'text':
        inner = `<div class="blk-text${b.align === 'center' ? ' center' : ''}">${b.title ? `<div class="t">${esc(b.title)}</div>` : ''}${b.sub ? `<div class="s">${esc(b.sub).replace(/\n/g,'<br>')}</div>` : ''}</div>`;
        break;
      case 'image':
        inner = `<div class="ph" style="height:${b.h || 120}px">${esc(b.label || '이미지')}</div>`;
        break;
      case 'list':
        inner = `<div class="list">${(b.items || []).map(it => `<div class="li">${it.avatar ? '<span class="av"></span>' : ''}<div class="li-main"><div class="t">${esc(it.title)}</div>${it.sub ? `<div class="s">${esc(it.sub)}</div>` : ''}</div>${it.trailing ? `<span class="li-tr">${esc(it.trailing)}</span>` : ''}</div>`).join('')}</div>`;
        break;
      case 'card':
        inner = `<div class="card">${b.image ? `<div class="ph card-img">${esc(b.imageLabel || '이미지')}</div>` : ''}<div class="card-body">${b.avatar ? '<span class="av"></span>' : ''}<div class="li-main"><div class="t">${esc(b.title)}</div>${b.sub ? `<div class="s">${esc(b.sub)}</div>` : ''}</div>${b.trailing ? `<span class="li-tr">${esc(b.trailing)}</span>` : ''}</div></div>`;
        break;
      case 'fields':
        inner = `<div class="fields">${(b.rows || []).map(r => `<div class="row"><span class="k">${esc(r[0])}</span><span class="v">${b.badge && r === b.rows[b.badgeRow] ? `<span class="seat-badge">${esc(r[1])}</span>` : esc(r[1])}</span></div>`).join('')}</div>`;
        break;
      case 'button':
        inner = `<div class="btn ${esc(b.style || 'primary')}">${esc(b.text || '버튼')}</div>`;
        break;
      case 'search':
        inner = `<div class="search">🔍 ${esc(b.placeholder || '검색')}</div>`;
        break;
      case 'segmented':
        inner = `<div class="seg">${(b.items || []).map((it, i) => `<span class="${i === (b.active || 0) ? 'on' : ''}">${esc(it)}</span>`).join('')}</div>`;
        break;
      case 'chips':
        inner = `<div class="chips">${(b.items || []).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>`;
        break;
      case 'qr':
        inner = `<div class="qr-area"><div class="qr-label">${esc(b.label || 'QR 코드')}</div><div class="qr">${qrCells(hashSeed(b.code))}</div>${b.code ? `<div class="qr-code">${esc(b.code)}</div>` : ''}</div>`;
        break;
      case 'status': {
        const st = b.state || 'info';
        const ico = st === 'used' ? '✓' : st === 'unused' ? '○' : 'ℹ';
        inner = `<div class="status ${st}"><span class="ico">${ico}</span>${esc(b.text || '')}</div>`;
        break;
      }
      case 'pager':
        inner = `<div class="pager"><div class="dots">${Array.from({length: b.total || 3}).map((_, i) => `<span class="dot${i === (b.active || 0) ? ' on' : ''}"></span>`).join('')}</div><span class="label">${esc(b.label || '')}</span></div>`;
        break;
      case 'bottomnav':
        inner = `<div class="bnav">${(b.items || []).map((it, i) => `<span class="${i === (b.active || 0) ? 'on' : ''}"><span class="ic"></span>${esc(typeof it === 'string' ? it : it.label)}</span>`).join('')}</div>`;
        break;
      case 'note':
        inner = `<div class="note-blk">${esc(b.text || '')}</div>`;
        break;
      case 'divider':
        inner = `<div class="divider"></div>`;
        break;
      case 'spacer':
        inner = `<div style="height:${b.h || 12}px"></div>`;
        break;
      default:
        inner = `<div class="note-blk">알 수 없는 블록: ${esc(b.type)}</div>`;
    }
    return `<div class="blk blk-${esc(b.type)}" data-key="s${si}b${bi}">${pin}${inner}</div>`;
  }

  function appbarHtml(ab) {
    if (!ab) return '';
    return `<div class="appbar">${ab.back === false ? '' : '<span class="back">‹</span>'}<span class="title">${esc(ab.title || '')}</span></div>`;
  }

  /* ===== 화면 플로우 렌더 ===== */
  function renderFlow() {
    collectPins();
    $('flow').innerHTML = screens().map((sc, si) => `
      <div class="screen-col">
        <div class="screen-label">${esc(sc.name || ('화면 ' + (si + 1)))}</div>
        <div class="phone"><div class="screen">
          <div class="statusbar"><span>9:41</span><span class="sys">5G<b class="bat"></b></span></div>
          ${appbarHtml(sc.appbar)}
          <div class="screen-body">${(sc.blocks || []).map((b, bi) => blockHtml(b, si, bi)).join('')}</div>
        </div></div>
      </div>`).join('');
  }

  /* ===== 설명 패널 렌더 (화면별 그룹) ===== */
  function renderDescriptions() {
    const ro = location.search.includes('view');
    $('descList').innerHTML = screens().map((sc, si) => {
      const ps = PINS.filter(p => p.si === si);
      if (!ps.length) return '';
      const blocks = ps.map(p => {
        const desc = (DATA.screens[p.si].blocks[p.bi].desc) || '';
        return `<div class="block" data-key="${p.key}"><span class="tag num">${p.num} ${esc(p.label)}</span>
          <textarea data-si="${p.si}" data-bi="${p.bi}" ${ro ? 'readonly' : ''} placeholder="${esc(p.label)} 설명을 적어주세요">${esc(desc)}</textarea></div>`;
      }).join('');
      return `<div class="desc-screen"><h3>${esc(sc.name || ('화면 ' + (si + 1)))}</h3>${blocks}</div>`;
    }).join('');
  }

  function renderFigma() {
    const inp = $('figmaInput'), lk = $('figmaLink');
    inp.value = DATA.figmaUrl || '';
    const sync = () => { const v = inp.value.trim(); if (v) { lk.href = v; lk.classList.remove('disabled'); } else { lk.removeAttribute('href'); lk.classList.add('disabled'); } };
    inp.addEventListener('input', sync); sync();
    $('dsRef').textContent = DATA.designSystemRef ? '디자인 시스템: ' + DATA.designSystemRef : '';
  }

  function applyMeta() {
    const title = DATA.title || DATA.screen || '스토리보드';
    $('scTitle').textContent = title;
    $('purpose').textContent = DATA.purpose || '';
    document.title = title + ' · 와이어프레임';
  }

  /* ===== 핀 ↔ 설명 연동 ===== */
  function highlight(key, on) {
    document.querySelectorAll(`.block[data-key="${key}"]`).forEach(b => b.classList.toggle('hl', on));
    document.querySelectorAll(`.pin[data-key="${key}"]`).forEach(p => p.classList.toggle('act', on));
  }
  function wirePins() {
    document.querySelectorAll('.pin').forEach(p => {
      const key = p.dataset.key;
      p.addEventListener('mouseenter', () => highlight(key, true));
      p.addEventListener('mouseleave', () => highlight(key, false));
      p.addEventListener('click', () => {
        const b = document.querySelector(`.block[data-key="${key}"]`);
        if (b) { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.classList.add('hl'); setTimeout(() => b.classList.remove('hl'), 1200); }
      });
    });
    document.querySelectorAll('.block[data-key]').forEach(b => {
      const key = b.dataset.key;
      b.addEventListener('mouseenter', () => document.querySelectorAll(`.pin[data-key="${key}"]`).forEach(p => p.classList.add('act')));
      b.addEventListener('mouseleave', () => document.querySelectorAll(`.pin[data-key="${key}"]`).forEach(p => p.classList.remove('act')));
    });
  }

  /* ===== 편집 → DATA 반영 ===== */
  function syncAll() {
    document.querySelectorAll('#descList textarea').forEach(t => {
      const si = +t.dataset.si, bi = +t.dataset.bi;
      if (DATA.screens[si] && DATA.screens[si].blocks[bi]) DATA.screens[si].blocks[bi].desc = t.value;
    });
    DATA.figmaUrl = $('figmaInput').value.trim();
  }

  /* ===== 마크다운 ===== */
  function toMarkdown() {
    syncAll();
    let md = `# ${DATA.title || '스토리보드'} (스토리보드)\n\n`;
    if (DATA.purpose) md += `> **목적**: ${DATA.purpose}\n`;
    md += `> **라이브 화면**: ${PAGES_URL}\n`;
    if (DATA.figmaUrl) md += `> **디자인(Figma)**: ${DATA.figmaUrl}\n`;
    if (DATA.designSystemRef) md += `> **디자인 시스템**: ${DATA.designSystemRef}\n`;
    if (DATA.updatedAt) md += `> **업데이트**: ${DATA.updatedAt}\n`;
    screens().forEach((sc, si) => {
      md += `\n## ${si + 1}. ${sc.name || ('화면 ' + (si + 1))}\n`;
      const ps = PINS.filter(p => p.si === si);
      if (!ps.length) { md += `_(설명 핀 없음)_\n`; return; }
      ps.forEach(p => { md += `\n**${p.num}. ${p.label}**\n${DATA.screens[p.si].blocks[p.bi].desc || '_(설명 없음)_'}\n`; });
    });
    return md;
  }
  async function copyMarkdown() {
    const md = toMarkdown();
    try { await navigator.clipboard.writeText(md); setStatus('ok', '📄 마크다운을 복사했어요. Confluence에 붙여넣으세요.'); }
    catch (e) { setStatus('err', '복사 실패 — 콘솔에 출력했어요(F12).'); console.log(md); }
  }

  /* ===== HTML 다운로드 ===== */
  async function downloadHTML() {
    syncAll();
    let css = '';
    try { css = await (await fetch('../engine/engine.css')).text(); } catch (e) {}
    const clone = $('app').cloneNode(true);
    clone.querySelectorAll('.deploy-bar').forEach(e => e.remove());
    clone.querySelectorAll('.sub-edit').forEach(e => e.remove());
    clone.querySelectorAll('.figma input').forEach(e => e.remove());
    clone.querySelectorAll('textarea').forEach(t => { const p = document.createElement('p'); p.className = 'desc-text'; p.textContent = t.value || '—'; t.replaceWith(p); });
    const stamp = DATA.updatedAt ? ' · ' + DATA.updatedAt.slice(0, 10) : '';
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(DATA.title)} 스토리보드${stamp}</title><style>${css}</style></head><body class="viewer">${clone.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${DATA.title || 'storyboard'}.html`; a.click(); URL.revokeObjectURL(a.href);
    setStatus('ok', '⬇️ HTML 파일을 다운로드했어요. (오프라인 공유·첨부용)');
  }

  /* ===== 수정 이력 ===== */
  let historyLoaded = false;
  async function toggleHistory() {
    const box = $('history'); box.classList.toggle('open');
    if (!box.classList.contains('open') || historyLoaded) return;
    box.innerHTML = '<p class="empty">불러오는 중...</p>';
    try {
      const url = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/commits?path=${encodeURIComponent(PATH)}&per_page=15`;
      const res = await fetch(url); if (!res.ok) throw new Error('이력 조회 실패');
      const commits = await res.json();
      if (!commits.length) { box.innerHTML = '<p class="empty">아직 수정 이력이 없어요.</p>'; historyLoaded = true; return; }
      const items = commits.map(c => { const d = (c.commit.committer.date || '').replace('T', ' ').slice(0, 16); const msg = esc((c.commit.message || '').split('\n')[0]); return `<li><span class="msg">${msg}</span><span class="when">${d}</span><a href="${c.html_url}" target="_blank">보기</a></li>`; }).join('');
      box.innerHTML = `<h4>최근 수정 이력 (GitHub 커밋)</h4><ul>${items}</ul>`; historyLoaded = true;
    } catch (e) { box.innerHTML = '<p class="empty">이력을 불러오지 못했어요. ' + esc(e.message) + '</p>'; }
  }

  /* ===== 토큰 / 배포 ===== */
  const TK = 'beriz-gh-token';
  function saveToken() { const v = $('tokenInput').value.trim(); if (!v) return; localStorage.setItem(TK, v); $('tokenInput').value = ''; setStatus('ok', '✅ 토큰이 저장됐어요.'); }
  function toggleSettings() { $('settings').classList.toggle('open'); if (localStorage.getItem(TK)) $('tokenInput').placeholder = '••• 등록됨 (바꾸려면 입력)'; }

  async function deploy() {
    const token = localStorage.getItem(TK);
    if (!token) { toggleSettings(); setStatus('err', '먼저 ⚙️ 배포 설정에서 토큰을 등록해주세요.'); return; }
    const btn = $('deployBtn'); btn.disabled = true; setStatus('busy', '⏳ 배포 중...');
    syncAll(); DATA.updatedAt = new Date().toISOString();
    const content = toB64(JSON.stringify(DATA, null, 2) + '\n');
    const api = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/contents/${PATH}`;
    const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };
    try {
      let sha; const cur = await fetch(`${api}?ref=${REPO.branch}`, { headers });
      if (cur.ok) sha = (await cur.json()).sha;
      else if (cur.status === 401) throw new Error('토큰이 올바르지 않아요(401).');
      const put = await fetch(api, { method: 'PUT', headers, body: JSON.stringify({ message: '스토리보드 업데이트', content, sha, branch: REPO.branch }) });
      if (!put.ok) { const e = await put.json().catch(() => ({})); throw new Error((e.message || put.status) + ' — 토큰 권한(Contents: write) 확인'); }
      historyLoaded = false;
      setStatus('ok', `✅ 배포 완료! 약 1분 뒤 반영됩니다. <a href="${PAGES_URL}" target="_blank">링크 열기</a>`);
    } catch (e) { setStatus('err', '❌ ' + e.message); } finally { btn.disabled = false; }
  }

  /* ===== 껍데기 ===== */
  function buildSkeleton() {
    $('app').innerHTML = `
      <div class="topbar">
        <h1 id="scTitle">스토리보드</h1>
        <span class="badge">와이어프레임 · 스토리보드</span>
        <span class="hint">← 화면을 좌우로 스크롤하면 플로우가 넘어갑니다</span>
        <div class="purpose" id="purpose"></div>
      </div>
      <div class="page">
        <div class="stage">
          <div class="flow" id="flow"></div>
          <p class="wf-note">⚠️ 와이어프레임 (의도·구성 전달용) · 실제 디자인은 Figma 참조</p>
        </div>
        <div class="docs">
          <h2>화면 설명서 (Spec)</h2>
          <p class="sub">화면·설명이 모두 <code>storyboard.json</code> 한 파일에서 나옵니다(사람용 화면 + AI용 데이터 동일 원본). <span class="sub-edit">수정은 보통 Claude에게 말로 요청하고, 직접 고칠 땐 적은 뒤 [저장 및 배포]. 읽기 전용 공유는 주소 끝에 <code>?view</code>.</span></p>
          <div class="block figma">
            <span class="tag">🎨 디자인 (Figma)</span>
            <div class="lk-row"><input id="figmaInput" placeholder="Figma 링크 (https://www.figma.com/...)" /><a id="figmaLink" class="disabled" target="_blank" rel="noopener">열기 ↗</a></div>
            <div class="ds" id="dsRef"></div>
          </div>
          <div class="deploy-bar">
            <button class="primary" id="deployBtn">💾 저장 및 배포</button>
            <button class="secondary" id="mdBtn">📄 마크다운 복사</button>
            <button class="secondary" id="dlBtn">⬇️ HTML 다운로드</button>
            <button class="gear" id="histBtn">🕘 수정 이력</button>
            <button class="gear" id="gearBtn">⚙️ 배포 설정</button>
            <div class="deploy-status" id="deployStatus"></div>
            <div class="settings" id="settings">
              <label>GitHub 액세스 토큰 (이 브라우저에만 저장, 외부로 안 나감)</label>
              <input type="password" id="tokenInput" placeholder="github_pat_..." />
              <button class="save-key" id="saveTokenBtn">토큰 저장</button>
              <p class="note">이 버튼이 GitHub에 파일을 올리는 "열쇠"예요. 한 번만 등록하면 됩니다. ⚠️ 공용 PC에서는 등록하지 마세요.</p>
            </div>
            <div class="history" id="history"></div>
          </div>
          <div id="descList"></div>
        </div>
      </div>`;
  }

  async function init() {
    buildSkeleton();
    if (location.search.includes('view')) document.body.classList.add('viewer');
    $('deployBtn').onclick = deploy;
    $('mdBtn').onclick = copyMarkdown;
    $('dlBtn').onclick = downloadHTML;
    $('histBtn').onclick = toggleHistory;
    $('gearBtn').onclick = toggleSettings;
    $('saveTokenBtn').onclick = saveToken;
    try { const res = await fetch('storyboard.json?ts=' + Date.now()); DATA = await res.json(); }
    catch (e) { setStatus('err', 'storyboard.json 을 불러오지 못했어요.'); return; }
    applyMeta(); renderFlow(); renderDescriptions(); renderFigma(); wirePins();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
