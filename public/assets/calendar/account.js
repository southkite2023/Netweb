// Serialize writes and keep the last acknowledged revision, including across debounced edits.
export class AccountCalendar {
 constructor({fetcher=(...args)=>fetch(...args),onChange=()=>{}}={}){this.fetcher=fetcher;this.onChange=onChange;this.user=null;this.calendar=null;this.paused=false;this.queue=Promise.resolve()}
 async request(path,options={}){
  const response=await this.fetcher('/api/calendar/v1/'+path,{credentials:'same-origin',...options})
  const data=await response.json()
  if(!response.ok){const error=Error(data.message||'保存失败，请重试');error.status=response.status;throw error}
  return data
 }
 async load(){const data=await this.request('mine');this.user=data.user;this.calendar=data.calendar;this.paused=false;this.onChange(this.calendar);return data}
 save(selection,{createNew=false}={}){
  const owner=this.user?.id
  const task=async()=>{
   if(!owner||owner!==this.user?.id||this.paused)throw Error('请重新载入账号日历后继续')
   try{
    const csrf=await this.fetcher('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'});if(!csrf.ok)throw Error('无法验证登录状态，请重试')
    const {token}=await csrf.json();if(!token){const error=Error('登录已失效，请重新登录');error.status=401;throw error}
    const body={selection,id:this.calendar?.id||null,revision:this.calendar?.revision??null};if(createNew)body.confirmNew=true
    const data=await this.request(createNew?'mine/new':'mine',{method:createNew?'POST':'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':token,'X-Calendar-User':owner},body:JSON.stringify(body)})
    this.calendar=data.calendar;this.onChange(this.calendar);return this.calendar
   }catch(error){if([401,409].includes(error.status))this.paused=true;throw error}
  }
  const result=this.queue.then(task);this.queue=result.catch(()=>{});return result
 }
}
