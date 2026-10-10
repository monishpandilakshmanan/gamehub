const $=s=>document.querySelector(s);
const views=['#loginView','#gamesView','#adminGate','#adminDashboard'];
function showView(sel){views.forEach(v=>$(v).classList.toggle('active',v===sel));document.body.classList.toggle('hacking',sel==='#adminGate'||sel==='#adminDashboard')}
function say(text){try{if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.92;u.pitch=1.15;const voices=speechSynthesis.getVoices();const v=voices.find(x=>/female|zira|samantha|aria|jenny/i.test(x.name))||voices.find(x=>/en/i.test(x.lang));if(v)u.voice=v;speechSynthesis.speak(u)}catch(e){}}
const games=[
 {name:'BLOX FRUITS',image:'bloxfruits.webp',desc:'Explore the islands and complete the practice quest.'},
 {name:'RIVALS',image:'rivals.jpg',desc:'Try the target practice challenge in this demo mission.'},
 {name:'STEAL AN EGG',image:'stell-and-egg.jpg',desc:'Find the hidden egg and finish the collection challenge.'},
 {name:'JJS',image:'jjs.jpg',desc:'Complete the arena training challenge.'}
];
let currentGame=null,progress=0,progressTimer=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getLogs(){try{return JSON.parse(localStorage.getItem('gamehubDemoSessions')||'[]')}catch(e){return []}}
function setLogs(logs){try{localStorage.setItem('gamehubDemoSessions',JSON.stringify(logs))}catch(e){}}
function renderLogs(){const logs=getLogs();$('#sessionCount').textContent=logs.length;$('#sessionTable').innerHTML=logs.length?logs.slice().reverse().map(x=>`<tr><td>${esc(x.time)}</td><td>${esc(x.name)}</td><td>DISPLAY NAME ONLY</td></tr>`).join(''):'<tr><td colspan="3">No demo sessions recorded yet.</td></tr>'}
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();const name=$('#username').value.trim();const password=$('#password').value;if(!name||!password)return;const logs=getLogs();logs.push({name,time:new Date().toLocaleString()});setLogs(logs);$('#password').value='';$('#playerName').textContent=name.toUpperCase();showView('#gamesView');});
$('#logout').addEventListener('click',()=>{showView('#loginView');$('#password').value='';});
$('#adminTrigger').addEventListener('click',()=>{showView('#adminGate');$('#passcode').value='';$('#gateMessage').className='gate-message';$('#gateMessage').textContent='WAITING FOR AUTHORIZATION...';$('#transition').classList.add('show');setTimeout(()=>$('#transition').classList.remove('show'),1050);setTimeout(()=>$('#passcode').focus(),300)});
$('#backFromGate').addEventListener('click',()=>showView('#loginView'));
$('#adminForm').addEventListener('submit',e=>{e.preventDefault();const correct=$('#passcode').value==='HSINOM@2011';$('#passcode').value='';if(!correct){$('#gateMessage').className='gate-message error';$('#gateMessage').textContent='ACCESS DENIED // INVALID KEY';say('Access denied.');return}$('#gateMessage').className='gate-message success';$('#gateMessage').textContent='ACCESS GRANTED // WELCOME';say('Access granted. Welcome Mr. Monish.');renderLogs();$('#transition').classList.add('show');setTimeout(()=>{$('#transition').classList.remove('show');showView('#adminDashboard')},1050)});
$('#adminLogout').addEventListener('click',()=>showView('#loginView'));
$('#clearLogs').addEventListener('click',()=>{setLogs([]);renderLogs()});
$('#gamesGrid').innerHTML=games.map((g,i)=>`<article class="game-card" tabindex="0" role="button" data-game="${i}"><img src="${g.image}" alt="${esc(g.name)} game picture"><div class="game-info"><h3>${esc(g.name)}</h3><span class="reward-tag">MISSION AVAILABLE ↗</span></div></article>`).join('');
function openGame(i){currentGame=games[i];progress=0;$('#taskImage').src=currentGame.image;$('#taskTitle').textContent=currentGame.name;$('#taskDesc').textContent=currentGame.desc;updateProgress();$('#taskModal').classList.add('open')}
$('#gamesGrid').addEventListener('click',e=>{const card=e.target.closest('[data-game]');if(card)openGame(Number(card.dataset.game))});
$('#gamesGrid').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-game]'))openGame(Number(e.target.dataset.game))});
function updateProgress(){$('#progressLabel').textContent=progress+'%';$('#progressBar').style.width=progress+'%'}
function stopProgress(){if(progressTimer)clearInterval(progressTimer);progressTimer=null}
$('#startTask').addEventListener('click',()=>{stopProgress();progressTimer=setInterval(()=>{progress=Math.min(100,progress+2);updateProgress();if(progress>=100)stopProgress()},300000);$('#startTask').textContent='MISSION RUNNING';$('#startTask').disabled=true});
function closeModal(){$('#taskModal').classList.remove('open');stopProgress();$('#startTask').disabled=false;$('#startTask').textContent='START MISSION'}
$('#closeModal').addEventListener('click',closeModal);$('#taskModal').addEventListener('click',e=>{if(e.target===$('#taskModal'))closeModal()});
const canvas=$('#matrix'),ctx=canvas.getContext('2d');let drops=[],w=0,h=0;
function resize(){w=canvas.width=innerWidth;h=canvas.height=innerHeight;drops=Array(Math.ceil(w/18)).fill(0).map(()=>Math.random()*-h/18)}
function draw(){ctx.fillStyle='rgba(3,8,11,.16)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#76ffae';ctx.font='14px monospace';for(let i=0;i<drops.length;i++){const t=Math.random()>.5?'1':'0';ctx.fillText(t,i*18,drops[i]*18);if(drops[i]*18>h&&Math.random()>.975)drops[i]=0;drops[i]+=.6+(Math.random()*.8)}requestAnimationFrame(draw)}
addEventListener('resize',resize);resize();draw();
