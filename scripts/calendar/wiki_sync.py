#!/usr/bin/env python3
"""GameG first, fixed Wiki fallback. Never infer completion or cross-server dates."""
import argparse, datetime as dt, hashlib, json, os, re, time, urllib.request, urllib.parse, uuid
from html.parser import HTMLParser
from pathlib import Path
import gameg_source

class Node:
    def __init__(self, tag='', attrs=()): self.tag=tag; self.attrs=dict(attrs); self.children=[]
    def all(self, tag):
        for c in self.children:
            if isinstance(c,Node):
                if c.tag==tag: yield c
                yield from c.all(tag)
    def text(self):
        if self.tag in ('script','style'): return ''
        return ' '.join(c.text() if isinstance(c,Node) else c for c in self.children)
    def clean(self): return re.sub(r'\s+',' ',self.text()).strip()
class DOM(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True); self.root=Node(); self.stack=[self.root]; self.feed(html)
    def handle_starttag(self,t,a):
        n=Node(t,a);self.stack[-1].children.append(n)
        if t not in ('img','br','meta','link','input','hr','source','wbr','area','base','embed'): self.stack.append(n)
    def handle_endtag(self,t):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==t: del self.stack[i:];break
    def handle_data(self,d): self.stack[-1].children.append(d)

def dates(s):
    pattern=r'(20\d{2})[年/\-](\d{1,2})[月/\-](\d{1,2})日?(?:\([^)]*\))?\s*(?:(\d{1,2}):(\d{2})(?::(\d{2}))?)?'
    out=[]
    for m in re.finditer(pattern,s):
        y,mo,d,h,mi,se=m.groups(); base=dt.date(int(y),int(mo),int(d)).isoformat()
        out.append(base if h is None else base+f'T{int(h):02}:{mi}:{se or "00"}+08:00')
    return out

def parse_banners(html, adapter, now):
    root=DOM(html).root; result=[]
    if adapter in ('genshin','starrail','zzz'):
        for table in root.all('table'):
            rows=list(table.all('tr')); fields={}
            for row in rows:
                th=list(row.all('th'));td=list(row.all('td'))
                if len(th)==1 and len(td)==1: fields[th[0].clean()]=td[0].clean()
            if '时间' not in fields or '版本' not in fields: continue
            title=rows[0].clean(); imgs=list(rows[0].all('img'))
            if imgs: title=imgs[0].attrs.get('alt',title)
            m=re.search('「([^」]+)」',title)
            if not m: continue
            title=m[1]; names=next((v for k,v in fields.items() if k in ('5星角色','5星光锥','5星武器','S级代理人','S级音擎')), '')
            if names: title+='（'+names+'）'
            bounds=dates(fields['时间'])
            if not bounds: continue
            start,end=(bounds if len(bounds)==2 else (None,bounds[0]))
            result.append(dict(title=title,start=start,end=end,version=fields['版本']))
    elif adapter=='fgo':
        table=next((t for t in root.all('table') if '国服当前卡池' in t.clean()),None)
        if not table: raise ValueError('未找到国服当前卡池表')
        for row in table.all('tr'):
            cells=list(row.all('td'))
            if len(cells)!=4: continue
            bounds=dates(cells[1].clean())
            if len(bounds)==2:result.append(dict(title=cells[0].clean(),start=bounds[0],end=bounds[1]))
    elif adapter=='pathtonowhere':
        for row in root.all('tr'):
            if 'data-param1' not in row.attrs:continue
            cells=list(row.all('td'))
            if len(cells)!=3:continue
            bounds=dates(cells[1].clean())
            if len(bounds)==2: result.append(dict(title=cells[0].clean(),start=bounds[0],end=bounds[1]))
    else: raise ValueError('未知解析器')
    if not result:raise ValueError('Wiki表格结构变化或未提供可解析排期')
    # Full calendar tables may include years of history. Keep a rolling past month and announced next year.
    unique={}
    for r in result:
        end=dt.date.fromisoformat(r['end'][:10])
        if now-dt.timedelta(days=30)<=end<=now+dt.timedelta(days=370):
            if r['start'] and r['start']>=r['end']:raise ValueError('卡池结束不晚于开始')
            unique[(r['title'],r['end'])]=r
    return list(unique.values())

