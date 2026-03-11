// =====================
// PRO FINAL app.js (FULL MERGED + STABLE)
// =====================

const buttons = document.querySelectorAll(".btn");
const display = document.querySelector("#val");
const expression = document.querySelector(".expression");
const sound = document.getElementById("clickSound");
const micBtn = document.getElementById("mic");
const micWave = document.querySelector(".mic-wave");
const langSelect = document.getElementById("langSelect");

// ===== State =====
let first=null, second=null, operator=null, resetNext=false;
let lastSecond=null, lastOp=null;

// ---------- Utils ----------
function updateDisplay(val){ display.value = val; }
function safePlay(){ if(sound){ sound.currentTime=0; sound.play().catch(()=>{}); } }
function calculate(a,b,op){
  a=parseFloat(a); b=parseFloat(b);
  if(isNaN(a)||isNaN(b)) return 0;
  switch(op){
    case "+": return a+b;
    case "-": return a-b;
    case "*": return a*b;
    case "/": return b===0?"Error":a/b;
    default: return b;
  }
}

// ---------- TTS (Async-safe) ----------
function speak(text, lang="hi-IN"){
  if(!window.speechSynthesis) return;
  const say = () => {
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang;
    const voices = speechSynthesis.getVoices();
    const v = voices.find(v=>v.lang?.toLowerCase().startsWith(lang.split("-")[0]));
    if(v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  const voices = speechSynthesis.getVoices();
  if(!voices.length) speechSynthesis.onvoiceschanged = say;
  else say();
}

function speakByLang(res){
  const lang = langSelect?.value || "hi";
  if(res==="Error"){
    if(lang==="bh") speak("हिसाब गलत हो गइल","hi-IN");
    else if(lang==="en") speak("Invalid calculation","en-US");
    else speak("गलत गणना","hi-IN");
  } else {
    if(lang==="bh") speak(`जवाब बा ${res}`,"hi-IN");
    else if(lang==="en") speak(`The answer is ${res}`,"en-US");
    else speak(`उत्तर है ${res}`,"hi-IN");
  }
}

// ---------- Language Switch ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec=null, isAwake=false;

function applyLanguage(){
  const lang = langSelect?.value || "hi";
  if(rec){
    rec.lang = (lang==="en") ? "en-US" : "hi-IN"; // Bhojpuri via Hindi
  }
}
langSelect?.addEventListener("change", applyLanguage);

// ---------- Symbols ----------
function normalizeSymbol(s){
  return s.replace("÷","/").replace("×","*").replace("−","-")
          .replace("⌫","DEL").replace("✉","DEL").trim();
}
function clickBtn(symbol){
  const t=normalizeSymbol(symbol);
  const btn=[...buttons].find(b=>normalizeSymbol(b.innerText)===t);
  btn?.click();
}

// ---------- Buttons ----------
buttons.forEach(btn=>{
  btn.addEventListener("click",()=>{
    const k=normalizeSymbol(btn.innerText.trim());
    safePlay();

    if(k==="AC"){ first=second=operator=null; resetNext=false; expression.innerText=""; updateDisplay("0"); return; }
    if(k==="DEL"){ updateDisplay(display.value.length>1?display.value.slice(0,-1):"0"); return; }

    if(!isNaN(k)){
      if(display.value==="0"||resetNext){ updateDisplay(k); resetNext=false; }
      else updateDisplay(display.value+k);
      return;
    }
    if(k==="."){ if(!display.value.includes(".")) updateDisplay(display.value+"."); return; }
    if(k==="+/-"){ updateDisplay(String(parseFloat(display.value)*-1)); return; }

    if(k==="%"){
      if(!operator||first===null) updateDisplay(String(parseFloat(display.value)/100));
      else{
        const base=parseFloat(first), pct=parseFloat(display.value);
        updateDisplay(String((operator==="+"||operator==="-")?(base*pct)/100:pct/100));
      } return;
    }

    if(["+","-","*","/"].includes(k)){
      if(operator && !resetNext){
        second=display.value;
        first=calculate(first,second,operator);
        updateDisplay(String(first));
      } else first=display.value;
      operator=k; lastOp=k; resetNext=true; expression.innerText=`${first} ${k}`; return;
    }

    if(k==="="){
      if(!operator && lastSecond!==null){
        const res = calculate(first, lastSecond, lastOp);
        updateDisplay(String(res)); first=res; speakByLang(res); addHistory(`${first} ${lastOp} ${lastSecond}`, res); return;
      }
      if(!operator) return;
      second=display.value; lastSecond=second;
      const res=calculate(first,second,operator);
      expression.innerText=`${first} ${operator} ${second}`;
      updateDisplay(String(res));
      first=res; operator=null; resetNext=true;
      speakByLang(res);
      addHistory(`${expression.innerText}`, res);
    }
  });
});

// ---------- Keyboard ----------
document.addEventListener("keydown",(e)=>{
  if(e.key>="0" && e.key<="9") return clickBtn(e.key);
  const map={"+":"+","-":"-","*":"*","/":"/","Enter":"=","Escape":"AC","%":"%","Backspace":"DEL",".":"."};
  clickBtn(normalizeSymbol(map[e.key]||e.key));
});

// ---------- Voice ----------
// if(SpeechRecognition && micBtn){
//   rec = new SpeechRecognition();
//   rec.interimResults=false;
//   rec.continuous=false;

//   micBtn.onclick=()=>{
//     applyLanguage();
//     // unlock TTS on first user gesture
//     speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
//     rec.start();
//     startVisualizer();
//     micBtn.classList.add("listening");
//     micWave?.classList.add("active");
//   };

//   rec.onend=()=>{
//     micBtn.classList.remove("listening");
//     micWave?.classList.remove("active");
//     stopVisualizer();
//   };

//   rec.onresult=(e)=>{
//     const text=e.results[0][0].transcript.toLowerCase();
//     const woke=/hey\s*(cal|calculator)|hello\s*(cal|calculator)|ok\s*(cal|calculator)/.test(text);

//     if(!isAwake && woke){
//       isAwake=true;
//       speak("हाँ, बोलिए","hi-IN");
//       setTimeout(()=>rec.start(),700);
//       return;
//     }
//     handleVoice(text);
//     isAwake=false;
//   };
// }
// ---------- Voice (PRO toggle + glow + wave) ----------
let isListening = false;

if(SpeechRecognition && micBtn){
  rec = new SpeechRecognition();
  rec.interimResults=false;
  rec.continuous=false;

  micBtn.onclick = ()=>{
    if(!rec) return;

    if(isListening){
      rec.stop();                 // 🔁 second click = stop
      return;
    }

    applyLanguage();
    // unlock TTS on first user gesture
    speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
    rec.start();
    startVisualizer();

    isListening = true;
    micBtn.classList.add("listening");   // ✨ glow ring
    micWave?.classList.add("active");    // 💚 green wave
  };

  rec.onend = ()=>{
    isListening = false;
    micBtn.classList.remove("listening");
    micWave?.classList.remove("active");
    stopVisualizer();
  };

  rec.onresult = (e)=>{
    const text = e.results[0][0].transcript.toLowerCase();
    const woke=/hey\s*(cal|calculator)|hello\s*(cal|calculator)|ok\s*(cal|calculator)/.test(text);

    if(!isAwake && woke){
      isAwake = true;
      speak("हाँ, बोलिए","hi-IN");
      setTimeout(()=>rec.start(),700);
      return;
    }
    handleVoice(text);
    isAwake = false;
  };
}

// ---------- NLP ----------
function handleVoice(text){
  if(text.includes("clear")||text.includes("reset")||text.includes("saaf")) return clickBtn("AC");
  if(text.includes("delete")||text.includes("back")||text.includes("hatao")) return clickBtn("DEL");

  const map={ zero:"0", one:"1", two:"2", three:"3", four:"4", five:"5", six:"6", seven:"7", eight:"8", nine:"9",
              ek:"1", do:"2", teen:"3", char:"4", paanch:"5", chhe:"6", saat:"7", aath:"8", nau:"9" };

  let normalized=text.replace(/plus|add|jodo|\+/g,"+")
    .replace(/minus|subtract|ghatao|\-/g,"-")
    .replace(/times|multiply|guna|x|\*/g,"*")
    .replace(/divide|by|bhaag|\//g,"/")
    .replace(/equals|equal|barabar|answer|=/g,"=");

  const tokens=normalized.split(/\s+/).map(t=>map[t]||t);
  const seq=[];
  tokens.forEach(t=>{
    if(/^\d+(\.\d+)?$/.test(t)) seq.push(t);
    if(["+","-","*","/","="].includes(t)) seq.push(t);
  });

  if(seq.length){
    clickBtn("AC");
    seq.forEach(t=>/^\d/.test(t)?t.split("").forEach(d=>clickBtn(d)):clickBtn(t));
    if(!seq.includes("=")) clickBtn("=");
  }
}

// ---------- Mic Wave ----------
let audioCtx, analyser, micStream, dataArr, waveRAF;

async function startVisualizer(){
  try{
    micStream=await navigator.mediaDevices.getUserMedia({audio:true});
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const src=audioCtx.createMediaStreamSource(micStream);
    analyser=audioCtx.createAnalyser();
    analyser.fftSize=64;
    src.connect(analyser);
    dataArr=new Uint8Array(analyser.frequencyBinCount);
    animateWave();
  }catch(e){ alert("Microphone permission denied"); }
}
function animateWave(){
  if(!analyser) return;
  analyser.getByteFrequencyData(dataArr);
  const avg=dataArr.reduce((a,b)=>a+b,0)/dataArr.length;
  document.querySelectorAll(".mic-wave span").forEach(el=>{
    el.style.transform=`scaleY(${0.4+avg/180})`;
  });
  waveRAF=requestAnimationFrame(animateWave);
}
function stopVisualizer(){
  if(waveRAF) cancelAnimationFrame(waveRAF);
  if(audioCtx) audioCtx.close();
  micStream?.getTracks().forEach(t=>t.stop());
  analyser=null;
}

// ---------- History ----------
const historyList=document.getElementById("historyList");
let history=JSON.parse(localStorage.getItem("calcHistory")||"[]");

function renderHistory(){
  if(!historyList) return;
  historyList.innerHTML="";
  history.slice(-10).reverse().forEach(item=>{
    const li=document.createElement("li");
    li.textContent=`${item.exp} = ${item.res}`;
    li.onclick=()=>updateDisplay(String(item.res));
    historyList.appendChild(li);
  });
}
function addHistory(exp,res){
  history.push({exp,res});
  history=history.slice(-10);
  localStorage.setItem("calcHistory",JSON.stringify(history));
  renderHistory();
}
renderHistory();

// ---------- History Modal ----------
const openHistoryBtn=document.getElementById("openHistory");
const closeHistoryBtn=document.getElementById("closeHistory");
const historyModal=document.getElementById("historyModal");
const clearHistoryBtn=document.getElementById("clearHistory");

openHistoryBtn?.addEventListener("click",()=>historyModal.classList.remove("hidden"));
closeHistoryBtn?.addEventListener("click",()=>historyModal.classList.add("hidden"));
historyModal?.addEventListener("click",(e)=>{ if(e.target===historyModal) historyModal.classList.add("hidden"); });
clearHistoryBtn?.addEventListener("click",()=>{
  history=[]; localStorage.removeItem("calcHistory"); renderHistory();
});

// ---------- Init ----------
applyLanguage();
