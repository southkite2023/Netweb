import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from wiki_sync import parse_banners,events_for,sync

class WikiTests(unittest.TestCase):
 def table(self,title='「测试」',time='2026/10/13 18:00 ~ 2026/11/03 14:59',version='7.1下半'):
  return f'<table><tr><th>{title}</th></tr><tr><th>时间</th><td>{time}</td></tr><tr><th>版本</th><td>{version}</td></tr><tr><th>5星角色</th><td>角色甲</td></tr></table>'
 def test_unknown_maintenance_start_only_exports_known_end(self):
  rows=parse_banners(self.table(time='7.2版本更新后 ~ 2026/11/24 17:59'),'genshin',dt.date(2026,11,2))
  game={'game_id':'genshin','name':'原神','server':'cn','sources':['https://wiki.biligame.com/ys/祈愿']}
  events=events_for(game,rows,[],'2026-11-02T00:00:00Z')
  self.assertEqual(len(events),1);self.assertEqual(events[0]['start'],'2026-11-24T17:59:00+08:00');self.assertIsNone(events[0]['end'])
 def test_mooncell_never_mixes_jp_table(self):
  html=''.join(f'<table><tr><th>{server}当前卡池</th></tr><tr><td>{server}池</td><td>2026年10月22日(周四) 19:00 ~ 2026年11月13日(周五) 13:59</td><td>从者</td><td>礼装</td></tr></table>' for server in ['日服','国服'])
  rows=parse_banners(html,'fgo',dt.date(2026,11,2));self.assertEqual([r['title'] for r in rows],['国服池'])
 def test_date_precision_and_correction_keep_uid_and_increment_sequence(self):
  game={'game_id':'genshin','name':'原神','server':'cn','sources':['https://wiki.biligame.com/ys/祈愿']}
  rows=parse_banners(self.table(),'genshin',dt.date(2026,11,2));a=events_for(game,rows,[],'2026-11-02T00:00:00Z');b=events_for(game,rows,a,'2026-11-02T01:00:00Z')
  self.assertEqual([(e['id'],e['revision'],e['updated_at']) for e in a],[(e['id'],e['revision'],e['updated_at']) for e in b])
  rows[0]['end']='2026-11-04T15:00:00+08:00';c=events_for(game,rows,b,'2026-11-02T02:00:00Z')
  self.assertEqual(a[0]['id'],c[0]['id']);self.assertEqual(c[0]['revision'],2)
 def test_parse_failure_keeps_last_good_events_and_marks_error(self):
  with tempfile.TemporaryDirectory() as tmp:
   data=Path(tmp)/'data';state=Path(tmp)/'state';fixture=Path(tmp)/'fixture'
   for p in [data,state,fixture]:p.mkdir()
   g={'game_id':'genshin','name':'原神','server':'cn','sources':['https://wiki.biligame.com/ys/祈愿'],'adapter':'genshin'}
   (data/'wiki-sources.json').write_text(json.dumps({'games':[g],'allowed_hosts':['wiki.biligame.com']}));(data/'events.json').write_text(json.dumps({'events':[]}));(fixture/'genshin.html').write_text(self.table())
   first=sync(data,state,fixture);self.assertTrue(first['events'])
   (fixture/'genshin.html').write_text('<html>maintenance or changed layout</html>');second=sync(data,state,fixture)
   self.assertEqual(first['events'],second['events']);self.assertIn('error',second['games']['genshin'])
   (fixture/'genshin.html').write_text(self.table());third=sync(data,state,fixture);self.assertNotIn('error',third['games']['genshin'])
if __name__=='__main__':unittest.main()
