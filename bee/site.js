// BEE 사이트 공통 — 메뉴 한 곳 (MENU)에서 모든 페이지의 위쪽 메뉴 · 첫 화면 목록을 만듦
//   페이지마다: <script src="site.js" defer></script>
//   md 문서 페이지: <body data-md="robot-spec.md"> → 그 md를 읽어 그림(mermaid)·표까지 그림
//   첫 화면(index.html): <div id="site-hub"></div> → MENU 묶음별 카드
const MENU = [
  { group: '현황', items: [
    { href: 'wrapup-1103.html', title: '정리 · 결정 기록', desc: '정한 것 · 만든 것 · 학습 결과 · 노드 · 남은 일', updated: '11-04' },
    { href: 'system-map.html', title: '전체 지도', desc: '학습부터 로봇까지 한 장 — 완료·진행·없음 색 표시', updated: '11-04' },
    { href: 'robot-spec.html', title: '로봇 스펙 · 성능표', desc: 'skill 성능 · 하드웨어 · 주기·지연 · QoS · 실기에서 조정할 값', updated: '11-04' },
  ]},
  { group: 'skill · 학습', items: [
    { href: 'skill-plan.html', title: '스킬 · 플랜 한 장', desc: '처음 보는 사람용 설명 — skill과 플래너가 무엇인지', updated: '11-03' },
    { href: 'skill-learning.html', title: '학습용 skill 구성', desc: 'skill 37개 · 영역별 표 · 학습 방식 · 나눈 기준', updated: '11-03' },
    { href: 'skill-training.html', title: 'skill별 학습 조건', desc: '환경 · 보상 함수 · 성공 판정 · 기준선 · 재학습 기록', updated: '11-03' },
    { href: 'skills.html', title: '학습 지도 (구조 → 미션 → 동작)', desc: '단계를 따라가며 보는 인터랙티브 지도', updated: '11-02' },
  ]},
  { group: '구조', items: [
    { href: 'skill-nodes.html', title: 'skill 노드 구성', desc: 'skill마다 노드 하나 · 액션 /skills/<skill> · 정책은 skill이 관리', updated: '11-04' },
    { href: 'flow.html', title: '노드 흐름 (인터랙티브)', desc: '전체 노드 연결 — 연결을 누르면 메시지·역할 설명', updated: '11-02' },
    { href: 'messages.html', title: '메시지 사전', desc: '연결마다 목적 · 나눈 이유 · 메시지 예시', updated: '11-02' },
    { href: 'mission-vs-skill.html', title: '그림: 누가 판단하고 누가 실행하나', desc: '다이어그램 원본', updated: '11-02', raw: true },
    { href: 'mission-flow.html', title: '그림: 주사위 미션 흐름', desc: '다이어그램 원본', updated: '11-02', raw: true },
    { href: 'mission-manager-inside.html', title: '그림: mission_manager 안', desc: '다이어그램 원본', updated: '11-02', raw: true },
    { href: 'skill-structure.html', title: '그림: skill 구조', desc: '다이어그램 원본 (11-04 skill 노드로 나누기 전)', updated: '11-02', raw: true },
    { href: 'stand-flow.html', title: '그림: 세우기 stand · stand_pick', desc: '다이어그램 원본', updated: '11-02', raw: true },
    { href: 'diagram.html', title: '그림: 전체 노드 원본', desc: '노드 흐름의 다이어그램만', updated: '11-02', raw: true },
    { href: '2026-10-28.html', title: '그림: 10-28 전체 노드 (옛 판)', desc: '보관용', updated: '10-28', raw: true },
  ]},
  { group: '실기', items: [
    { href: 'debug-guide.html', title: '실기 디버깅', desc: '기록(rosbag · 블랙박스) · 보기(PlotJuggler · Lichtblick) · 증상별 고칠 곳', updated: '11-03' },
  ]},
];

