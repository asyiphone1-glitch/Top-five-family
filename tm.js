/* דמויות הבנות מ-teach-me (ציור בקוד). אם יש ציור בתיקייה img, הוא מוצג במקום */
(function(root){
const SK='#F7D6C2', SKD='#E9B79E', LIP='#C9656A', MOUTH='#7E2F33';
function eyes(o){
  // o: {y, dx, w, iris, squint, liner, lash}
  const y=o.y, w=(o.w||9)+1.5, sq=(o.squint||0)*.8;
  let s='';
  [-1,1].forEach(d=>{
    const cx=100+d*o.dx;
    const top=y-9+sq, bot=y+3;
    s+='<path d="M'+(cx-w)+' '+y+' Q'+cx+' '+top+' '+(cx+w)+' '+y+' Q'+cx+' '+bot+' '+(cx-w)+' '+y+'Z" fill="#fff"/>';
    s+='<clipPath id="ec'+o.id+d+'"><path d="M'+(cx-w)+' '+y+' Q'+cx+' '+top+' '+(cx+w)+' '+y+' Q'+cx+' '+bot+' '+(cx-w)+' '+y+'Z"/></clipPath>';
    s+='<g clip-path="url(#ec'+o.id+d+')"><circle cx="'+(cx+d*0.5)+'" cy="'+(y-1.2)+'" r="5.4" fill="'+o.iris+'"/><circle cx="'+(cx+d*0.5)+'" cy="'+(y-1.2)+'" r="2.7" fill="#2A1C14"/><circle cx="'+(cx+d*0.5+1.4)+'" cy="'+(y-2.8)+'" r="1.1" fill="#fff"/></g>';
    s+='<path d="M'+(cx-w-1)+' '+(y+.5)+' Q'+cx+' '+(top-1.2)+' '+(cx+w+1)+' '+(y+.5)+'" stroke="#3A271C" stroke-width="'+(o.liner?2.4:1.8)+'" fill="none" stroke-linecap="round"/>';
    if(o.liner) s+='<path d="M'+(cx+d*(w+.5))+' '+(y-.5)+' l'+(d*4)+' -2.6" stroke="#2A1C14" stroke-width="1.6" stroke-linecap="round"/>';
    // smile lower lid (cheeks pushing up)
    s+='<path d="M'+(cx-w+1)+' '+(y+3)+' Q'+cx+' '+(y+5.5)+' '+(cx+w-1)+' '+(y+3)+'" stroke="'+SKD+'" stroke-width="1.2" fill="none"/>';
  });
  return s;
}
function brows(y,dx,col,thick,arch){
  let s='';
  [-1,1].forEach(d=>{const cx=100+d*dx;
    s+='<path d="M'+(cx-d*10)+' '+(y+2)+' Q'+(cx+d*1)+' '+(y-arch)+' '+(cx+d*11)+' '+(y+1)+'" stroke="'+col+'" stroke-width="'+thick+'" fill="none" stroke-linecap="round"/>';});
  return s;
}
function freckles(n,seed,col,box){
  let s='', r=seed;
  const rnd=()=>{r=(r*9301+49297)%233280;return r/233280;};
  for(let i=0;i<n;i++){const side=i%2?1:-1;
    const x=100+side*(box[0]+rnd()*box[1]), y=box[2]+rnd()*box[3];
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(0.7+rnd()*0.6).toFixed(2)+'" fill="'+col+'" opacity="'+(0.3+rnd()*0.3).toFixed(2)+'"/>';}
  return s;
}
function nose(y){return '<path d="M97 '+(y-7)+' Q94.5 '+(y-1.5)+' 96.5 '+(y+.5)+' Q100 '+(y+2.5)+' 103.5 '+(y+.5)+'" stroke="'+SKD+'" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="100" cy="'+(y-2)+'" rx="4" ry="2.4" fill="#fff" opacity=".25"/>';}
function smile(o){
  const y=o.y,w=o.w+2,h=o.h-1,t=o.tilt||0, th=o.teethH+1;
  const L=(100-w)+','+(y-t), R=(100+w)+','+(y+t);
  const outer='M'+L+' Q100,'+(y-3)+' '+R+' Q'+(100+w*.8)+','+(y+h*.95)+' 100,'+(y+h)+' Q'+(100-w*.8)+','+(y+h*.95)+' '+L+'Z';
  let s='<path d="'+outer+'" fill="'+MOUTH+'"/>';
  s+='<clipPath id="mc'+o.id+'"><path d="'+outer+'"/></clipPath><g clip-path="url(#mc'+o.id+')">';
  s+='<ellipse cx="100" cy="'+(y+h-1)+'" rx="'+(w*.55)+'" ry="5" fill="#D9767C"/>';
  s+='<path d="M'+(100-w-2)+' '+(y-t-6)+' L'+(100+w+2)+' '+(y+t-6)+' L'+(100+w+2)+' '+(y+t+th*.55)+' Q100 '+(y+th+2)+' '+(100-w-2)+' '+(y-t+th*.55)+'Z" fill="#FFFDF7"/>';
  const n=o.n||8;
  for(let i=1;i<n;i++){ const x=100-w+i*(2*w/n)+(i===n/2?(o.mid||0):0); s+='<line x1="'+x+'" y1="'+(y-2)+'" x2="'+x+'" y2="'+(y+th*(1-Math.abs(i-n/2)/n))+'" stroke="#E6DAC4" stroke-width=".8"/>'; }
  s+='</g>';
  s+='<path d="M'+L+' Q100,'+(y-3)+' '+R+'" stroke="'+LIP+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  s+='<path d="M'+(100-w*.6)+' '+(y+h+1.5)+' Q100 '+(y+h+5)+' '+(100+w*.6)+' '+(y+h+1.5)+'" stroke="'+LIP+'" stroke-width="2.8" fill="none" stroke-linecap="round" opacity=".55"/>';
  s+='<path d="M'+(100-w-1)+' '+(y-t-4)+' q-3 3 -1 7 M'+(100+w+1)+' '+(y+t-4)+' q3 3 1 7" stroke="'+SKD+'" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
  return s;
}
function cheeks(y,dx,r){return '<ellipse cx="'+(100-dx)+'" cy="'+y+'" rx="'+r+'" ry="'+(r*.65)+'" fill="#F29A93" opacity=".38"/><ellipse cx="'+(100+dx)+'" cy="'+y+'" rx="'+r+'" ry="'+(r*.65)+'" fill="#F29A93" opacity=".38"/>';}
function ears(y,x1,x2){return '<ellipse cx="'+x1+'" cy="'+y+'" rx="6" ry="9" fill="'+SK+'"/><ellipse cx="'+x2+'" cy="'+y+'" rx="6" ry="9" fill="'+SK+'"/><path d="M'+(x1+1)+' '+(y-4)+' q-3 4 0 8 M'+(x2-1)+' '+(y-4)+' q3 4 0 8" stroke="'+SKD+'" stroke-width="1.2" fill="none"/>';}
function neck(w,top){return '<path d="M'+(100-w)+' '+top+' L'+(100-w)+' 176 Q100 186 '+(100+w)+' 176 L'+(100+w)+' '+top+'Z" fill="'+SK+'"/><path d="M'+(100-w)+' '+(top+6)+' Q100 '+(top+22)+' '+(100+w)+' '+(top+6)+' L'+(100+w)+' '+top+' L'+(100-w)+' '+top+'Z" fill="'+SKD+'" opacity=".55"/>';}
function strands(paths,col,op){return paths.map(d=>'<path d="'+d+'" stroke="'+col+'" stroke-width="1.1" fill="none" opacity="'+(op||.6)+'" stroke-linecap="round"/>').join('');}

const P={};
/* ---------- רוני ---------- */
P.roni=function(){
  const H='#8D6B48', HL='#B28A5E', HD='#6E5034';
  let s='';
  s+='<path d="M52 92 C48 30 152 30 148 92 C152 140 158 190 162 240 L38 240 C42 190 48 140 52 92Z" fill="'+HD+'"/>';
  s+=neck(14,140);
  s+='<path d="M14 240 C18 196 52 180 86 176 Q100 186 114 176 C148 180 182 196 186 240Z" fill="#F4ECF3"/>';
  s+='<path d="M30 214 C48 200 66 222 84 206 C96 196 112 214 126 204 C140 194 160 210 172 202 L176 220 C156 230 140 214 124 226 C108 236 92 218 74 230 C58 240 42 224 26 232Z" fill="#E6C6DF" opacity=".9"/>';
  s+='<path d="M60 186 C72 194 90 186 100 192 C114 198 126 186 140 190" stroke="#E6C6DF" stroke-width="7" fill="none" opacity=".8" stroke-linecap="round"/>';
  s+='<text x="100" y="224" text-anchor="middle" font-family="Heebo,Arial,sans-serif" font-weight="800" font-size="13" fill="#F09A6E">רוני</text>';
  s+='<path d="M63 96 C62 58 138 58 137 96 C137 134 120 158 100 160 C80 158 63 134 63 96Z" fill="'+SK+'"/>';
  s+=ears(108,63,137);
  s+='<circle cx="138" cy="122" r="4.2" fill="none" stroke="#D9A64A" stroke-width="1.6"/>';
  s+='<path d="M64 112 C60 74 76 50 104 50 C128 50 142 66 138 106 C134 86 124 70 108 64 L104 62 C88 70 72 82 64 112Z" fill="'+H+'"/>';
  s+='<path d="M64 100 C52 140 48 196 54 240 L80 240 C72 200 70 150 72 112 Z" fill="'+H+'"/>';
  s+='<path d="M136 98 C148 140 152 196 148 240 L124 240 C130 200 130 150 128 112 Z" fill="'+H+'"/>';
  s+=strands(['M60 130 C56 170 58 200 62 236','M68 120 C64 160 66 200 70 236','M140 130 C144 170 142 200 138 236','M132 120 C136 160 134 200 130 236','M104 54 C118 58 130 70 134 90','M100 56 C88 62 76 76 70 98'],HL,.7);
  s+=brows(86,17,'#8A6A4C',2.2,4);
  s+=eyes({id:'r',y:99,dx:17,w:9,iris:'#7C6A45',squint:1.5});
  s+=nose(122);
  s+=cheeks(118,26,10);
  s+=freckles(26,7,'#C88A63',[4,24,104,22]);
  s+=smile({id:'r',y:131,w:20,h:16,teethH:7.5,mid:1});
  return s;
};
/* ---------- הילי ---------- */
P.hili=function(){
  const H='#4E3424', HL='#7A5840';
  let s='';
  s+='<path d="M60 96 C56 44 144 44 140 96 L142 120 L58 120Z" fill="'+H+'"/>';
  s+='<path d="M112 108 C132 118 150 140 156 166 L140 174 C134 156 122 140 106 130Z" fill="'+H+'"/>';
  s+=neck(15,142);
  s+='<path d="M10 240 C14 194 52 178 86 176 Q100 188 114 176 C148 178 186 194 190 240Z" fill="#7E99A6"/>';
  s+='<path d="M86 176 Q100 190 114 176" stroke="#6B8592" stroke-width="3" fill="none"/>';
  s+='<path d="M54 236 C70 214 130 214 146 236" stroke="#F2B8BC" stroke-width="9" fill="none" stroke-dasharray="12 4"/>';
  s+='<path d="M60 98 C59 54 141 54 140 98 C140 140 122 164 100 165 C78 164 60 140 60 98Z" fill="'+SK+'"/>';
  s+=ears(110,60,140);
  s+='<circle cx="58" cy="121" r="1.8" fill="#fff" stroke="#c9c9c9" stroke-width=".6"/>';
  s+='<path d="M58 104 C54 52 146 52 142 104 C140 86 132 70 112 64 Q104 62 100 63 Q96 62 88 64 C68 70 60 86 58 104Z" fill="'+H+'"/>';
  s+='<path d="M100 54 L100 63" stroke="#E8C7AF" stroke-width="1.6"/>';
  s+=strands(['M98 56 C80 58 66 70 61 92','M96 60 C82 64 70 76 64 98','M102 56 C120 58 134 70 139 92','M104 60 C118 64 130 76 136 98'],HL,.75);
  s+='<g transform="translate(16 10)">';
  s+='<path d="M126 126 C150 136 164 166 154 198 C150 212 140 222 128 230 C134 216 136 206 132 196 C126 214 114 224 104 228 C118 208 126 188 124 166 C122 150 120 138 116 132Z" fill="'+H+'"/>';
  s+=strands(['M128 134 C148 150 152 182 140 212','M124 142 C138 160 138 192 128 216','M132 140 C152 158 158 186 148 206','M120 150 C128 174 124 200 112 222'],HL,.8);
  s+='</g>';
  s+=brows(86,18,'#4A3020',3.4,4.5);
  s+=eyes({id:'h',y:100,dx:18,w:9.5,iris:'#5A3F2C',squint:2.2});
  s+=nose(124);
  s+=cheeks(120,28,12);
  s+=freckles(16,3,'#C88A63',[5,22,108,16]);
  s+=smile({id:'h',y:134,w:21,h:15,teethH:7,tilt:-1.5,mid:-2,gap:2});
  return s;
};
/* ---------- אביב ---------- */
P.aviv=function(){
  const H='#9A7650', HL='#C4A074', HD='#7A5A3C';
  let s='';
  s+='<path d="M62 98 C58 46 142 46 138 98 L138 132 C120 126 80 126 62 132Z" fill="'+HD+'"/>';
  s+=neck(13,144);
  s+='<path d="M12 240 C16 198 50 182 84 178 Q100 190 116 178 C150 182 184 198 188 240Z" fill="#E6BCCB"/>';
  s+='<path d="M74 182 Q84 200 100 196 Q116 200 126 182" stroke="#D3A4B6" stroke-width="3" fill="none"/>';
  s+='<path d="M64 98 C64 60 136 60 136 98 C136 134 118 156 100 157 C82 156 64 134 64 98Z" fill="'+SK+'"/>';
  s+=ears(110,64,136);
  s+='<circle cx="66" cy="121" r="1.5" fill="#E0B8C8"/>';
  s+='<path d="M62 108 C58 56 142 54 138 100 C132 80 120 68 104 66 C90 66 76 76 70 92 Z" fill="'+H+'"/>';
  s+='<path d="M124 62 C100 60 76 70 66 112 C72 94 86 80 112 74 C118 72 124 68 124 62Z" fill="'+H+'"/>';
  s+='<path d="M68 92 C58 116 60 142 70 156 L74 152 C66 136 66 116 74 98Z" fill="'+H+'"/>';
  s+=strands(['M118 64 C98 66 80 78 70 102','M110 70 C94 74 82 84 74 100','M106 56 C122 58 134 70 137 90','M70 104 C64 122 66 140 72 152'],HL,.8);
  s+='<rect x="130" y="70" width="14" height="6" rx="2.5" fill="#F07A2A" transform="rotate(-35 137 73)"/>';
  s+=brows(88,16,'#8A6A4C',2,3.5);
  s+=eyes({id:'a',y:101,dx:16,w:8.5,iris:'#6C6050',squint:2.8});
  s+=nose(122);
  s+=cheeks(119,25,9);
  s+=freckles(34,11,'#C07F58',[3,24,104,20]);
  s+=smile({id:'a',y:132,w:18,h:13,teethH:7,tilt:-3,mid:2});
  return s;
};
/* ---------- זיו ---------- */
P.ziv=function(){
  const H='#4A3022', HM='#6B4630', HT='#9A6C46', HL='#B98A5E';
  let s='';
  /* שיער גלי: קווצה = רצועה שמתנדנדת בגלים, מתרחבת למטה */
  const lock=(xc,y0,w0,w1,amp,ph,drift)=>{ const L=[],R=[]; for(let y=y0;y<=246;y+=3){ const k=(y-y0)/(246-y0), a=amp*Math.min(1,k*2.2),
      sx=xc+drift*k+a*Math.sin((y-y0)/13+ph), w=w0+(w1-w0)*k; L.push([sx-w/2,y]); R.push([sx+w/2,y]); }
    return 'M'+L.concat(R.reverse()).map(p=>p[0].toFixed(1)+' '+p[1]).join(' L')+'Z'; };
  const wave=(xc,y0,amp,ph,drift,colr,wd,op)=>{ let d=''; for(let y=y0;y<=246;y+=3){ const k=(y-y0)/(246-y0), a=amp*Math.min(1,k*2.2); d+=(d?' L':'M')+(xc+drift*k+a*Math.sin((y-y0)/13+ph)).toFixed(1)+' '+y; }
    return '<path d="'+d+'" stroke="'+colr+'" stroke-width="'+wd+'" fill="none" stroke-linecap="round" opacity="'+op+'"/>'; };
  /* מאחור: נפח רחב */
  [[-1,62],[1,138]].forEach(([d,x])=>{ s+='<path d="'+lock(x,72,16,58,6,d>0?1.2:0,d*14)+'" fill="'+H+'"/>'; });
  s+='<linearGradient id="zt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+HT+'" stop-opacity="0"/><stop offset=".55" stop-color="'+HT+'" stop-opacity=".2"/><stop offset="1" stop-color="'+HL+'" stop-opacity=".95"/></linearGradient>';
  s+='<path d="M54 100 C46 30 154 30 146 100 C150 140 146 180 130 200 L70 200 C54 180 50 140 54 100Z" fill="'+H+'"/>';
  s+=neck(13,140);
  s+='<path d="M12 240 C16 196 52 180 86 176 L100 214 L114 176 C148 180 184 196 188 240Z" fill="#203560"/>';
  s+='<path d="M86 176 L100 214 L114 176 Q100 182 86 176Z" fill="#141414"/>';
  s+='<g fill="#E8D9A8" opacity=".85"><circle cx="30" cy="206" r="2"/><circle cx="38" cy="198" r="2"/><circle cx="44" cy="210" r="2"/><circle cx="170" cy="206" r="2"/><circle cx="162" cy="198" r="2"/><circle cx="156" cy="210" r="2"/></g>';
  s+='<path d="M90 176 Q100 196 110 176" stroke="#D9A64A" stroke-width="1" fill="none"/><path d="M96 194 c1.5 -2.5 3.5 -2.5 4 0 c.5 2.5 2.5 2.5 4 0 c-1.5 -2.5 -3.5 -2.5 -4 0 c-.5 2.5 -2.5 2.5 -4 0Z" fill="none" stroke="#D9A64A" stroke-width="1.1"/>';
  s+='<path d="M65 94 C65 54 135 54 135 94 C135 136 118 160 100 162 C82 160 65 136 65 94Z" fill="'+SK+'"/>';
  s+=ears(108,65,135);
  s+='<circle cx="138" cy="124" r="6.5" fill="none" stroke="#D9A64A" stroke-width="1.6"/><circle cx="62" cy="124" r="6.5" fill="none" stroke="#D9A64A" stroke-width="1.6" opacity=".7"/>';
  s+='<path d="M64 108 C58 60 80 46 100 46 C120 46 142 60 136 108 C134 86 124 66 102 60 L98 60 C76 66 66 86 64 108Z" fill="'+H+'"/>';
  [[-1,68,0],[1,132,1.3]].forEach(([d,x,ph])=>{ const p=lock(x,84,12,30,7,ph,d*20); s+='<path d="'+p+'" fill="'+H+'"/><path d="'+p+'" fill="url(#zt)"/>'; });
  [[-1,66,0],[-1,72,.6],[1,134,1.3],[1,128,1.9]].forEach(([d,x,ph])=>{ s+=wave(x,96,7,ph,d*20,HL,1.4,.75); });
  s+=strands(['M96 52 C80 56 70 72 66 96','M104 52 C120 56 130 72 134 96'],HL,.7);
  s+=brows(84,17,'#3E2A1E',2.8,5);
  s+=eyes({id:'z',y:98,dx:17,w:9.5,iris:'#7A8A52',squint:1,liner:1});
  s+=nose(122);
  s+=cheeks(118,25,9);
  s+=freckles(10,5,'#C88A63',[5,20,106,12]);
  s+=smile({id:'z',y:132,w:20,h:15,teethH:7,mid:0});
  return s;
};
function portrait(pid,mode){ const body=P[pid]?P[pid]():P.ziv();
  if(mode==='av') return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="24 30 152 152">'+body+'</svg>';
  if(mode==='head') return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 30 120 140"><clipPath id="hc"><ellipse cx="100" cy="100" rx="60" ry="70"/></clipPath><g clip-path="url(#hc)">'+body+'</g></svg>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">'+body+'</svg>'; }
const CACHE={};
/* מ-31.10.2026: הדמויות מצוירות ישר מהתמונות של הבנות (avatar עגול + ראש לפודיום ולטקס) */
/* מ-31.10.2026 (ערב): הדמויות מהציור המשותף של ארבע הבנות — גוף מלא (full), עיגול (av), ראש (head), חזה (bust) */
/* 1.11.2026 (עומר): הציורים בקבצים נפרדים (img/) — הקובץ הראשי קטן ב-177KB ונטען מהר יותר */
const PHOTO={};
root.TM_FULL={"aviv": {"w": 77, "h": 255, "chest": 0.64}, "roni": {"w": 82, "h": 302, "chest": 0.62}, "ziv": {"w": 92, "h": 340, "chest": 0.63}, "hili": {"w": 91, "h": 308, "chest": 0.6}, "dad": {"w": 115, "h": 360, "chest": 0.71}};
root.TM_IMG=function(pid,mode){ const k=pid+'|'+(mode||''); if(PHOTO[k]) return PHOTO[k]; if(!CACHE[k]) CACHE[k]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(portrait(pid,mode)); return CACHE[k]; };
/* גוף שמתחבר לציור: צבע החולצה האמיתית, רוחב כתפיים מהציור */
root.TM_BODY={roni:{shirt:'#E7DCE6',sw:.78,sc:-.05,sz:50},hili:{shirt:'#7FA2BC',sw:.89,sc:-.034,sz:50},aviv:{shirt:'#C9A3C3',sw:1,sc:0,sz:50},ziv:{shirt:'#27365C',sw:.88,sc:-.061,sz:62}};
root.TM_AV=function(pid,px){ return '<img class="tm-av" alt="" src="'+root.TM_IMG(pid,'av')+'" style="width:'+px+'px;height:'+px+'px">'; };
root.TM_PORTRAIT=portrait;
root.TM_HAS=function(pid){return !!P[pid];};
})(typeof window!=='undefined'?window:globalThis);
