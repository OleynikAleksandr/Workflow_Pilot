// An independent, short-lived API client with no Electron/preload access.
const [port,token,op,text]=process.argv.slice(2);
const response=await fetch(`http://127.0.0.1:${port}/fixture`,{
  method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
  body:JSON.stringify({op,text}),
});
const result=await response.json();
if(!response.ok||result.error)throw new Error(JSON.stringify(result));
process.stdout.write(JSON.stringify(result)+'\n');
