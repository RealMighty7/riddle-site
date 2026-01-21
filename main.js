/* ---------- IMAGE RANDOMIZER ---------- */
const IMAGE_POOL = Array.from({length:12},(_,i)=>`/assets/img${i+1}.jpg`);
document.querySelectorAll(".grid img").forEach(i=>{
  i.src = IMAGE_POOL[Math.floor(Math.random()*IMAGE_POOL.length)];
});

/* ---------- STATE ---------- */
let stage = 1;
let bgClicks = 0;
let lastClick = 0;
const CLICK_COOLDOWN = 650;
const timers = [];

/* ---------- ELEMENTS ---------- */
const l1 = document.getElementById("l1");
const l2 = document.getElementById("l2");
const l3 = document.getElementById("l3");
const systemBox = document.getElementById("system");
const cracks = document.getElementById("cracks");
const simRoom = document.getElementById("simRoom");
const simText = document.getElementById("simText");
const simChoices = document.getElementById("simChoices");
const btnProceed = document.getElementById("btnProceed");

/* ---------- READING SPEED ---------- */
const WPM = 160;
const MS_PER_WORD = 60000 / WPM;
function msToRead(t){
  const w = t.split(/\s+/).length;
  return Math.max(2200, w*MS_PER_WORD + 1400);
}

/* ---------- CRACK SVG ---------- */
function buildCracks(){
  cracks.innerHTML = `
  <svg viewBox="0 0 1000 1000">
    ${Array.from({length:18}).map((_,i)=>`
      <path class="crack-under crack-path" d="M500 500 L ${500+Math.cos(i)*400} ${500+Math.sin(i)*400}"/>
      <path class="crack-line crack-path" d="M500 500 L ${500+Math.cos(i)*400} ${500+Math.sin(i)*400}"/>
    `).join("")}
    ${Array.from({length:14}).map(()=>`
      <polygon class="shard" points="500,500 520,560 480,580"/>
    `).join("")}
  </svg>`;
}

function showCracks(){
  buildCracks();
  cracks.classList.remove("hidden");
  cracks.classList.add("show");
}

function shatter(openSim){
  cracks.classList.add("flash");
  document.body.classList.add("shake","sim-transition");
  setTimeout(()=>openSim(),1000);
}

/* ---------- SIM ROOM ---------- */
function openSimRoom(){
  stage = 99;
  simRoom.classList.remove("hidden");
  simText.textContent = "";

  const script = [
    "...",
    "hey—",
    "you aren’t supposed to be here.",
    "you’re supposed to be solving puzzles.",
    "",
    "wait.",
    "how did you even get through?",
    "",
    "code 3. CODE 3!",
    "put us in defcon 4!",
    "",
    "listen.",
    "you need something first.",
    "something you can show them."
  ];

  let t = 300;
  script.forEach(line=>{
    setTimeout(()=>simText.textContent += line+"\n",t);
    t += msToRead(line);
  });

  setTimeout(()=>simChoices.classList.remove("hidden"),t+400);
}

/* ---------- CLICK HANDLER ---------- */
document.addEventListener("click",(e)=>{
  if(stage!==1) return;
  if(e.target.closest("button,input,img")) return;

  const now = Date.now();
  if(now-lastClick<CLICK_COOLDOWN) return;
  lastClick = now;

  bgClicks++;

  if(bgClicks===4) showCracks();

  if(bgClicks>=9){
    stage = 2;
    systemBox.classList.remove("hidden");

    l1.textContent = "That isn’t how this page is supposed to be used.";
    setTimeout(()=>l2.textContent="You weren’t meant to interact with this.",msToRead(l1.textContent));
    setTimeout(()=>{
      l3.textContent="Stop.";
      shatter(openSimRoom);
    },msToRead(l1.textContent)+msToRead(l2.textContent)+1200);
  }
});