(() => {
  const here = location.pathname.split('/').pop() || 'index.html';
  const css = `
  :root{--site-h:44px}
  .bee-site{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:4px;min-height:44px;padding:0 max(12px,env(safe-area-inset-right)) 0 max(12px,env(safe-area-inset-left));
    background:#0b1220;border-bottom:1px solid #26354d;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#e8eef8;flex:none}
  .bee-site a{color:#e8eef8;text-decoration:none}
  .bee-site .home{font-weight:700;margin-right:10px;padding:10px 4px;white-space:nowrap}
  .bee-site .home span{color:#67d7e8}
  .bee-site details{position:relative}
  .bee-site summary{list-style:none;cursor:pointer;padding:10px 10px;border-radius:6px;white-space:nowrap;color:#b3c0d5}
  .bee-site summary::-webkit-details-marker{display:none}
  .bee-site summary::after{content:" ▾";font-size:11px;opacity:.7}
  .bee-site summary:hover,.bee-site details[open] summary{background:#18263a;color:#e8eef8}
  .bee-site details.cur summary{color:#67d7e8;font-weight:600}
  .bee-site summary:focus-visible,.bee-site a:focus-visible{outline:2px solid #67d7e8;outline-offset:1px}
  .bee-site .menu{position:absolute;top:calc(100% + 4px);left:0;min-width:280px;max-width:min(360px,calc(100vw - 24px));background:#111b2b;border:1px solid #26354d;border-radius:8px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  .bee-site .menu a{display:block;padding:8px 10px;border-radius:6px}
  .bee-site .menu a:hover{background:#18263a}
  .bee-site .menu a[aria-current]{background:#18263a;color:#67d7e8}
  .bee-site .menu small{display:block;color:#8aa0b8;font-size:12px}
  .bee-site .src{margin-left:auto;color:#8aa0b8;font-size:12px;padding:10px 4px;white-space:nowrap}
  @media(max-width:640px){.bee-site{flex-wrap:wrap;gap:0}.bee-site .home{width:100%;padding:8px 4px 0}.bee-site summary{padding:8px 8px}
    .bee-site .src{display:none}.bee-site details:last-of-type .menu{left:auto;right:0}}
  /* md 문서 */
  .bee-doc{max-width:1100px;margin:0 auto;padding:16px max(16px,env(safe-area-inset-right)) 64px max(16px,env(safe-area-inset-left))}
  .bee-doc h1{font-size:1.6rem;line-height:1.3}
  .bee-doc h2{font-size:1.2rem;margin-top:2.2em;padding-top:.6em;border-top:1px solid #26354d;scroll-margin-top:56px}
  .bee-doc h3{font-size:1rem;margin-top:1.4em;scroll-margin-top:56px}
  .bee-doc blockquote{margin:0;padding:4px 12px;border-left:3px solid #e2a83a;color:#9aa6b4}
  .bee-doc code{font:13px ui-monospace,Menlo,monospace;background:#18263a;padding:1px 5px;border-radius:4px}
  .bee-doc pre{background:#111b2b;border:1px solid #26354d;border-radius:8px;padding:12px;overflow-x:auto}
  .bee-doc pre code{background:none;padding:0}
  .bee-doc pre.mermaid{background:#0f1726;text-align:center}
  .bee-doc .tbl{overflow-x:auto;margin:8px 0}
  .bee-doc table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:560px}
  .bee-doc th,.bee-doc td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #26354d}
  .bee-doc th{color:#9aa6b4;font-weight:500}
  .bee-doc td ul{margin:0;padding-left:1.1em}
  .bee-doc hr{display:none}
  .bee-doc details{background:#111b2b;border:1px solid #26354d;border-radius:8px;margin:8px 0;padding:0 12px}
  .bee-doc summary{cursor:pointer;padding:10px 0;color:#67d7e8;font-weight:500}
  .bee-doc details[open]{padding-bottom:10px}
  .bee-doc a{color:#67d7e8}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- 위쪽 메뉴
  const bar = document.createElement('nav');
  bar.className = 'bee-site';
  bar.setAttribute('aria-label', 'BEE 페이지');
  const home = Object.assign(document.createElement('a'), { href: './', className: 'home', innerHTML: '<span>BEE</span> 홈' });
  bar.appendChild(home);
  for (const g of MENU) {
    const d = document.createElement('details');
    if (g.items.some(i => i.href === here)) d.classList.add('cur');
    const s = document.createElement('summary');
    s.textContent = g.group;
    d.appendChild(s);
    const m = document.createElement('div');
    m.className = 'menu';
    for (const i of g.items.filter(x => !x.raw)) {
      const a = document.createElement('a');
      a.href = i.href;
      a.innerHTML = `${i.title}<small>${i.desc}</small>`;
      if (i.href === here) a.setAttribute('aria-current', 'page');
      m.appendChild(a);
    }
    const raw = g.items.filter(x => x.raw).length;
    if (raw) m.insertAdjacentHTML('beforeend', `<a href="./#${encodeURIComponent(g.group)}">그림 원본 ${raw}개<small>홈에서 목록으로</small></a>`);
    d.appendChild(m);
    d.addEventListener('toggle', () => { if (d.open) bar.querySelectorAll('details').forEach(o => o !== d && (o.open = false)); });
    bar.appendChild(d);
  }
  const md = document.body.dataset.md;
  if (md) bar.appendChild(Object.assign(document.createElement('a'), { href: md, className: 'src', textContent: 'md 원본' }));
  document.addEventListener('click', e => { if (!bar.contains(e.target)) bar.querySelectorAll('details').forEach(o => (o.open = false)); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') bar.querySelectorAll('details').forEach(o => (o.open = false)); });
  document.body.prepend(bar);

  // ---------- 첫 화면 목록
  const hub = document.getElementById('site-hub');
  if (hub) for (const g of MENU) {
    const sec = document.createElement('section');
    sec.id = g.group;
    sec.innerHTML = `<h2>${g.group}</h2>`;
    const grid = document.createElement('div');
    grid.className = 'cards';
    for (const i of g.items) grid.insertAdjacentHTML('beforeend',
      `<a class="card${i.raw ? ' raw' : ''}" href="${i.href}"${i.raw ? ' target="_blank" rel="noopener"' : ''}><b>${i.title}</b><span>${i.desc}</span><em>${i.updated}</em></a>`);
    sec.appendChild(grid);
    hub.appendChild(sec);
  }
  if (hub && location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();

  // ---------- md 문서 (marked · mermaid) — 늘 최신으로 (브라우저 캐시는 서버에 다시 물어봄)
  if (!md) return;
  const doc = document.getElementById('doc');
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  Promise.all([fetch(md, { cache: 'no-cache' }).then(r => r.text()),
               load('https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js'),
               load('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js')]).then(([text]) => {
    doc.innerHTML = marked.parse(text);
    doc.querySelectorAll('pre code.language-mermaid').forEach(c => {
      const p = document.createElement('pre'); p.className = 'mermaid'; p.textContent = c.textContent;
      c.parentElement.replaceWith(p);
    });
    // 제목에 id (md 안 #링크용 — GitHub 방식: 소문자 · 공백 → - · 기호 빼기)
    doc.querySelectorAll('h1,h2,h3').forEach(h => { if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-'); });
    doc.querySelectorAll('table').forEach(t => { const w = document.createElement('div'); w.className = 'tbl'; t.replaceWith(w); w.appendChild(t); });
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    // 그림마다 고유 id로 하나씩 (한꺼번에 그리면 id가 겹쳐 그림이 첫 칸에 몰림)
    (async () => { let k = 0; for (const p of doc.querySelectorAll('pre.mermaid')) {
      try { const { svg } = await mermaid.render('mmd' + (k++), p.textContent); p.innerHTML = svg; }
      catch (e) { p.textContent = '그림을 그리지 못했습니다: ' + e.message; } } })();
  }).catch(() => { doc.innerHTML = `<p>불러오지 못했습니다. <a href="${md}">md 원본</a>을 여세요.</p>`; });
})();
