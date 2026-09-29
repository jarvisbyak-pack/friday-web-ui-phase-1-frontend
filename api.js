(() => {
  const stored = localStorage.getItem("friday-api-base");
  const API_BASE = (stored || "/api").replace(/\/$/, "");
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem("friday-session-token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body !== undefined && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(API_BASE + path, { ...options, headers });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || `Request failed (${response.status})`);
      error.code = data?.error?.code; error.status = response.status; throw error;
    }
    return data;
  }
  window.FridayAPI = {
    base: API_BASE,
    setBase(url) { const value=String(url||"").trim().replace(/\/$/,""); if(value)localStorage.setItem("friday-api-base",value); else localStorage.removeItem("friday-api-base"); location.reload(); },
    me:()=>request("/auth/me"),
    register:(email,password)=>request("/auth/register",{method:"POST",body:JSON.stringify({email,password})}),
    login:(email,password)=>request("/auth/login",{method:"POST",body:JSON.stringify({email,password})}),
    logout:()=>request("/auth/logout",{method:"POST"}),
    conversations:()=>request("/conversations"),
    createConversation:title=>request("/conversations",{method:"POST",body:JSON.stringify(title?{title}:{})}),
    messages:id=>request(`/conversations/${encodeURIComponent(id)}/messages`),
    addMessage:(id,role,content,metadata)=>request(`/conversations/${encodeURIComponent(id)}/messages`,{method:"POST",body:JSON.stringify({role,content,...(metadata===undefined?{}:{metadata})})}),
    agent:(messages,options={})=>request("/agent",{method:"POST",body:JSON.stringify({messages,...(options.model?{model:options.model}:{}),...(options.temperature===undefined?{}:{temperature:options.temperature}),...(options.maxSteps===undefined?{}:{maxSteps:options.maxSteps})})}),
    uploadFile:async file=>{const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return request("/files",{method:"POST",body:JSON.stringify({name:file.name,mimeType:file.type||"application/octet-stream",contentBase64:btoa(binary)})});},
    createTask:(type,input)=>request("/tasks",{method:"POST",body:JSON.stringify({type,input})}),
    task:(id)=>request(`/tasks/${encodeURIComponent(id)}`),
    taskEvents:async(id,onEvent,signal)=>{const token=localStorage.getItem("friday-session-token");const response=await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}/events`,{headers:token?{Authorization:`Bearer ${token}`}:{},signal});if(!response.ok)throw new Error(`Task event stream failed (${response.status})`);const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const chunks=buffer.split("\n\n");buffer=chunks.pop()||"";for(const chunk of chunks){const line=chunk.split("\n").find(x=>x.startsWith("data: "));if(line)onEvent(JSON.parse(line.slice(6)));}}},
    addMemory:(content,kind)=>request("/memories",{method:"POST",body:JSON.stringify({content,...(kind?{kind}:{})})}),
    searchMemories:q=>request(`/memories?q=${encodeURIComponent(q)}`)
  };
})();