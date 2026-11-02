'use strict';
(() => {
  const pages = {
    'mission-vs-skill': { tab: 'overview', file: 'mission-vs-skill.html', title: '전체 구조', context: '누가 판단하고 누가 실행하는지 먼저 봅니다.' },
    'mission-flow': { tab: 'mission', file: 'mission-flow.html', title: '미션 진행', context: '입력 → 판단 → 명령 → 확인 순서로 한 단계씩 따라갑니다.' },
    'mission-manager-inside': { tab: 'mission', file: 'mission-manager-inside.html', title: '미션 내부 코드', context: '단계를 진행시키는 함수와 책임을 자세히 봅니다.' },
    'skill-structure': { tab: 'execution', file: 'skill-structure.html', title: '동작 실행', context: '각 skill의 실행과 자세표·적재 장부를 구분합니다.' },
    'stand-flow': { tab: 'execution', file: 'stand-flow.html', title: '세우기 설계 · 예정', context: '현재 실행 경로와 구분해서 살펴보는 예정 기능입니다.' }
  };
  const defaults = { overview: 'mission-vs-skill', mission: 'mission-flow', execution: 'skill-structure' };
  const el = id => document.getElementById(id), view = el('view');
  let state = { page: 'mission-vs-skill', story: 'mission', step: 0 };
  const make = (tag, text) => { const n = document.createElement(tag); if (text != null) n.textContent = text; return n; };
  function readHash() {
    const [page, ...rest] = location.hash.slice(1).split('&'), q = new URLSearchParams(rest.join('&'));
    state.page = Object.hasOwn(pages, page) ? page : 'mission-vs-skill';
    const story = q.get('story');
    state.story = Object.hasOwn(window.BEE_LEARNING, story) ? story : (pages[state.page].tab === 'execution' ? 'load' : 'mission');
    const raw = Number(q.get('step') || 0);
    state.step = Number.isFinite(raw) ? Math.max(0, Math.min(window.BEE_LEARNING[state.story].steps.length - 1, Math.trunc(raw))) : 0;
  }
  function save() { history.replaceState(null, '', '#' + state.page + '&story=' + state.story + '&step=' + state.step); }
  function highlight() {
    const doc = view.contentDocument; if (!doc) return;
    let style = doc.getElementById('learning-highlight');
    if (!style) { style = doc.createElement('style'); style.id = 'learning-highlight'; style.textContent = '[data-learning-active="true"]>rect{stroke:#f6c76a!important;stroke-width:3px!important}'; doc.head.append(style); }
    doc.querySelectorAll('[data-learning-active]').forEach(n => n.removeAttribute('data-learning-active'));
    if (!['mission-flow', 'skill-structure'].includes(state.page)) return;
    const step = window.BEE_LEARNING[state.story].steps[state.step];
    const ids = state.page === 'mission-flow' ? step.missionNodes : step.skillNodes;
    (ids || []).forEach(id => doc.querySelector('[data-node-id="' + id + '"]')?.setAttribute('data-learning-active', 'true'));
  }
  function renderStep() {
    const story = window.BEE_LEARNING[state.story], step = story.steps[state.step];
    el('story').value = state.story; el('counter').textContent = (state.step + 1) + ' / ' + story.steps.length;
    el('previous').disabled = state.step === 0; el('next').disabled = state.step === story.steps.length - 1;
    el('step-list').replaceChildren(...story.steps.map((s, i) => { const li = make('li'), b = make('button', (i + 1) + '. ' + s.short); if (i === state.step) b.setAttribute('aria-current', 'step'); b.onclick = () => { state.step = i; save(); renderStep(); }; li.append(b); return li; }));
    const d = el('step-detail'); d.replaceChildren(); const code = make('p', step.phase); code.className = 'code'; d.append(code, make('h1', step.title), make('p', step.summary));
    const dl = make('dl');
    for (const [label, key] of [['필요한 입력', 'input'], ['누가 무엇을 판단하나', 'decision'], ['실제로 보내는 명령', 'action'], ['다음으로 넘어가는 조건', 'complete'], ['실패하면', 'failure']]) dl.append(make('dt', label), make('dd', step[key]));
    d.append(dl);
    if (step.example) { d.append(make('h2', '명령·데이터 예시'), make('pre', step.example)); const note = make('p', '필드 일부를 보여주는 설명용 예시입니다. 좌표·ID는 실제 실행값이 아닙니다.'); note.className = 'guide-note'; d.append(note); }
    const meaning = make('p', step.learn); meaning.className = 'meaning'; const link = make('a', '이 단계의 코드 보기 ↗'); link.href = step.source; link.target = '_blank'; link.rel = 'noopener'; d.append(meaning, link); highlight();
  }
  function render() {
    const page = pages[state.page]; document.querySelectorAll('[data-tab]').forEach(b => { const selected = b.dataset.tab === page.tab; b.setAttribute('aria-selected', selected); b.tabIndex = selected ? 0 : -1; });
    el('content').setAttribute('aria-labelledby', 'tab-' + page.tab); el('context').textContent = page.context;
    const detailPages = Object.entries(pages).filter(([, p]) => p.tab === page.tab);
    el('details').replaceChildren(...(detailPages.length > 1 ? detailPages.map(([key, p]) => { const b = make('button', p.title); b.setAttribute('aria-pressed', String(key === state.page)); b.onclick = () => { state.page = key; save(); render(); }; return b; }) : []));
    el('guide').hidden = !['mission-flow', 'skill-structure'].includes(state.page);
    if (view.dataset.page !== state.page) { view.dataset.page = state.page; view.src = page.file; view.title = 'BEE ' + page.title + ' Archify'; }
    el('open-diagram').href = page.file; renderStep();
  }
  document.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { state.page = defaults[b.dataset.tab]; state.story = b.dataset.tab === 'execution' ? 'load' : 'mission'; state.step = 0; save(); render(); }; b.onkeydown = e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); const buttons = [...document.querySelectorAll('[data-tab]')], i = buttons.indexOf(b); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; buttons[next].click(); buttons[next].focus(); }; });
  el('story').onchange = () => { state.story = el('story').value; state.step = 0; save(); renderStep(); };
  el('previous').onclick = () => { if (state.step > 0) { state.step--; save(); renderStep(); } };
  el('next').onclick = () => { if (state.step < window.BEE_LEARNING[state.story].steps.length - 1) { state.step++; save(); renderStep(); } };
  view.addEventListener('load', highlight); addEventListener('hashchange', () => { readHash(); render(); }); readHash(); render();
})();
