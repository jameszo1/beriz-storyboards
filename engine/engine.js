/* ===========================================================
   베리즈 스토리보드 공용 엔진
   - 화면별 폴더에는 storyboard.json(내용)만 둡니다.
   - index.html 은 이 엔진을 불러오는 껍데기입니다.
   =========================================================== */
(function () {
  'use strict';

  const REPO = { owner: 'jameszo1', name: 'beriz-storyboards', branch: 'main' };
  const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
  const PAGES_URL = location.origin + location.pathname;
  let DATA = null;

  // 이 화면의 storyboard.json 저장 경로(레포 기준). index.html 에서 지정하거나 URL에서 추론.
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
  const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const $ = id => document.getElementById(id);
  function hashSeed(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0)||7919; }
  function qrCells(seed){ let rng=seed; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff; let o=''; for(let i=0;i<25;i++) o+=`<i class="${rand()>0.5?'f':''}"></i>`; return o; }
  function toB64(str){ return btoa(unescape(encodeURIComponent(str))); }
  function setStatus(cls, html){ const el=$('deployStatus'); el.className='deploy-status '+cls; el.innerHTML=html; }

  /* ===== 껍데기(레이아웃) 생성 ===== */
  function buildSkeleton() {
    $('app').innerHTML = `
      <div class="topbar">
        <h1 id="scTitle">스토리보드</h1>
        <span class="badge">와이어프레임 · 스토리보드</span>
        <span class="hint">← 티켓을 좌우로 스크롤하면 여러 장이 넘어갑니다</span>
      </div>
      <div class="page">
        <div class="stage">
          <p class="wf-note">⚠️ 와이어프레임 (의도/구성 전달용) · 실제 디자인은 Figma 참조</p>
          <div class="phone"><div class="screen">
            <div class="statusbar"></div>
            <div class="app-header"><span class="back">‹</span><span class="title" id="scAppTitle">화면</span></div>
            <div class="pager"><span class="label" id="pagerLabel">1 / 1</span></div>
            <div class="dots" id="dots"></div>
            <div class="ticket-scroll" id="scroll"></div>
          </div></div>
        </div>
        <div class="docs">
          <h2>화면 설명서 (Spec)</h2>
          <p class="sub">화면·설명이 모두 <code>storyboard.json</code> 한 파일에서 나옵니다(사람용 화면 + AI용 데이터 동일 원본). <span class="sub-edit">수정은 보통 Claude에게 말로 요청하고, 직접 고칠 땐 적은 뒤 [저장 및 배포]. 읽기 전용 공유는 주소 끝에 <code>?view</code>.</span></p>
          <div class="block figma">
            <span class="tag">🎨 디자인 (Figma)</span>
            <div class="lk-row">
              <input id="figmaInput" placeholder="Figma 링크 붙여넣기 (https://www.figma.com/...)" />
              <a id="figmaLink" class="disabled" target="_blank" rel="noopener">열기 ↗</a>
            </div>
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

  /* ===== 화면(목업) 렌더 ===== */
  // 화면 요소에 붙는 주석핀 (해당 설명의 순번과 연결)
  function pin(id) { const i = DATA.components.findIndex(c => c.id === id); return i < 0 ? '' : `<span class="pin" data-idx="${i}">${i + 1}</span>`; }

  function renderMockup() {
    const s = DATA.show, scroll = $('scroll');
    scroll.innerHTML = DATA.tickets.map(t => {
      const used = t.status === 'used';
      const statusHtml = used
        ? `<div class="status used">${pin('status')}<span class="ico">✓</span>사용완료${t.usedAt ? ' · ' + esc(t.usedAt) + ' 입장' : ''}</div>`
        : `<div class="status unused">${pin('status')}<span class="ico">○</span>입장 가능</div>`;
      return `<div class="ticket${used ? ' is-used' : ''}">
        <div class="show">${pin('show')}<div class="poster">포스터</div>
          <div class="show-info"><div class="cat">${esc(s.category)}</div><div class="name">${esc(s.name)}</div>
            <div class="meta">${esc(s.datetime)} · ${esc(s.venue)}</div></div></div>
        <div class="field-tag">예매정보</div>
        <div class="booking">${pin('booking')}
          <div class="row"><span class="k">예매번호</span><span class="v">${esc(DATA.bookingNumber)}</span></div>
          <div class="row"><span class="k">좌석</span><span class="v"><span class="seat-badge">${esc(t.seat)}</span></span></div>
          <div class="row"><span class="k">매수</span><span class="v">1매 (${esc(t.index)})</span></div>
        </div>
        <div class="qr-area">${pin('qr')}<div class="qr-label">QR 코드</div><div class="qr">${qrCells(hashSeed(t.qrCode))}</div><div class="qr-code">${esc(t.qrCode)}</div></div>
        ${statusHtml}</div>`;
    }).join('');

    const total = DATA.tickets.length, dotsEl = $('dots');
    dotsEl.innerHTML = DATA.tickets.map((_, i) => `<span class="dot${i === 0 ? ' on' : ''}"></span>`).join('');
    const pager = document.querySelector('.pager');
    if (pager && !pager.querySelector('.pin')) pager.insertAdjacentHTML('afterbegin', pin('scroll'));
    $('pagerLabel').textContent = '1 / ' + total;
    scroll.onscroll = () => {
      const idx = Math.round(scroll.scrollLeft / scroll.clientWidth);
      $('pagerLabel').textContent = (idx + 1) + ' / ' + total;
      dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('on', i === idx));
    };
  }

  function renderDescriptions() {
    $('descList').innerHTML = DATA.components.map((c, i) =>
      `<div class="block" data-idx="${i}"><span class="tag num">${i + 1} ${esc(c.label)}</span>
        <textarea data-id="${esc(c.id)}" placeholder="${esc(c.label)} 설명을 적어주세요">${esc(c.description || '')}</textarea></div>`
    ).join('');
    if (location.search.includes('view'))
      document.querySelectorAll('#descList textarea').forEach(t => t.setAttribute('readonly', ''));
  }

  /* ===== 핀 ↔ 설명 연동 (hover 하이라이트 / 클릭 스크롤) ===== */
  function highlight(idx, on) {
    document.querySelectorAll(`#descList .block[data-idx="${idx}"]`).forEach(b => b.classList.toggle('hl', on));
    document.querySelectorAll(`.pin[data-idx="${idx}"]`).forEach(p => p.classList.toggle('act', on));
  }
  function wirePins() {
    document.querySelectorAll('.pin').forEach(p => {
      const idx = p.dataset.idx;
      p.addEventListener('mouseenter', () => highlight(idx, true));
      p.addEventListener('mouseleave', () => highlight(idx, false));
      p.addEventListener('click', () => {
        const b = document.querySelector(`#descList .block[data-idx="${idx}"]`);
        if (b) { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.classList.add('hl'); setTimeout(() => b.classList.remove('hl'), 1200); }
      });
    });
    document.querySelectorAll('#descList .block').forEach(b => {
      const idx = b.dataset.idx;
      b.addEventListener('mouseenter', () => document.querySelectorAll(`.pin[data-idx="${idx}"]`).forEach(p => p.classList.add('act')));
      b.addEventListener('mouseleave', () => document.querySelectorAll(`.pin[data-idx="${idx}"]`).forEach(p => p.classList.remove('act')));
    });
  }

  function renderFigma() {
    const inp = $('figmaInput'), lk = $('figmaLink');
    inp.value = DATA.figmaUrl || '';
    const sync = () => {
      const v = inp.value.trim();
      if (v) { lk.href = v; lk.classList.remove('disabled'); } else { lk.removeAttribute('href'); lk.classList.add('disabled'); }
    };
    inp.addEventListener('input', sync); sync();
    $('dsRef').textContent = DATA.designSystemRef ? '디자인 시스템: ' + DATA.designSystemRef : '';
  }

  function applyMeta() {
    $('scTitle').textContent = DATA.screen || '스토리보드';
    $('scAppTitle').textContent = DATA.screen || '화면';
    document.title = (DATA.screen || '스토리보드') + ' · 와이어프레임';
  }

  /* ===== 편집 내용 → DATA 반영 ===== */
  function syncAll() {
    document.querySelectorAll('#descList textarea').forEach(t => {
      const c = DATA.components.find(x => x.id === t.dataset.id); if (c) c.description = t.value;
    });
    DATA.figmaUrl = $('figmaInput').value.trim();
  }

  /* ===== 마크다운 ===== */
  function toMarkdown() {
    syncAll(); const s = DATA.show;
    let md = `# ${DATA.screen} (스토리보드)\n\n`;
    md += `> **목적**: ${DATA.purpose}\n`;
    md += `> **라이브 화면**: ${PAGES_URL}\n`;
    if (DATA.figmaUrl) md += `> **디자인(Figma)**: ${DATA.figmaUrl}\n`;
    if (DATA.designSystemRef) md += `> **디자인 시스템**: ${DATA.designSystemRef}\n`;
    if (DATA.updatedAt) md += `> **업데이트**: ${DATA.updatedAt}\n`;
    md += `\n## 공연 / 예매 정보\n- 공연: ${s.name} (${s.category})\n- 일시: ${s.datetime}\n- 장소: ${s.venue}\n- 예매번호: ${DATA.bookingNumber}\n`;
    md += `\n## 티켓 (${DATA.tickets.length}매)\n\n| # | 좌석 | 상태 |\n|---|------|------|\n`;
    DATA.tickets.forEach(t => md += `| ${t.index} | ${t.seat} | ${t.status === 'used' ? '사용완료' + (t.usedAt ? ` (${t.usedAt})` : '') : '입장 가능'} |\n`);
    md += `\n## 화면 구성 요소\n`;
    DATA.components.forEach((c, i) => md += `\n### ${CIRCLED[i] || ''} ${c.label}\n${c.description || '_(설명 없음)_'}\n`);
    return md;
  }
  async function copyMarkdown() {
    const md = toMarkdown();
    try { await navigator.clipboard.writeText(md); setStatus('ok', '📄 마크다운을 복사했어요. Confluence에 붙여넣으세요.'); }
    catch (e) { setStatus('err', '복사 실패 — 콘솔에 출력했어요(F12).'); console.log(md); }
  }

  /* ===== HTML 다운로드 (단독 실행 가능한 읽기전용 스냅샷) ===== */
  async function downloadHTML() {
    syncAll();
    let css = '';
    try { css = await (await fetch('../engine/engine.css')).text(); } catch (e) {}
    const clone = $('app').cloneNode(true);
    clone.querySelectorAll('.deploy-bar').forEach(e => e.remove());
    clone.querySelectorAll('.sub-edit').forEach(e => e.remove());
    clone.querySelectorAll('.figma input').forEach(e => e.remove());
    clone.querySelectorAll('textarea').forEach(t => {
      const p = document.createElement('p'); p.className = 'desc-text'; p.textContent = t.value || '—'; t.replaceWith(p);
    });
    const stamp = DATA.updatedAt ? ' · ' + DATA.updatedAt.slice(0, 10) : '';
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(DATA.screen)} 스토리보드${stamp}</title><style>${css}</style></head><body class="viewer">${clone.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${DATA.screen}-storyboard.html`;
    a.click(); URL.revokeObjectURL(a.href);
    setStatus('ok', '⬇️ HTML 파일을 다운로드했어요. (오프라인 공유·첨부용)');
  }

  /* ===== 수정 이력 (GitHub 커밋 기록) ===== */
  let historyLoaded = false;
  async function toggleHistory() {
    const box = $('history'); box.classList.toggle('open');
    if (!box.classList.contains('open') || historyLoaded) return;
    box.innerHTML = '<p class="empty">불러오는 중...</p>';
    try {
      const url = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/commits?path=${encodeURIComponent(PATH)}&per_page=15`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('이력 조회 실패');
      const commits = await res.json();
      if (!commits.length) { box.innerHTML = '<p class="empty">아직 수정 이력이 없어요.</p>'; historyLoaded = true; return; }
      const items = commits.map(c => {
        const d = (c.commit.committer.date || '').replace('T', ' ').slice(0, 16);
        const msg = esc((c.commit.message || '').split('\n')[0]);
        return `<li><span class="msg">${msg}</span><span class="when">${d}</span><a href="${c.html_url}" target="_blank">보기</a></li>`;
      }).join('');
      box.innerHTML = `<h4>최근 수정 이력 (GitHub 커밋)</h4><ul>${items}</ul>`;
      historyLoaded = true;
    } catch (e) {
      box.innerHTML = '<p class="empty">이력을 불러오지 못했어요. ' + esc(e.message) + '</p>';
    }
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
      historyLoaded = false; // 다음에 이력 열면 새로 로드
      setStatus('ok', `✅ 배포 완료! 약 1분 뒤 반영됩니다. <a href="${PAGES_URL}" target="_blank">링크 열기</a>`);
    } catch (e) { setStatus('err', '❌ ' + e.message); } finally { btn.disabled = false; }
  }

  /* ===== 초기화 ===== */
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
    applyMeta(); renderMockup(); renderDescriptions(); renderFigma(); wirePins();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
