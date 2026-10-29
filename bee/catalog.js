import {contractView,el,style} from './contracts-ui.js?v=20261028-1';
try{
 const response=await fetch('./contracts.json?v=20261028-1');if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();document.head.append(el(document,'style',style.replace(/#focus-chip[^}]+}/g,'')));
 const root=document.querySelector('#contracts'),query=document.querySelector('#query'),kind=document.querySelector('#kind');const rows=[];
 for(const edge of data.edges){const box=contractView(document,edge,data);box.id=edge.id;box.querySelector('summary').firstChild.textContent=`${data.nodes[edge.from].label} → ${data.nodes[edge.to].label} · ${edge.label}`;root.append(box);rows.push({box,edge,search:JSON.stringify(edge).toLowerCase()+' '+data.nodes[edge.from].label.toLowerCase()+' '+data.nodes[edge.to].label.toLowerCase()});}
 function filter(){let n=0;for(const row of rows){row.box.hidden=!!((kind.value&&kind.value!==row.edge.status)||!row.search.includes(query.value.toLowerCase()));if(!row.box.hidden)n++;}document.querySelector('#count').textContent=`${n} / ${rows.length}개 연결`;}
 function reveal(){const id=decodeURIComponent(location.hash.slice(1));const box=document.getElementById(id);if(!box)return;query.value='';kind.value='';filter();box.open=true;box.scrollIntoView({block:'start'});}
 query.addEventListener('input',filter);kind.addEventListener('change',filter);window.addEventListener('hashchange',reveal);filter();reveal();
}catch(error){document.querySelector('#count').textContent='불러오지 못했습니다. 새로고침해 주세요.';console.error(error);}