def events_for(game, rows, previous, stamp):
    out=[]; old={e['id']:e for e in previous}
    for r in rows:
        key=game['game_id']+':'+r['title']+':'+r.get('version',r['end'][:4])
        base={'category':'game','event_type':'banner','status':'confirmed','schedule_state':'scheduled','timezone':'Asia/Shanghai','url':game['sources'][0], 'sources':[{'provider':'wiki','authority':'community_wiki','url':game['sources'][0],'checked_at':stamp}], 'game':{'game_id':game['game_id'],'server':game['server']}}
        # Prefer known migrated UIDs by exact semantic anchor; stored aliases survive date changes.
        for boundary in ('start','end'):
            value=r.get(boundary)
            if not value:continue
            event=dict(base,id=str(uuid.uuid5(uuid.NAMESPACE_URL,key+':'+boundary)),title=game['name']+' · '+r['title']+(' · 结束提醒' if boundary=='end' else ''),start=value,end=r['end'] if boundary=='start' and 'T' in value else None,time_kind='datetime' if 'T' in value else 'date',description='来源：游戏Wiki；区服：'+game['server']+'。'+('开启时刻仅写版本更新后，未推测钟点；此条仅提醒结束。' if not r.get('start') else '开启日期无钟点时按全天记录；精确结束时间另设提醒。'),wiki_key=key+':'+boundary)
            alias=next((e for e in previous if e.get('wiki_key')==event['wiki_key']),None)
            if alias:event['id']=alias['id']
            before=old.get(event['id']);event.update(revision=before.get('revision',1) if before else 1,created_at=before.get('created_at',stamp) if before else stamp,updated_at=stamp)
            if before:
                fields=('title','start','end','description','status','schedule_state')
                if any(event.get(k)!=before.get(k) for k in fields):event['revision']+=1
                else:event['updated_at']=before['updated_at']
            out.append(event)
    return out

def write_json(path,data):
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');os.replace(temp,path)

