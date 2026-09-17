(function(root){
'use strict';

const BLOCK_START=/^(?:Définitions|Définition|Propriété|Méthode|Remarques|Remarque|Rappels|Rappel|Règle\s*\d*|À retenir|Point clé)\s*:?/i;
const BAD_END=/\b(?:de|du|des|d'|d’|le|la|les|un|une|et|ou|à|au|aux|en|par|pour|avec|sans|dans|sur|sous|que|qui|dont|comme|si|entre|vers|chez|ce|cet|cette|ces|son|sa|ses|leur|leurs)\s*[,:;]?$/i;

function normalizeFrench(text){
  let s=String(text||'').normalize('NFC')
    .replace(/\r/g,'\n')
    .replace(/DéOinition/gi,'Définition')
    .replace(/DeOinition/gi,'Définition')
    .replace(/coefOicients?/gi,m=>/s$/i.test(m)?'coefficients':'coefficient')
    .replace(/sufOit/gi,'suffit')
    .replace(/signiWie/gi,'signifie')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n');
  const stems=[
    ['litté rale','littérale'],['litté rales','littérales'],
    ['dé velopper','développer'],['dé veloppée','développée'],['dé veloppement','développement'],
    ['mathé matiques','mathématiques'],['numé rique','numérique'],['numé riques','numériques'],
    ['algé brique','algébrique'],['algé briques','algébriques'],
    ['monô me','monôme'],['monô mes','monômes'],['coefficient s','coefficients'],
    ['é mise','émise'],['é té','été'],['prouvé e','prouvée'],['montré e','montrée'],
    ['maniè re','manière'],['rè gle','règle'],['ê tre','être'],['mé thode','méthode'],
    ['monô me','monôme'],['monô mes','monômes'],['ré sultat','résultat'],['ré sultats','résultats'],['dé montré','démontré'],['dé montrée','démontrée'],['dé montrés','démontrés'],['dé montrées','démontrées']
  ];
  for(const [a,b] of stems)s=s.split(a).join(b);
  return s.trim();
}

function cleanLine(s){
  return normalizeFrench(s)
    .replace(/[█■□�Ø]/g,' ')
    .replace(/\.{5,}/g,' ')
    .replace(/_{3,}/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1')
    .replace(/\s+/g,' ')
    .trim();
}

function stripPrefix(s){
  return cleanLine(s)
    .replace(/^\s*[►➤▶•·Ø#]+\s*/,'')
    .replace(/^\s*\d+[.)]?\s+(?=[A-ZÀ-ÖØ-Þ])/u,'')
    .replace(BLOCK_START,'')
    .trim();
}

function wordCount(s){return (s.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*/g)||[]).length}
function alphaRatio(s){return (s.match(/[A-Za-zÀ-ÿ]/g)||[]).length/Math.max(1,s.length)}
function hasCorruptMath(s){
  if(/[�█■□]/.test(s))return true;
  if(/[$%]{1,}|!\s*\$|\$\s*[-+!%]/.test(s))return true;
  const symbols=(s.match(/[=#<>+*\\|~^]/g)||[]).length;
  return symbols>=3 && alphaRatio(s)<.72;
}
function isNoiseLine(s){
  const x=cleanLine(s);
  return !x || /https?:\/\//i.test(x) || /\bCOURSIMAULT\b/i.test(x) || /^\d+\s*$/.test(x)
    || /^Chapitre\b/i.test(x) || /^Exercice\s*\d+/i.test(x) || /^Application\s*\d*/i.test(x)
    || /^Exemples?\s*:?$/i.test(x) || /^Démonstration\s*:?$/i.test(x)
    || /^Dans\s+Amplitude/i.test(x);
}
function validTerm(s){
  s=stripPrefix(s).replace(/^En mathématiques,\s*(?:une|un)\s+/i,'').replace(/^La\s+/i,'La ').trim();
  if(!s||s.length<2||s.length>95)return null;
  if(/^(?:Dans ce cas|Dans ce contexte|Il|Elle|Ils|Elles|Cette|Ce|Ces)\b/i.test(s))return null;
  if(hasCorruptMath(s)||/[\$%!#=<>*\\|~^]/.test(s)||alphaRatio(s)<.68)return null;
  s=s.replace(/^Développer\s*\/\s*Effectuer\s+/i,'Développer ');
  return s;
}
function validAnswer(s){
  s=stripPrefix(s);
  if(!s||s.length<8||s.length>300||wordCount(s)<2)return null;
  if(BAD_END.test(s)||hasCorruptMath(s))return null;
  if(/\b(?:COURSIMAULT|Chapitre|2025|2026|2027)\b/i.test(s))return null;
  return s;
}
function validSentence(s){
  s=stripPrefix(s);
  if(!s||s.length<18||s.length>300||wordCount(s)<4)return null;
  if(BAD_END.test(s)||hasCorruptMath(s))return null;
  if(/\b(?:COURSIMAULT|Chapitre|2025|2026|2027)\b/i.test(s))return null;
  if(/\bon\s+Règle\b/i.test(s))return null;
  if(/\bne contient plus de termes\.?$/i.test(s))return null;
  return s;
}
function pageBlocks(text){
  const p=String(text).split(/\[\[PAGE:(\d+)\]\]/),out=[];
  if(p.length===1)return[{page:1,text}];
  for(let i=1;i<p.length;i+=2)out.push({page:+p[i],text:p[i+1]||''});
  return out;
}
function joinBlocks(lines){
  const out=[];let b='';
  const flush=()=>{if(b){out.push(b.trim());b=''}};
  for(const raw of lines){
    const x=cleanLine(raw);
    if(isNoiseLine(x))continue;
    if(BLOCK_START.test(x)){flush();b=x;continue;}
    if(!b){b=x;continue;}
    if(/^[•►➤▶Ø]/.test(raw.trim())){b+=' '+x;continue;}
    if(/[.!?]$/.test(b)||(b+' '+x).length>360){flush();b=x}else b+=' '+x;
  }
  flush();return out;
}
function canonicalTopic(s){
  const raw=stripPrefix(s).toLowerCase()
    .replace(/«\s*\+\s*»/g,' plus ').replace(/«\s*-\s*»/g,' moins ').replace(/«\s*·\s*»/g,' multiplication ')
    .replace(/[^a-zà-ÿ0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const reduced=raw
    .replace(/\b(?:une|un|le|la|les|des|de|du|d|est|sont|en|mathématiques|définition|règle|méthode)\b/g,' ')
    .replace(/\s+/g,' ').trim();
  return reduced||raw||'notion';
}
function similarity(a,b){
  const A=new Set(canonicalTopic(a).split(' ').filter(Boolean)),B=new Set(canonicalTopic(b).split(' ').filter(Boolean));
  if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});
  return n/Math.max(1,Math.min(A.size,B.size));
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function parseDefinition(content,meta){
  const x=stripPrefix(content);
  const pats=[
    /^(.{2,105}?)\s+(est une|est un|est le|est la|sont des|signifie|désigne|correspond à|se définit comme|consiste en|comprend|contient)\s+(.+)$/i,
    /^(.{2,105}?)\s+(a pour rôle de|a pour fonction de|a pour objectif de)\s+(.+)$/i
  ];
  for(const p of pats){
    const m=x.match(p);if(!m)continue;
    const term=validTerm(m[1]),definition=validAnswer(m[3]);
    if(term&&definition)return{kind:'definition',term,answer:definition,verb:m[2],page:meta.page,source:content};
  }
  return null;
}
function parseCapability(content,meta){
  const x=stripPrefix(content),m=x.match(/^(.{3,110}?)\s+permet de\s+(.+)$/i);
  if(!m)return null;
  const term=validTerm(m[1]),rest=validAnswer(m[2]);
  if(!term||!rest)return null;
  return{kind:'capability',term,answer:`${rest.replace(/^de\s+/i,'')}`,page:meta.page,source:content};
}
function contradiction(action,answer){
  const a=action.toLowerCase(),b=answer.toLowerCase();
  const pairs=[['ajouter','soustraire'],['additionner','soustraire'],['soustraire','ajouter'],['développer','factoriser'],['factoriser','développer'],['sans changer','en changeant'],['en changeant','sans changer']];
  return pairs.some(([x,y])=>a.includes(x)&&b.includes(y));
}
function parseProcedure(content,meta){
  const x=stripPrefix(content);
  const m=x.match(/^Pour\s+(.{4,145}?),\s*(.+)$/i);
  if(!m)return null;
  const action=validTerm(m[1]);
  let rawAnswer=m[2].replace(/^il suffit de\s*:?\s*/i,'').replace(/;\s*(?:multiplier|recopier|additionner|soustraire|appliquer)/gi, m=>' et '+m.replace(/^;\s*/,'')).replace(/\s+/g,' ').trim();
  const answer=validSentence(rawAnswer);
  if(!action||!answer||contradiction(action,answer))return null;
  return{kind:'procedure',term:action,answer,page:meta.page,source:content};
}
function parseAlias(content,meta){
  const x=stripPrefix(content),m=x.match(/^(.{3,110}?)\s+est aussi appelée?\s+(.+)$/i);
  if(!m)return null;
  const term=validTerm(m[1]),answer=validTerm(m[2].replace(/[.]$/,''));
  if(!term||!answer)return null;
  return{kind:'alias',term,answer,page:meta.page,source:content};
}
function parseFactDefinition(content,meta){
  const x=stripPrefix(content),m=x.match(/^(.{3,120}?)\s+est\s+(.+)$/i);
  if(!m)return null;
  const term=validTerm(m[1]),answer=validAnswer(m[2]);
  if(!term||!answer)return null;
  if(/^(?:cette méthode|la multiplication|un nombre|soient)\b/i.test(term))return null;
  return{kind:'definition',term,answer,verb:'est',page:meta.page,source:content};
}

function extractKnowledge(text){
  const bank=[];
  const byTopic=new Map();
  const add=(item)=>{
    if(!item)return;
    const k=[item.kind,canonicalTopic(item.term)].join('|');
    const old=byTopic.get(k);
    if(!old){byTopic.set(k,item);bank.push(item);return;}
    if(item.answer.length>old.answer.length+8){Object.assign(old,item);byTopic.set(k,old)}
  };
  for(const pg of pageBlocks(text)){
    const rawLines=pg.text.split('\n');
    for(const block of joinBlocks(rawLines)){
      const meta={page:pg.page};
      let item=null;
      const stripped=stripPrefix(block);
      if(/^Pour\s+/i.test(stripped))item=parseProcedure(block,meta);
      if(!item&&/\s+permet de\s+/i.test(stripped))item=parseCapability(block,meta);
      if(!item&&/est aussi appelée?/i.test(stripped))item=parseAlias(block,meta);
      if(!item)item=parseDefinition(block,meta);
      if(!item&&/^(?:Remarque|Rappel)/i.test(block))item=parseFactDefinition(block,meta);
      add(item);
    }
    for(let i=0;i<rawLines.length;i++){
      const a=cleanLine(rawLines[i]);
      if(isNoiseLine(a))continue;
      let stitched=a;
      if((BLOCK_START.test(a)||/^Pour\s+/i.test(stripPrefix(a))||/permet de/i.test(a)) && i+1<rawLines.length){
        const b=cleanLine(rawLines[i+1]);
        if(b&&!BLOCK_START.test(b)&&!isNoiseLine(b))stitched+=' '+b;
      }
      const meta={page:pg.page};
      let item=null,st=stripPrefix(stitched);
      if(/^Pour\s+/i.test(st))item=parseProcedure(stitched,meta);
      if(!item&&/\s+permet de\s+/i.test(st))item=parseCapability(stitched,meta);
      if(!item&&BLOCK_START.test(stitched)&&/^Pour\s+/i.test(st))item=parseProcedure(stitched,meta);
      add(item);
    }
    for(let i=0;i<rawLines.length-1;i++){
      const a=cleanLine(rawLines[i]),b=cleanLine(rawLines[i+1]);
      const m=a.match(/Règle\s*1\s*:\s*Pour\s+(.+?),\s*on\s+Règle\s*2\s*:\s*Pour\s+(.+?),?$/i);
      if(m){
        const parts=b.split(/\s{2,}/).map(cleanLine).filter(Boolean);
        if(parts.length>=2){
          const a1=validTerm(m[1]),a2=validTerm(m[2]),r1=validAnswer(parts[0]),r2=validAnswer(parts.slice(1).join(' '));
          if(a1&&r1)add({kind:'procedure',term:a1,answer:r1,page:pg.page,source:a+' '+b});
          if(a2&&r2)add({kind:'procedure',term:a2,answer:r2,page:pg.page,source:a+' '+b});
        }
      }
    }
  }
  return bank;
}

function normalizeTermForQuestion(term){
  return String(term||'').replace(/^(Une|Un|Le|La|Les)\s+/i,'').trim();
}
function questionText(item,type){
  if(type==='definition'){
    const t=normalizeTermForQuestion(item.term);
    if(/^(?:Développer|Effectuer|Réduire|Calculer|Supprimer|Ajouter|Soustraire|Multiplier|Diviser)\b/i.test(item.term))
      return `Que signifie « ${item.term.charAt(0).toLowerCase()+item.term.slice(1)} » ?`;
    return `Quelle est la définition de « ${t} » ?`;
  }
  if(type==='reverse')return `Quel terme correspond à cette définition : « ${item.answer} » ?`;
  if(type==='procedure'){
    const t=item.term.trim();
    if(/^réduire\b/i.test(t))return `Comment réduit-on ${t.replace(/^réduire\s+/i,'')} ?`;
    if(/^calculer\b/i.test(t))return `Comment calcule-t-on ${t.replace(/^calculer\s+/i,'')} ?`;
    return `Que faut-il faire pour ${t} ?`;
  }
  if(type==='capability')return `Que permet ${item.term.replace(/^La\s+/,'la ')} ?`;
  if(type==='alias')return `Quel autre nom donne-t-on à « ${normalizeTermForQuestion(item.term)} » ?`;
  return '';
}
function familyKey(item){
  const t=canonicalTopic(item.term||'');
  if(/parenth[eè]ses|signe|symbole/.test(t))return 'parentheses';
  if(/distributiv|développ|produit/.test(t))return 'developpement';
  if(/mon[oô]me|polyn[oô]me|terme|coefficient/.test(t))return 'algebre';
  if(/expression litt/.test(t))return 'expression';
  if(/conjecture|proposition/.test(t))return 'raisonnement';
  return t.split(' ').slice(0,2).join(' ');
}
function candidateItems(bank,item,type){
  if(type==='reverse')return bank.filter(x=>x.kind==='definition'&&x!==item).map(x=>({text:x.term,item:x}));
  if(type==='alias')return [...bank.filter(x=>x.kind==='definition').map(x=>({text:x.term,item:x})),...bank.filter(x=>x.kind==='alias').map(x=>({text:x.answer,item:x}))].filter(x=>x.text!==item.term&&x.text!==item.answer);
  if(type==='procedure')return bank.filter(x=>x.kind==='procedure'&&x!==item).map(x=>({text:x.answer,item:x}));
  if(type==='capability')return [...bank.filter(x=>x.kind==='capability'&&x!==item).map(x=>({text:x.answer,item:x})),...bank.filter(x=>x.kind==='procedure').map(x=>({text:x.term,item:x}))];
  return bank.filter(x=>x.kind==='definition'&&x!==item).map(x=>({text:x.answer,item:x}));
}
function pickDistractors(candidates,answer,item,desired=3){
  const answerLen=answer.length,targetFamily=familyKey(item),scored=[];
  for(const c of candidates){
    const x=c.text;
    if(x===answer||!x||typeSafe(x)===false)continue;
    const ratio=Math.max(x.length,answerLen)/Math.max(1,Math.min(x.length,answerLen));
    const lenPenalty=Math.abs(x.length-answerLen)/Math.max(30,answerLen);
    const sim=similarity(x,answer);
    if(sim>.82||ratio>4.2)continue;
    const sameFamily=familyKey(c.item||{})===targetFamily?1:0;
    const samePage=(c.item&&c.item.page===item.page)?1:0;
    scored.push({x,score:1.2+sameFamily*.8+samePage*.15-lenPenalty*.8+sim*.18});
  }
  const picked=[];
  for(const o of scored.sort((a,b)=>b.score-a.score)){
    if(!picked.includes(o.x))picked.push(o.x);
    if(picked.length===desired)break;
  }
  return picked;
}
function typeSafe(s){return !!(validAnswer(s)||validTerm(s));}
function explanation(item){
  if(item.kind==='definition')return `${item.term} ${item.verb||'est'} ${item.answer}.`;
  if(item.kind==='capability')return `${item.term} permet de ${item.answer}.`;
  if(item.kind==='alias')return `${item.term} est aussi appelée ${item.answer}.`;
  if(item.kind==='procedure')return `Pour ${item.term}, ${item.answer}`.replace(/\.{2,}$/,'.');
  return item.source;
}
function makeQuestion(bank,item,type,index){
  const q={id:`q-${index}-${type}`,topic:canonicalTopic(item.term),page:item.page,type,source:item.source,hint:`Relis le passage du cours concernant « ${item.term} ».`,explanation:explanation(item)};
  q.question=questionText(item,type);
  if(type==='reverse'){
    q.answer=item.term;
    const ds=pickDistractors(candidateItems(bank,item,type),q.answer,item,3);
    if(ds.length<2)return null;q.options=shuffle([q.answer,...ds]);
  }else{
    q.answer=item.answer;
    const ds=pickDistractors(candidateItems(bank,item,type),q.answer,item,3);
    if(ds.length<2)return null;q.options=shuffle([q.answer,...ds]);
  }
  return validateQuestion(q)?q:null;
}
function validateQuestion(q){
  if(!q||!q.question||!q.answer||!Array.isArray(q.options))return false;
  if(hasCorruptMath(q.question)||hasCorruptMath(q.answer))return false;
  if(q.options.length<2||new Set(q.options).size!==q.options.length||!q.options.includes(q.answer))return false;
  if(q.options.some(x=>hasCorruptMath(x)))return false;
  if(q.type==='procedure'&&contradiction(q.question,q.answer))return false;
  if(BAD_END.test(q.answer))return false;
  return true;
}
function qualityScore(q){
  let s=100;
  if(q.type==='application')s+=22;
  if(q.type==='capability')s+=14;
  if(q.type==='alias')s+=7;
  if(q.type==='procedure')s+=6;
  if(q.type==='reverse')s+=2;
  if(q.question.length>180)s-=10;
  const lens=q.options.map(x=>x.length),max=Math.max(...lens),min=Math.min(...lens);
  if(max-min>150)s-=10;
  if(q.options.some(o=>o.length<12)&&q.type!=='reverse'&&q.type!=='alias'&&q.type!=='application')s-=8;
  return s;
}

function mathProfile(text){
  const t=normalizeFrench(text).toLowerCase();
  const has=(re)=>re.test(t);
  return{
    reduce:has(/réduire\s+une\s+expression|termes\s+semblables/),
    simpleDistributivity:has(/distributivit[eé]\s+simple|distributivit[eé]\s+de\s+la\s+multiplication/)&&has(/développer|produit\s+.*somme/),
    parenthesesPlus:has(/parenth[eè]ses?\s+précédées?\s+d[’']un\s+(?:symbole|signe)\s*[«"]?\s*\+|pour\s+ajouter\s+une\s+somme\s+alg[eé]brique/),
    parenthesesMinus:has(/parenth[eè]ses?\s+précédées?\s+d[’']un\s+(?:symbole|signe)\s*[«"]?\s*-|pour\s+soustraire\s+une\s+somme\s+alg[eé]brique/),
    monomialProduct:has(/produit\s+alg[eé]brique\s+de\s+mon[oô]mes|multiplier\s+les\s+coefficients/),
    doubleDistributivity:has(/distributivit[eé]\s+double/)
  };
}
function compactLinear(a,b){
  let out='';
  if(a===1)out='x'; else if(a===-1)out='−x'; else out=`${a}x`;
  if(b>0)out+=` + ${b}`; else if(b<0)out+=` − ${Math.abs(b)}`;
  return out;
}
function uniqueOptions(answer,wrong){
  const out=[answer];
  for(const x of wrong){if(x&&x!==answer&&!out.includes(x))out.push(x)}
  return out.length>=4?shuffle(out.slice(0,4)):null;
}
function makeMathQuestion(id,topic,page,question,answer,wrong,explanation,source){
  const options=uniqueOptions(answer,wrong);if(!options)return null;
  return{id,topic,page,type:'application',question,answer,options,hint:'Appuie-toi sur la règle du cours avant de calculer.',explanation,source};
}
function generateMathApplications(text,bank){
  const p=mathProfile(text),qs=[];let n=0;
  const pageFor=(re)=>{const hit=bank.find(x=>re.test((x.term+' '+x.source).toLowerCase()));return hit?.page||1};
  if(p.simpleDistributivity){
    const page=pageFor(/distribut|développ/);
    for(const [k,b] of [[3,2],[4,5],[-2,3],[5,-2]]){
      const ans=compactLinear(k,k*b);
      const wrong=[compactLinear(k,b),compactLinear(1,k*b),compactLinear(k,k+b),compactLinear(k,b*k+(k>0?1:-1))];
      const q=makeMathQuestion(`app-dist-${n++}`,'distributivité simple',page,`Développe : ${k}(x ${b>=0?'+':'−'} ${Math.abs(b)})`,ans,wrong,`On distribue ${k} à chacun des deux termes : ${k}×x ${b>=0?'+':'−'} ${k}×${Math.abs(b)} = ${ans}.`,'Règle de distributivité simple repérée dans le cours.');
      if(q)qs.push(q);
    }
  }
  if(p.reduce){
    const page=pageFor(/rédu|semblable/);
    for(const [a,b] of [[3,5],[7,-2],[-4,9],[6,3]]){
      const c=a+b,ans=`${c}x`;
      const wrong=[`${a*b}x`,`${c}x²`,`${Math.abs(a)+Math.abs(b)}x`,`${c}`];
      const q=makeMathQuestion(`app-red-${n++}`,'réduction termes semblables',page,`Réduis : ${a}x ${b>=0?'+':'−'} ${Math.abs(b)}x`,ans,wrong,`Les deux termes sont semblables : on additionne leurs coefficients. ${a} ${b>=0?'+':'−'} ${Math.abs(b)} = ${c}.`,'Méthode de réduction des termes semblables repérée dans le cours.');
      if(q)qs.push(q);
    }
  }
  if(p.parenthesesMinus){
    const page=pageFor(/parenth|soustraire/);
    for(const [a,b,c] of [[1,2,3],[4,1,5],[3,-2,4],[2,3,-1]]){
      const A=a-b,B=-c,ans=compactLinear(A,B);
      const wrong=[compactLinear(A,c),compactLinear(a+b,c),compactLinear(a+b,-c),compactLinear(a-b,c===0?1:c)];
      const inside=compactLinear(b,c);
      const q=makeMathQuestion(`app-par-${n++}`,'suppression parenthèses moins',page,`Réduis : ${a===1?'x':a+'x'} − (${inside})`,ans,wrong,`Le signe − devant la parenthèse change le signe de chacun des termes : ${a===1?'x':a+'x'} − ${b}x ${c>=0?'−':'+'} ${Math.abs(c)}, puis on réduit. Résultat : ${ans}.`,'Règle de suppression des parenthèses précédées de − repérée dans le cours.');
      if(q)qs.push(q);
    }
  }
  if(p.parenthesesPlus){
    const page=pageFor(/parenth|ajouter/);
    for(const [a,b,c] of [[2,3,4],[1,-2,5],[4,2,-3]]){
      const A=a+b,B=c,ans=compactLinear(A,B),inside=compactLinear(b,c);
      const wrong=[compactLinear(a-b,-c),compactLinear(a+b,-c),compactLinear(a-b,c),compactLinear(a,c)];
      const q=makeMathQuestion(`app-plus-${n++}`,'suppression parenthèses plus',page,`Réduis : ${a===1?'x':a+'x'} + (${inside})`,ans,wrong,`Le signe + devant la parenthèse ne change aucun signe ; on enlève les parenthèses puis on réduit. Résultat : ${ans}.`,'Règle de suppression des parenthèses précédées de + repérée dans le cours.');
      if(q)qs.push(q);
    }
  }
  if(p.monomialProduct){
    const page=pageFor(/produit alg|coefficient/);
    for(const [a,b] of [[2,3],[4,-2],[-3,-5],[5,2]]){
      const coef=a*b,ans=`${coef}x²`;
      const wrong=[`${coef}x`,`${a+b}x²`,`${Math.abs(coef)}x`,`${a*b}x³`];
      const q=makeMathQuestion(`app-prod-${n++}`,'produit de monômes',page,`Calcule : (${a}x) × (${b}x)`,ans,wrong,`On multiplie les coefficients (${a}×${b}=${coef}) et x×x=x². Résultat : ${ans}.`,'Méthode du produit algébrique de monômes repérée dans le cours.');
      if(q)qs.push(q);
    }
  }
  if(p.doubleDistributivity){
    const page=pageFor(/double/);
    for(const [a,b,c,d] of [[1,2,1,3],[1,-2,1,4]]){
      const A=a*c,B=a*d+b*c,C=b*d;
      const ans=`${A===1?'x²':A+'x²'} ${B>=0?'+':'−'} ${Math.abs(B)}x ${C>=0?'+':'−'} ${Math.abs(C)}`;
      const wrong=[`${A===1?'x²':A+'x²'} ${a*d>=0?'+':'−'} ${Math.abs(a*d)}x ${C>=0?'+':'−'} ${Math.abs(C)}`,`${A===1?'x²':A+'x²'} ${B>=0?'+':'−'} ${Math.abs(B)}x`,`${A===1?'x²':A+'x²'} ${C>=0?'+':'−'} ${Math.abs(C)}`,`${A===1?'x²':A+'x²'} ${Math.abs(B)}x ${Math.abs(C)}`];
      const q=makeMathQuestion(`app-double-${n++}`,'double distributivité',page,`Développe : (x ${b>=0?'+':'−'} ${Math.abs(b)})(x ${d>=0?'+':'−'} ${Math.abs(d)})`,ans,wrong,`On applique la double distributivité puis on réduit les termes en x. Résultat : ${ans}.`,'Propriété de double distributivité repérée dans le cours.');
      if(q)qs.push(q);
    }
  }
  return qs.filter(validateQuestion);
}

function buildQuiz(text,count=10){
  const bank=extractKnowledge(text);
  const generated=[];let i=0;
  for(const item of bank){
    let types=[];
    if(item.kind==='definition')types=['definition','reverse'];
    else if(item.kind==='procedure')types=['procedure'];
    else if(item.kind==='capability')types=['capability'];
    else if(item.kind==='alias')types=['alias'];
    for(const type of types){const q=makeQuestion(bank,item,type,i++);if(q)generated.push(q)}
  }
  const applications=generateMathApplications(text,bank);
  generated.push(...applications);
  const clean=generated.filter(validateQuestion).sort((a,b)=>qualityScore(b)-qualityScore(a));
  const chosen=[],topicUse=new Map(),pageUse=new Map(),typeUse=new Map();
  const addChosen=(q)=>{chosen.push(q);topicUse.set(q.topic,(topicUse.get(q.topic)||0)+1);pageUse.set(q.page,(pageUse.get(q.page)||0)+1);typeUse.set(q.type,(typeUse.get(q.type)||0)+1)};
  const appTarget=applications.length?Math.min(applications.length,Math.max(2,Math.round(count*.40))):0;
  const appMax=applications.length?Math.min(applications.length,Math.max(appTarget,Math.ceil(count*.50))):0;
  for(const q of clean.filter(x=>x.type==='application')){
    if((typeUse.get('application')||0)>=appTarget)break;
    if((topicUse.get(q.topic)||0)>=1)continue;
    addChosen(q);
  }
  const seedGroups=[['procedure','capability'],['definition'],['reverse','alias']];
  for(const types of seedGroups){
    if(chosen.length>=count)break;
    const q=clean.find(x=>types.includes(x.type)&&!chosen.includes(x)&&(topicUse.get(x.topic)||0)<2);
    if(q)addChosen(q);
  }
  while(chosen.length<count){
    let best=null,bestScore=-1e9;
    for(const q of clean){
      if(chosen.includes(q))continue;
      const tu=topicUse.get(q.topic)||0,pu=pageUse.get(q.page)||0,ty=typeUse.get(q.type)||0;
      if(tu>=2)continue;
      if(q.type==='application'&&(typeUse.get('application')||0)>=appMax)continue;
      let score=qualityScore(q)-tu*28-pu*4-ty*3;
      if(tu===0)score+=14;
      if(q.type==='application')score+=10;
      if(score>bestScore){bestScore=score;best=q}
    }
    if(!best)break;
    addChosen(best);
  }
  if(chosen.length<count){for(const q of clean){if(chosen.length>=count)break;if(!chosen.includes(q))chosen.push(q)}}
  if(chosen.length<Math.min(5,count))throw new Error('Le document ne contient pas assez de notions lisibles pour fabriquer un quiz fiable.');
  return{questions:shuffle(chosen.slice(0,count)),bank,generated:clean,applications,requested:count,actual:Math.min(count,chosen.length)};
}

root.QuizzEngine={normalizeFrench,extractKnowledge,buildQuiz,validateQuestion,qualityScore,generateMathApplications,mathProfile};
if(typeof module!=='undefined'&&module.exports)module.exports=root.QuizzEngine;
})(typeof window!=='undefined'?window:globalThis);
