import {contractView,el,style} from './contracts-ui.js?v=20261030-slam';
const frame=document.querySelector('#diagram');const status=document.querySelector('#status');
const dataPromise=fetch('./contracts.json?v=20261030-slam').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()});
function opaqueState(){const params=new URLSearchParams(location.hash.slice(1));return params.get('reader')||location.hash.slice(1);}
function syncFromHost(){const state=opaqueState();try{if(frame.contentWindow.location.hash.slice(1)!==state)frame.contentWindow.location.hash=state;}catch{}}
frame.src='./diagram.html?v=20261030-slam'+(opaqueState()?'#'+opaqueState():'');
window.addEventListener('hashchange',syncFromHost);
frame.addEventListener('load',async()=>{
 try{
  const data=await dataPromise;const doc=frame.contentDocument;const win=frame.contentWindow;
  doc.documentElement.setAttribute('data-reading-link-template',location.href.replace(/#.*$/,'')+'#reader={state}');
  const sheet=el(doc,'style',style);doc.head.append(sheet);
  const chip=doc.querySelector('#focus-chip'),list=doc.querySelector('#relationship-lens-list');if(!chip||!list)throw new Error('원본 뷰어의 선택 패널을 찾지 못했습니다.');
  const nodeNote=el(doc,'div',undefined,'bee-node-explanation');nodeNote.id='bee-node-explanation';doc.querySelector('#focus-passport-meta').after(nodeNote);
  const notice=el(doc,'p','연결 아래 ‘왜 나누었나 · 전송값 예시’를 펼쳐보세요. 숫자는 설명용이며 실시간 로그가 아닙니다.','bee-node-notice');list.before(notice);
  const byId=new Map(data.edges.map(e=>[e.id,e]));let scheduled=false,lastNode=null,pendingEdge=null,pendingScroll=false;
  function containPassport(){
   if(chip.hidden)return;
   chip.style.maxHeight=Math.max(180,win.innerHeight-24)+'px';
   const rect=chip.getBoundingClientRect();
   const delta=rect.bottom>win.innerHeight-12?win.innerHeight-12-rect.bottom:rect.top<12?12-rect.top:0;
   if(Math.abs(delta)>1)chip.style.top=(chip.offsetTop+delta)+'px';
  }
  const resizeObserver=new win.ResizeObserver(()=>win.requestAnimationFrame(containPassport));resizeObserver.observe(chip);
  win.addEventListener('resize',containPassport);list.addEventListener('toggle',()=>win.requestAnimationFrame(containPassport),true);

  function enhance(){
   scheduled=false;const id=doc.querySelector('#focus-id').textContent.trim();if(id!==lastNode){lastNode=id;nodeNote.replaceChildren();const n=data.nodes[id];if(n){nodeNote.append(el(doc,'strong',n.role),el(doc,'div',n.whySeparate));}}
   for(const button of list.querySelectorAll('.relationship-lens-row[data-relationship-id]')){
    if(button.dataset.beeEnhanced)continue;const edge=byId.get(button.dataset.relationshipId);if(!edge)continue;
    // Bind the enhancement to all three authored identities, not a label or geometry guess.
    if(button.dataset.relationshipFrom!==edge.from||button.dataset.relationshipTo!==edge.to)continue;
    button.dataset.beeEnhanced='true';button.after(contractView(doc,edge,data));
   }
   if(pendingEdge){const box=[...list.querySelectorAll('.bee-contract')].find(x=>x.dataset.edgeId===pendingEdge);if(box){box.open=true;if(pendingScroll){pendingScroll=false;box.scrollIntoView({block:'nearest'});}}}
   const nativeState=win.location.hash.slice(1);const next=location.pathname+location.search+(nativeState?'#reader='+encodeURIComponent(nativeState):'');if(location.pathname+location.search+location.hash!==next)history.replaceState(null,'',next);
  }
  function queue(){if(!scheduled){scheduled=true;win.requestAnimationFrame(enhance);}}
  const observer=new win.MutationObserver(()=>{queue();win.requestAnimationFrame(containPassport);});observer.observe(list,{childList:true,subtree:true});observer.observe(doc.querySelector('#focus-id'),{childList:true,characterData:true,subtree:true});observer.observe(chip,{attributes:true,attributeFilter:['hidden']});
  doc.addEventListener('click',event=>{
   if(event.target.closest('[data-node-id]')&&!event.target.closest('.bee-contract')){pendingEdge=null;pendingScroll=false;}
   const target=event.target.closest('[data-relationship-id]');if(!target||target.closest('.bee-contract'))return;
   pendingEdge=target.dataset.relationshipId;pendingScroll=true;queue();
  });
  win.addEventListener('hashchange',queue);enhance();status.textContent='노드·연결을 눌러 역할 분리 이유와 전송값 예시를 확인하세요';status.dataset.ready='true';
 }catch(error){status.textContent='설명을 불러오지 못했습니다. 원본 보기 또는 메시지 사전을 이용하세요.';console.error(error);}
});
