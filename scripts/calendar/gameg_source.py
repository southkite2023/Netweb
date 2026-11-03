"""GameG's published timeline; never promote inferred/unknown minutes to confirmed dates."""
import datetime as dt
import json
import re
import uuid

URL = 'https://www.gameg.site/'
GROUPS = {
    'genshin': 'genshin-impact/cn', 'starrail': 'honkai-star-rail/cn',
    'zzz': 'zenless-zone-zero/cn', 'wuwa': 'wuthering-waves/cn',
    'arknights': 'arknights/cn', 'endfield': 'arknights-endfield/cn',
    'nte': 'neverness-to-everness/cn', 'azurlane': 'azur-lane/cn',
    'deepspace': 'love-and-deepspace/cn', 'lightnight': 'light-and-night/cn',
    'reverse1999': 'reverse-1999/cn',
    'hokworld': 'honor-of-kings-world/cn', 'rocoworld': 'roco-world/cn',
    'duetnightabyss-cn': 'duet-night-abyss/cn', 'miraclenikki': 'miracle-nikki/cn',
}
TYPES = {'banner': 'banner', 'preview': 'livestream', 'version': 'version_update', 'maintenance': 'version_update'}
ZONE = dt.timezone(dt.timedelta(hours=8))

def parse(html):
    match = re.search(r'<script\b[^>]*\bid=[\"\']timeline-data[\"\'][^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise ValueError('GameG时间表数据未找到；保留上次有效数据')
    data = json.loads(match[1])
    if not isinstance(data.get('groups'), list) or not data['groups']:
        raise ValueError('GameG游戏分组缺失')
    return data

def iso(value):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError('GameG时间戳无效')
    return dt.datetime.fromtimestamp(value / 1000, ZONE).isoformat(timespec='seconds')

def import_game(data, game, previous, stamp):
    group = next((g for g in data['groups'] if g['key'] == GROUPS.get(game['game_id'])), None)
    if not group or game['server'] != 'cn' or group['region']['id'] != 'cn':
        raise ValueError('GameG未找到匹配区服；保留原来源')
    rows = group.get('versions', []) + group.get('events', [])
    by_type = {t: [r for r in rows if TYPES.get(r.get('typeId')) == t] for t in set(TYPES.values())}
    out, reviews, summaries = [], {}, {}
    old = {e['id']: e for e in previous}
    for kind, records in by_type.items():
        if not records:
            label={'banner':'卡池','livestream':'前瞻','version_update':'版本或维护'}[kind]
            reviews[kind]=dict(status='source_not_listed',label='GameG未收录此类日期',reason=f'已检查GameG国服时间表，该游戏没有{label}记录。不是读取失败，也不能据此认定官方没有公布。',official_status='GameG未收录；官方是否公布尚未核实',sources=[URL],checked_on=stamp[:10])
            continue
        accepted = []
        unknown = []
        for row in records:
            certainty = row.get('timeCertainty', {})
            note = row.get('note', '')
            boundaries = ('start', 'end') if kind == 'banner' else ('start',)
            for boundary in boundaries:
                if certainty.get(boundary) != 'confirmed' or row.get(boundary) is None:
                    continue
                value = iso(row[boundary])
                # Only source-confirmed endpoints are exported; version end is never an update.
                end = iso(row['end']) if boundary == 'start' and kind == 'banner' and certainty.get('end') == 'confirmed' and row.get('end') else None
                if end and end <= value:
                    raise ValueError('GameG结束时间不晚于开始时间')
                key = 'gameg:' + row['key'] + ':' + boundary
                eid = str(uuid.uuid5(uuid.NAMESPACE_URL, key))
                event = dict(id=eid, category='game', event_type=kind, title=game['name']+' · '+row['name']+(' · 结束提醒' if boundary == 'end' else ''), description='来源：GameG 二游时间表（社区整理）；国服，北京时间。仅采用来源标为confirmed的时间。'+('这里只确认结束，开始时间为推算或未知，未导出。' if boundary == 'end' and certainty.get('start') != 'confirmed' else '')+note, status='confirmed', schedule_state='scheduled', time_kind='datetime', start=value, end=end, timezone='Asia/Shanghai', url=URL, sources=[dict(provider='gameg', authority='community_timeline', source_id=row['key'], url=URL, checked_at=stamp)] + [dict(provider='GameG引用原公告', authority='source_reference', url=url, checked_at=stamp) for url in row.get('sources', []) if url.startswith('https://')], game=dict(game_id=game['game_id'], server='cn'), source_key=key)
                before = old.get(eid)
                changed = not before or any(event.get(k) != before.get(k) for k in ('start','end','title','description'))
                event.update(revision=(before.get('revision',1) + int(changed)) if before else 1, created_at=before.get('created_at',stamp) if before else stamp, updated_at=stamp if changed else before['updated_at'])
                accepted.append(event)
            if certainty.get('start') != 'confirmed' or (kind == 'banner' and certainty.get('end') != 'confirmed'):
                unknown.append(row)
        accepted.sort(key=lambda e:e['start'])
        out.extend(accepted)
        reason = f'优先采用 GameG 国服时间表。本类共 {len(records)} 条来源记录，已导入 {len(accepted)} 个明确确认的时间点。'
        if unknown:
            latest = max(unknown, key=lambda r:r.get('start',0))
            certainty_label = dict(confirmed='已确认',inferred='推算',estimated='预计',unknown='来源未标确认').get(latest.get('timeCertainty',{}).get('start','unknown'),'来源未标确认')
            displayed_start = iso(latest['start']) if latest.get('start') else '未提供'
            reason += f'另有 {len(unknown)} 条记录含推算或未知时间，不将这些时刻导出为已公布日期。例如：{latest["name"]}；起点状态：{certainty_label}；站内记录起点：{displayed_start}（未作为确认日期导出）。'+latest.get('note','')
        if kind == 'version_update':
            reason += '维护条目只提醒明确的维护开始，不把预计维护结束当成开服时刻。'
        if not accepted:
            reason += '这是来源确认程度不足，不代表官方没有公布；仍需核对其引用公告。'
        reviews[kind] = dict(status='recorded' if accepted else 'source_uncertain', label='已收录日期 · GameG' if accepted else '来源有记录，时间未明确确认', reason=reason, official_status='来源含未确认时间；不能据此断言官方未公布', sources=[URL]+list(dict.fromkeys(u for r in records[-2:] for u in r.get('sources',[]))), checked_on=stamp[:10])
        if accepted:
            latest = accepted[-1]
            summaries[kind] = dict(label=latest['title']+'：'+latest['start'].replace('T',' ')+'（北京时间；可能为历史记录）', url=URL)
    return out, reviews, summaries

def apply(data, games, events, stamp):
    """Replace covered categories, including stale Wiki discoveries, without touching other servers."""
    reports = {}
    for game in games:
        if game.get('timeline_source',{}).get('provider') != 'gameg':
            continue
        current, reviews, summaries = import_game(data, game, events, stamp)
        gid = game['game_id']
        events = [e for e in events if not (e.get('game',{}).get('game_id') == gid and e.get('game',{}).get('server') == game['server'] and e.get('event_type') in reviews)] + current
        group=next(g for g in data['groups'] if g['key']==GROUPS[gid])
        source_records={t:[] for t in reviews}
        for r in group.get('versions',[])+group.get('events',[]):
            t=TYPES.get(r.get('typeId'))
            if t not in source_records:continue
            source_records[t].append(dict(id=r['key'],name=r['name'],start=iso(r['start']) if r.get('start') else None,end=iso(r['end']) if r.get('end') else None,certainty=r.get('timeCertainty',{}),note=r.get('note',''),sources=r.get('sources',[]),url=URL))
        for rows in source_records.values():rows.sort(key=lambda r:r.get('start') or '',reverse=True)
        reports[gid] = dict(source_records=source_records,source_reviews=reviews, date_summary=summaries, source_types={t:'verified' if r['status']=='recorded' else 'pending' for t,r in reviews.items()}, covered_types=list(reviews), source='GameG', source_url=URL)
    return events, reports


def from_yaml(doc, path):
    """Normalize the site's own public YAML with the same default certainty: unknown."""
    game, region = doc['game'], doc['region']
    group = dict(key=game+'/'+region, region={'id':region}, versions=[], events=[])
    for collection in ('versions', 'events'):
        for original in doc.get(collection, []):
            row = dict(original)
            kind = 'version' if collection == 'versions' else row.pop('type')
            if kind not in TYPES:
                continue
            row.update(typeId=kind, key=f'{game}/{region}/{"version" if collection == "versions" else "event"}/{row["id"]}', timeCertainty=row.get('timeCertainty',{'start':'unknown'}), sourceFile=path)
            for boundary in ('start','end'):
                if boundary in row:
                    value=row[boundary]
                    if not isinstance(value,str) or not value.endswith('+08:00'):
                        raise ValueError('GameG公开数据时间格式变化')
                    row[boundary]=int(dt.datetime.fromisoformat(value).timestamp()*1000)
            group[collection].append(row)
    return group


def fetch_repository(state_dir):
    """Public data linked by GameG itself; no bypass of its web access restrictions.

    One unauthenticated ref request per run, fetch immutable blobs only on changes.
    Cache is atomic, and a failed refresh never replaces last-good calendar data.
    PyYAML safe_load is required (provided by python3-yaml on the production host).
    """
    import base64
    import urllib.request
    import yaml
    import os
    api='https://api.github.com/repos/Oven2002/game-event-gantt/'
    def read(path):
        request=urllib.request.Request(api+path,headers={'User-Agent':'YuashieCalendar/1.0','Accept':'application/vnd.github+json'})
        with urllib.request.urlopen(request,timeout=12) as response:
            if response.url.split('/')[2]!='api.github.com':raise ValueError('GameG公开仓库跳转异常')
            raw=response.read(4000001)
            if len(raw)>4000000:raise ValueError('GameG公开数据过大')
            return json.loads(raw)
    commit=read('git/ref/heads/main')['object']['sha']
    cache=state_dir/'gameg-source-cache.json'
    if cache.exists():
        saved=json.loads(cache.read_text())
        if saved.get('source_commit')==commit and {g['key'] for g in saved.get('groups',[])}==set(GROUPS.values()):return saved
    tree=read('git/trees/'+commit+'?recursive=1')
    if tree.get('truncated'):raise ValueError('GameG公开数据目录被截断')
    groups={}
    allowed={x.split('/')[0] for x in GROUPS.values()}
    for entry in tree['tree']:
        match=re.fullmatch(r'data/([a-z0-9-]+)/(cn[^/]*\.ya?ml)',entry['path'])
        if not match or match[1] not in allowed:continue
        blob=read('git/blobs/'+entry['sha'])
        doc=yaml.safe_load(base64.b64decode(blob['content']).decode('utf-8'))
        if doc.get('game')!=match[1] or doc.get('region')!='cn':raise ValueError('GameG公开数据区服不符')
        group=from_yaml(doc,entry['path'])
        if group['key'] in groups:
            for k in ('versions','events'):groups[group['key']][k].extend(group[k])
        else:groups[group['key']]=group
    if set(groups)!=set(GROUPS.values()):raise ValueError('GameG公开数据缺少预期游戏')
    data={'source_commit':commit,'transport':'GameG链接的公开GitHub数据','groups':list(groups.values())}
    temp=cache.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False));os.replace(temp,cache)
    return data
