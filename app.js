let ws,stream,peers=new Map(),aud=new Map(),down=0,$=x=>document.getElementById(x);
function send(x){if(ws?.readyState===1)ws.send(JSON.stringify(x))}function log(x){let d=document.createElement("div");d.textContent=new Date().toLocaleTimeString()+" "+x;$("log").prepend(d)}
async function peer(id,make){if(peers.has(id))return peers.get(id);let p=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});stream.getTracks().forEach(t=>p.addTrack(t,stream));p.onicecandidate=e=>e.candidate&&send({type:"ice",to:id,candidate:e.candidate});p.ontrack=e=>{let a=aud.get(id)||new Audio();a.autoplay=true;a.srcObject=e.streams[0];a.play().catch(()=>{});aud.set(id,a)};peers.set(id,p);if(make){await p.setLocalDescription(await p.createOffer());send({type:"offer",to:id,offer:p.localDescription})}return p}
$("join").onclick=async()=>{let name=$("name").value.trim()||"Operador";try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){return alert("Autorizá el micrófono.")}stream.getAudioTracks().forEach(t=>t.enabled=false);$("login").hidden=true;$("app").hidden=false;ws=new WebSocket(location.hostname.includes("github.io")?"wss://proud-humans-repair.loca.lt":((location.protocol==="https:"?"wss":"ws")+"://"+location.host));;ws.onopen=()=>{ $("s").textContent="Conectado";send({type:"join",name:name+($("num").value?" · Op. "+$("num").value:""),role:$("role").value});log("Conectado.")};ws.onmessage=async e=>{let m=JSON.parse(e.data);
if(m.type==="roster")$("users").innerHTML=m.users.map(u=>"<li>"+u.name+(u.role==="instructor"?" · INSTRUCTOR":"")+"</li>").join("");
else if(m.type==="peer")await peer(m.id,true);else if(m.type==="peer-new")await peer(m.id,false);
else if(m.type==="offer"){let p=await peer(m.from,false);await p.setRemoteDescription(m.offer);await p.setLocalDescription(await p.createAnswer());send({type:"answer",to:m.from,answer:p.localDescription})}
else if(m.type==="answer"){let p=peers.get(m.from);if(p)await p.setRemoteDescription(m.answer)}
else if(m.type==="ice"){let p=peers.get(m.from);if(p)try{await p.addIceCandidate(m.candidate)}catch{}}
else if(m.type==="peer-left"){let p=peers.get(m.id);p?.close();peers.delete(m.id);log("Estación desconectada.")}
else if(m.type==="ptt")log((m.active?"TX ":"RX ")+m.name);else if(m.type==="event")log(m.name+": "+m.text)}};
function tx(on){stream.getAudioTracks().forEach(t=>t.enabled=on);$("ptt").classList.toggle("active",on);$("mode").textContent=on?"TRANSMITIENDO":"EN RECEPCIÓN";$("mode").className=on?"tx":"";send({type:"ptt",active:on})}
$("ptt").onpointerdown=e=>{e.preventDefault();down=1;tx(1);$("ptt").setPointerCapture?.(e.pointerId)};["pointerup","pointercancel","pointerleave"].forEach(x=>$("ptt").addEventListener(x,()=>{if(down){down=0;tx(0)}}));
$("guide").onclick=()=>{let a=["Preguntá «¿Frecuencia ocupada?» tres veces.","Escuchá.","Hacé dos llamados CQ.","Identificate y pedí identificación.","Intercambiá nombre, localidad, motivo y equipo.","Cerrá con 73."],i=0;$("gtext").textContent=a[0];let t=setInterval(()=>{if(++i>=a.length)return clearInterval(t);$("gtext").textContent=a[i]},3500)}
var evopiaRx={
  ctx:null,
  master:null,
  filter:null,
  volume:0.18,
  clarifier:7100
};

function evopiaCreateControls(){
  var k=document.querySelector(".k");
  if(!k)return;

  k.innerHTML=
    '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;width:100%">'+
    '<label>VOLUME <span id="evVol">18</span>%</label>'+
    '<input id="evVolCtl" type="range" min="0" max="100" value="18" style="width:130px">'+
    '<label>CLARIFIER <span id="evClar">7100</span> Hz</label>'+
    '<input id="evClarCtl" type="range" min="5000" max="9000" value="7100" step="50" style="width:130px">'+
    '</div>';

  $("evVolCtl").oninput=function(){
    evopiaRx.volume=Number(this.value)/100;
    $("evVol").textContent=this.value;
    if(evopiaRx.master && $("mode").textContent!=="TRANSMITIENDO"){
      evopiaRx.master.gain.value=evopiaRx.volume;
    }
  };

  $("evClarCtl").oninput=function(){
    evopiaRx.clarifier=Number(this.value);
    $("evClar").textContent=this.value;
    if(evopiaRx.filter){
      evopiaRx.filter.frequency.value=evopiaRx.clarifier;
    }
  };
}

function evopiaStartReceiverAudio(){
  evopiaCreateControls();

  var C=window.AudioContext||window.webkitAudioContext;
  if(!C)return;

  if(!evopiaRx.ctx){
    var ctx=new C();
    evopiaRx.ctx=ctx;

    var buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    var data=buffer.getChannelData(0);

    for(var i=0;i<data.length;i++){
      data[i]=(Math.random()*2-1)*0.35;
    }

    var noise=ctx.createBufferSource();
    noise.buffer=buffer;
    noise.loop=true;

    var filter=ctx.createBiquadFilter();
    filter.type="bandpass";
    filter.frequency.value=evopiaRx.clarifier;
    filter.Q.value=0.7;

    var master=ctx.createGain();
    master.gain.value=evopiaRx.volume;

    noise.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);

    noise.start();

    evopiaRx.filter=filter;
    evopiaRx.master=master;
  }

  evopiaRx.ctx.resume().catch(function(){});
}

$("join").addEventListener("click",function(){
  evopiaStartReceiverAudio();
});

var evopiaOldTx=tx;
tx=function(on){
  evopiaOldTx(on);

  if(evopiaRx.master){
    evopiaRx.master.gain.value=on?0:evopiaRx.volume;
  }
};