def sync(data_dir,state_dir,fixture_dir=None):
    deadline=time.monotonic()+180
    registry=json.loads((data_dir/'wiki-sources.json').read_text());state_dir.mkdir(parents=True,exist_ok=True)
    previous=json.loads((state_dir/'wiki-state.json').read_text()) if (state_dir/'wiki-state.json').exists() else {'events':json.loads((data_dir/'events.json').read_text())['events'],'games':{}}
    stamp=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'); today=dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
    snapshot=json.loads((data_dir/'events.json').read_text())['events']
    merged={e['id']:e for e in snapshot}
    # Preserve automatic discoveries across releases; fresh reviewed manual rows come from the deployed snapshot.
    covered={g['game_id']:g.get('covered_types',[]) for g in registry['games'] if g.get('timeline_source')}
    for e in previous['events']:
        if e.get('wiki_key') and e.get('event_type') in covered.get(e.get('game',{}).get('game_id'),[]):continue
        if (e.get('wiki_key') or e.get('source_key')) and (e['id'] not in merged or e.get('revision',1)>=merged[e['id']].get('revision',1)):merged[e['id']]=e
    result={'updated_at':stamp,'interval_minutes':5,'events':list(merged.values()),'games':{}}
    gameg_reports = {}; gameg_error = None
    if any(g.get('timeline_source',{}).get('provider')=='gameg' for g in registry['games']):
        try:
            if fixture_dir:
                html=(fixture_dir/'gameg.html').read_text()
                gameg_data=gameg_source.parse(html)
            else:
                # Website denies server requests. Use the public data repository linked by the site.
                gameg_data=gameg_source.fetch_repository(state_dir)
            result['events'],gameg_reports=gameg_source.apply(gameg_data,registry['games'],result['events'],stamp)
        except Exception as exc:
            gameg_error=str(exc)[:160]
    # Serial queue imposes at least 2 seconds between Wiki requests. No anti-bot bypass or media fallback.
    for game in registry['games']:
        gid=game['game_id']; last=previous.get('games',{}).get(gid,{});status=dict(last,checked_at=stamp,mode='auto' if game.get('adapter') else 'watch',message='')
        status.pop('error',None)
        if game.get('timeline_source',{}).get('provider')=='gameg':
            report=gameg_reports.get(gid)
            if report:
                status.update(report,mode='auto',last_success_at=stamp,parsed_at=stamp,message='GameG时间表每5分钟检查；只导出来源明确确认的时间。')
            else:
                status.update(mode='auto',error=gameg_error or 'GameG分组缺失',message='GameG读取或解析失败，保留上次有效记录，不用低优先级来源覆盖。')
            result['games'][gid]=status
            # Covered banners cannot be reintroduced from the old Wiki adapter.
            if 'banner' in (report or game).get('covered_types',[]):
                continue
        try:
            if time.monotonic()>deadline:raise TimeoutError('本轮检查队列超时，沿用上次有效记录')
            if not game['sources']: raise ValueError('尚未找到符合区服的主要Wiki排期页面')
            url=game['sources'][0]; parsed=urllib.parse.urlsplit(url)
            if parsed.scheme!='https' or parsed.hostname not in registry['allowed_hosts']:raise ValueError('不在Wiki白名单')
            if fixture_dir:
                html=(fixture_dir/(gid+'.html')).read_text()
            else:
                request=urllib.request.Request(urllib.parse.quote(url,safe=':/?=&%'),headers={'User-Agent':'YuashieCalendar/1.0 (+https://yuashie.cn/projects/004)'})
                with urllib.request.urlopen(request,timeout=12) as response:
                    if urllib.parse.urlsplit(response.url).hostname not in registry['allowed_hosts']: raise ValueError('Wiki跳转至未授权来源')
                    body=response.read(4000001)
                    if len(body)>4000000:raise ValueError('Wiki页面过大')
                    html=body.decode('utf-8')
                time.sleep(2)
            root=DOM(html).root; content=next((n for n in root.all('div') if n.attrs.get('id')=='mw-content-text'),root)
            digest=hashlib.sha256(content.clean().encode()).hexdigest()
            status.update(last_success_at=stamp,content_hash=digest,changed=bool(last.get('content_hash') and last['content_hash']!=digest))
            if game.get('adapter'):
                rows=parse_banners(html,game['adapter'],today)
                old_game=[e for e in result['events'] if e.get('game',{}).get('game_id')==gid]
                current=events_for(game,rows,old_game,stamp)
                # Merge, don't erase disappeared rows: layout/cache failure must not empty existing subscriptions.
                ids={e['id'] for e in current};result['events']=[e for e in result['events'] if e['id'] not in ids]+current
                status.update(parsed_at=stamp,message='卡池自动解析；前瞻和版本仍需Wiki核验',parsed_count=len(current))
            else:status['message']='Wiki内容有变化，待核验日程' if status['changed'] or last.get('needs_review') else '仅监测Wiki变化，日程需人工核验'
            status['needs_review']=status['mode']=='watch' and (status['changed'] or last.get('needs_review',False))
        except Exception as exc:
            status.update(error=str(exc)[:160],message='读取或解析失败，保留上次有效排期')
        result['games'][gid]=status
    write_json(state_dir/'wiki-state.json',result)
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data-dir',type=Path,required=True);p.add_argument('--state-dir',type=Path,required=True);args=p.parse_args()
    out=sync(args.data_dir,args.state_dir);print(json.dumps({'checked_at':out['updated_at'],'games':len(out['games']),'errors':sum('error' in s for s in out['games'].values())}))
