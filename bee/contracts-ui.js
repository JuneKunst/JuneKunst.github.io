export const statusLabels={implemented:'현재 코드 경로',planned:'적용 예정 · 실행값 아님',reference:'내부·설정 관계 / 상세 형식 미확인'};
export function el(doc,tag,text,cls){const x=doc.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;}
export function paragraph(doc,title,text){const p=el(doc,'p',undefined,'bee-explain');p.append(el(doc,'strong',title+' '),doc.createTextNode(text));return p;}
export function contractView(doc,edge,data,{open=false}={}){
 const box=el(doc,'details',undefined,'bee-contract');box.dataset.edgeId=edge.id;box.open=open;
 const title=el(doc,'summary','왜 나누었나 · 전송값 예시');title.append(el(doc,'small',edge.channels.map(c=>c.name).join(' · ')));box.append(title);
 const body=el(doc,'div',undefined,'bee-contract-body');
 body.append(el(doc,'p',`${data.nodes[edge.from].label} → ${data.nodes[edge.to].label}`,'bee-direction'),el(doc,'p',statusLabels[edge.status],'bee-badge'));
 body.append(paragraph(doc,'왜 필요한가',edge.purpose),paragraph(doc,'왜 따로 나누었나',edge.whySeparate),paragraph(doc,'받는 쪽은',edge.receiverDoes));
 for(const channel of edge.channels){
  const section=el(doc,'section',undefined,'bee-channel');section.append(el(doc,'h4',channel.name),el(doc,'p',`${channel.kind} · ${channel.type}`,'bee-type'));
  section.append(el(doc,'p',channel.exampleLabel,'bee-sample-notice'));
  if(channel.example!==null){const pre=el(doc,'pre');pre.append(el(doc,'code',typeof channel.example==='string'?channel.example:JSON.stringify(channel.example,null,2)));section.append(pre);}
  if(channel.schema){const structure=el(doc,'details',undefined,'bee-schema');structure.append(el(doc,'summary','필드·형식 보기'));const pre=el(doc,'pre');pre.append(el(doc,'code',channel.schema));structure.append(pre);section.append(structure);}
  if(channel.note)section.append(el(doc,'p',channel.note,'bee-note'));
  if(channel.sources?.length){const evidence=el(doc,'details',undefined,'bee-evidence');evidence.append(el(doc,'summary','근거 코드 · 스냅샷'));
   if(channel.sourceScope)evidence.append(el(doc,'p',channel.sourceScope,'bee-note'));
   for(const source of channel.sources){evidence.append(el(doc,'p',`${source.path} · L${source.line}–${source.end_line}`,'bee-source-path'));const pre=el(doc,'pre');pre.append(el(doc,'code',source.excerpt));evidence.append(pre);}section.append(evidence);}
  body.append(section);
 }
 if(edge.related?.length){const p=el(doc,'p','함께 비교: ','bee-related');for(const id of edge.related){const other=data.edges.find(x=>x.id===id);if(!other)continue;const a=el(doc,'a',`${data.nodes[other.from].label} → ${data.nodes[other.to].label}`);a.href=new URL(`messages.html#${encodeURIComponent(id)}`,new URL('.',location.href)).href;a.target='_blank';a.rel='noopener';p.append(a,doc.createTextNode(' · '));}body.append(p);}
 const direct=el(doc,'a','이 설명만 열기 ↗');direct.href=new URL(`messages.html#${encodeURIComponent(edge.id)}`,new URL('.',location.href)).href;direct.target='_blank';direct.rel='noopener';body.append(direct);
 box.append(body);return box;
}
export const style=`
.bee-contract{margin:6px 0 14px;border:1px solid var(--border,#334155);border-radius:9px;color:var(--text,#e8edf5);font:13px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;max-width:100%;overflow-wrap:anywhere}
.bee-contract>summary{padding:11px 12px;cursor:pointer;color:var(--frontend-stroke,#22c6de);font-weight:700;min-height:44px}
.bee-contract>summary small{display:block;color:var(--text-muted,#a0adc0);font:11px/1.5 ui-monospace,monospace;overflow-wrap:anywhere;margin-top:4px}
.bee-contract-body{padding:2px 12px 16px}.bee-contract .bee-explain{margin:10px 0;font-size:13px;line-height:1.7}.bee-explain strong{display:block;color:var(--text,#edf2f7);margin-bottom:2px}
.bee-direction{font-weight:700}.bee-badge,.bee-sample-notice{font-size:11px;color:var(--cloud-stroke,#d6a34c);margin:6px 0}.bee-channel{padding-top:13px;margin-top:14px;border-top:1px solid var(--border,#334155)}.bee-channel h4{font:700 13px/1.5 ui-monospace,monospace;margin:0;overflow-wrap:anywhere}.bee-type{font:11px/1.5 ui-monospace,monospace;color:var(--text-muted,#a0adc0);margin:5px 0}
.bee-contract pre{font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;margin:8px 0;padding:12px;background:var(--code-bg,rgba(127,145,170,.1));border-radius:7px;overflow:auto;max-height:340px;text-align:left;white-space:pre}.bee-contract code{font:inherit;color:inherit}
.bee-contract .bee-note,.bee-source-path{font-size:12px;line-height:1.65;color:var(--text-muted,#a0adc0);overflow-wrap:anywhere}.bee-schema>summary,.bee-evidence>summary{cursor:pointer;min-height:36px;padding:8px 0;font-size:12px;font-weight:650}.bee-contract a{color:var(--frontend-stroke,#22c6de);text-decoration:underline;font-size:12px}.bee-related a{display:inline-block;margin-top:5px}
.bee-node-explanation{font:12px/1.65 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:var(--text-muted,#a0adc0);padding:10px 0;margin:4px 0;border-top:1px solid var(--border,#334155)}.bee-node-explanation strong{color:var(--text,#edf2f7)}.bee-node-notice{font-size:11px;color:var(--cloud-stroke,#d6a34c);margin:6px 0}
#focus-chip:not([hidden]){display:flex;flex-direction:column;width:min(540px,calc(100vw - 32px));max-height:calc(100dvh - 24px)}#focus-chip .relationship-lens-head{flex-shrink:0}#relationship-lens-list{min-height:70px;max-height:55dvh;overflow:auto;overscroll-behavior:contain}#focus-chip .relationship-lens-copy{min-width:0}#focus-chip .semantic-passport-evidence{margin-top:6px}#focus-chip .relationship-lens-row{width:100%}.bee-contract[open]>summary{border-bottom:1px solid var(--border,#334155)}
@media(max-height:700px){#focus-chip .semantic-passport-evidence,#focus-chip .semantic-passport-reach{display:none}#relationship-lens-list{max-height:48dvh}}
@media(max-width:720px){#focus-chip .relationship-lens-actions #btn-focus-relations{display:block}#focus-chip:not([hidden]){width:calc(100vw - 20px)}.bee-node-explanation{max-height:110px;overflow:auto}#relationship-lens-list{max-height:48dvh}}
`;
