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
  return stripPrefix(s).toLowerCase()
    .replace(/«\s*\+\s*»/g,' plus ').replace(/«\s*-\s*»/g,' moins ').replace(/«\s*·\s*»/g,' multiplication ')
    .replace(/\b(?:une|un|le|la|les|des|de|du|d|est|sont|en|mathématiques|expression|littérale|définition|règle|méthode)\b/g,' ')
    .replace(/[^a-zà-ÿ0-9]+/g,' ').replace(/\s+/g,' ').trim();
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
  const answer=validAnswer(rawAnswer);
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

function questionText(item,type){
  if(type==='definition')return `Quelle définition correspond à « ${item.term} » ?`;
  if(type==='reverse')return `Quel terme correspond à la définition suivante : « ${item.answer} » ?`;
  if(type==='procedure')return `Que faut-il faire pour ${item.term} ?`;
  if(type==='capability')return `Que permet ${item.term.replace(/^La\s+/,'la ')} ?`;
  if(type==='alias')return `Comment appelle-t-on aussi « ${item.term} » ?`;
  return '';
}
function candidatePool(bank,item,type){
  if(type==='reverse')return bank.filter(x=>x.kind==='definition').map(x=>x.term);
  if(type==='alias')return [...bank.filter(x=>x.kind==='definition').map(x=>x.term),...bank.filter(x=>x.kind==='alias').map(x=>x.answer)].filter(x=>x!==item.term&&x!==item.answer);
  if(type==='procedure')return bank.filter(x=>x.kind==='procedure').map(x=>x.answer);
  if(type==='capability')return bank.filter(x=>x.kind==='capability').map(x=>x.answer);
  return bank.filter(x=>x.kind==='definition').map(x=>x.answer);
}
function pickDistractors(pool,answer,desired=3){
  const answerLen=answer.length;
  const scored=[];
  for(const x of [...new Set(pool)]){
    if(x===answer||!x)continue;
    if(typeSafe(x)===false)continue;
    const ratio=Math.max(x.length,answerLen)/Math.max(1,Math.min(x.length,answerLen));
    const lenPenalty=Math.abs(x.length-answerLen)/Math.max(30,answerLen);
    const sim=similarity(x,answer);
    if(sim>.78||ratio>3.2)continue;
    scored.push({x,score:1-lenPenalty+sim*.25+Math.random()*.08});
  }
  return scored.sort((a,b)=>b.score-a.score).slice(0,desired).map(o=>o.x);
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
    const ds=pickDistractors(candidatePool(bank,item,type),q.answer,3);
    if(ds.length<2)return null;q.options=shuffle([q.answer,...ds]);
  }else{
    q.answer=item.answer;
    const ds=pickDistractors(candidatePool(bank,item,type),q.answer,3);
    if(ds.length<2)return null;q.options=shuffle([q.answer,...ds]);
  }
  return validateQuestion(q)?q:null;
}
function makeTrueFalse(item,index,truth=true){
  if(item.kind!=='definition')return null;
  const statement=truth?`${item.term} ${item.verb||'est'} ${item.answer}.`:null;
  if(!statement)return null;
  return{id:`q-${index}-vf`,topic:canonicalTopic(item.term),page:item.page,type:'truefalse',question:`Vrai ou faux : « ${statement} »`,options:['Vrai','Faux'],answer:'Vrai',hint:`Relis la définition de « ${item.term} ».`,explanation:explanation(item),source:item.source};
}
function validateQuestion(q){
  if(!q||!validAnswer(q.answer))return false;
  if(hasCorruptMath(q.question)||/[\$%!#=<>+*\\|~^]/.test(q.question))return false;
  if(!q.options.includes(q.answer)||new Set(q.options).size!==q.options.length)return false;
  if(q.options.some(o=>!validAnswer(o)&&!validTerm(o)&&!["Vrai","Faux"].includes(o)))return false;
  if(/^Que faut-il faire pour/i.test(q.question)&&contradiction(q.question,q.answer))return false;
  return true;
}
function qualityScore(q){
  let s=100;
  if(q.type==='truefalse')s-=8;
  if(q.question.length>180)s-=10;
  const lens=q.options.map(x=>x.length),max=Math.max(...lens),min=Math.min(...lens);
  if(max-min>150)s-=10;
  if(q.options.some(o=>o.length<12)&&q.type!=='reverse'&&q.type!=='alias')s-=8;
  return s;
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
    if(item.kind==='definition'&&generated.length<count){const vf=makeTrueFalse(item,i++);if(vf)generated.push(vf)}
  }
  const clean=generated.filter(validateQuestion).sort((a,b)=>qualityScore(b)-qualityScore(a));
  const chosen=[],topicUse=new Map(),pageUse=new Map(),typeUse=new Map();
  while(chosen.length<count){
    let best=null,bestScore=-1e9;
    for(const q of clean){
      if(chosen.includes(q))continue;
      const tu=topicUse.get(q.topic)||0,pu=pageUse.get(q.page)||0,ty=typeUse.get(q.type)||0;
      if(tu>=2)continue;
      let score=qualityScore(q)-tu*24-pu*4-ty*3+Math.random();
      if(tu===0)score+=14;
      if(score>bestScore){bestScore=score;best=q}
    }
    if(!best)break;
    chosen.push(best);topicUse.set(best.topic,(topicUse.get(best.topic)||0)+1);pageUse.set(best.page,(pageUse.get(best.page)||0)+1);typeUse.set(best.type,(typeUse.get(best.type)||0)+1);
  }
  if(chosen.length<count){
    for(const q of clean){if(chosen.length>=count)break;if(!chosen.includes(q))chosen.push(q)}
  }
  if(chosen.length<Math.min(5,count))throw new Error('Le document ne contient pas assez de notions lisibles pour fabriquer un quiz fiable.');
  return{questions:shuffle(chosen.slice(0,count)),bank,generated:clean,requested:count,actual:Math.min(count,chosen.length)};
}

root.QuizzEngine={normalizeFrench,extractKnowledge,buildQuiz,validateQuestion,qualityScore};
if(typeof module!=='undefined'&&module.exports)module.exports=root.QuizzEngine;
})(typeof window!=='undefined'?window:globalThis);
