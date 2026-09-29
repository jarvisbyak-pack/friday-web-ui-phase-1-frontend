(() => {
const $=s=>document.querySelector(s),sidebar=$("#sidebar"),prompt=$("#prompt"),composer=$("#composer"),conversation=$("#conversation"),welcome=$("#welcome"),suggestions=$("#suggestions"),toast=$("#toast"),fileInput=$("#file-input");
const showToast=m=>{toast.textContent=m;toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("show"),2200)};
const resize=()=>{prompt.style.height="auto";prompt.style.height=Math.min(prompt.scrollHeight,180)+"px"};prompt.addEventListener("input",resize);
const escapeHtml=v=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const send=text=>{const value=(text??prompt.value).trim();if(!value)return;welcome.style.display="none";suggestions.style.display="none";conversation.classList.add("visible");const user=document.createElement("div");user.className="message user";user.innerHTML='<span class="label">You</span>'+escapeHtml(value);conversation.appendChild(user);prompt.value="";resize();const reply=document.createElement("div");reply.className="message friday";reply.innerHTML='<span class="label">Friday</span>Got it. The Phase 1 interface is ready for the next layer. I’ll use this conversation surface for the future agent, tools, progress events, and backend connection.';conversation.appendChild(reply);conversation.scrollIntoView({behavior:"smooth",block:"end"})};
composer.addEventListener("submit",e=>{e.preventDefault();send()});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>{prompt.value=b.dataset.prompt;resize();prompt.focus()}));
document.addEventListener("click",e=>{const el=e.target.closest("[data-action]");if(!el)return;const a=el.dataset.action;
if(a==="toggle-sidebar")sidebar.classList.toggle("open");
if(a==="new-chat"||a==="home"){conversation.innerHTML="";conversation.classList.remove("visible");welcome.style.display="";suggestions.style.display="";prompt.value="";resize();sidebar.classList.remove("open")}
if(a==="toggle-theme"){document.body.classList.toggle("light");showToast(document.body.classList.contains("light")?"Bright mode enabled":"Dark mode enabled")}
if(a==="attach")fileInput.click();
if(a==="voice")showToast("Voice input is reserved for the agent layer.");
if(a==="model")showToast("Model provider selection will connect to the backend.");
if(a==="placeholder")showToast("This Phase 1 surface is ready for the next feature.");
});
fileInput.addEventListener("change",()=>{if(fileInput.files.length)showToast(fileInput.files.length+" file"+(fileInput.files.length>1?"s":"")+" attached")});
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();prompt.focus()}if(e.key==="Escape")sidebar.classList.remove("open")});
})();