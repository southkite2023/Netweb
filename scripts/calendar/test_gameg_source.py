import copy
import json
import unittest
from unittest.mock import patch
from pathlib import Path
import tempfile
import gameg_source as source
import wiki_sync

STAMP='2026-11-03T00:00:00+00:00'
START=1792756800000
END=1792760400000
class GameGTests(unittest.TestCase):
    def setUp(self):
        self.game={'game_id':'genshin','name':'原神','server':'cn','sources':['https://wiki.biligame.com/ys/祈愿'],'types':{},'adapter':'genshin','covered_types':['banner'],'timeline_source':{'provider':'gameg'}}
        self.row={'key':'genshin-impact/cn/event/a','name':'测试卡池','typeId':'banner','start':START,'end':END,'timeCertainty':{'start':'inferred','end':'confirmed'},'sources':['https://ys.mihoyo.com/notice']}
        self.data={'groups':[{'key':'genshin-impact/cn','region':{'id':'cn'},'versions':[],'events':[self.row]}]}
    def test_inferred_start_does_not_become_confirmed_but_end_is_imported(self):
        events,reviews,_=source.import_game(self.data,self.game,[],STAMP)
        self.assertEqual(len(events),1);self.assertIn('结束提醒',events[0]['title']);self.assertIsNone(events[0]['end'])
        self.assertIn('推算',reviews['banner']['reason']);self.assertTrue(events[0]['start'].endswith('+08:00'))
    def test_same_game_wrong_server_rejected(self):
        self.game['server']='global'
        with self.assertRaises(ValueError):source.import_game(self.data,self.game,[],STAMP)
    def test_version_end_never_becomes_next_update(self):
        self.row['typeId']='version';self.row['timeCertainty']={'start':'confirmed','end':'estimated'}
        events,_,_=source.import_game(self.data,self.game,[],STAMP)
        self.assertEqual(len(events),1);self.assertIsNone(events[0]['end']);self.assertEqual(events[0]['event_type'],'version_update')
    def test_unknown_does_not_claim_official_nonannouncement(self):
        self.row['timeCertainty']={'start':'unknown'}
        events,reviews,_=source.import_game(self.data,self.game,[],STAMP)
        self.assertEqual(events,[]);self.assertEqual(reviews['banner']['status'],'source_uncertain');self.assertIn('不代表官方没有公布',reviews['banner']['reason'])
    def test_replaces_only_covered_types_and_stable_revisions(self):
        old=[{'id':'wiki','game':{'game_id':'genshin','server':'cn'},'event_type':'banner'}, {'id':'preview','game':{'game_id':'other','server':'cn'},'event_type':'livestream'}]
        events,_=source.apply(self.data,[self.game],old,STAMP)
        self.assertNotIn('wiki',[e['id'] for e in events]);self.assertIn('preview',[e['id'] for e in events])
        first=events[-1];events,_=source.apply(self.data,[self.game],events,STAMP)
        self.assertEqual(events[-1]['revision'],first['revision']);self.assertEqual(events[-1]['id'],first['id'])
        self.row['end']+=60000;events,_=source.apply(self.data,[self.game],events,STAMP)
        self.assertEqual(events[-1]['id'],first['id']);self.assertEqual(events[-1]['revision'],first['revision']+1)
    def test_live_sync_does_not_restore_old_wiki_banners_and_failure_keeps_last_good(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);data=root/'data';state=root/'state';fixture=root/'fixtures';data.mkdir();state.mkdir();fixture.mkdir()
            (data/'wiki-sources.json').write_text(json.dumps({'games':[self.game],'allowed_hosts':['wiki.biligame.com']}))
            (data/'events.json').write_text(json.dumps({'events':[]}))
            stale={'id':'wiki','wiki_key':'old','game':{'game_id':'genshin','server':'cn'},'event_type':'banner'}
            (state/'wiki-state.json').write_text(json.dumps({'events':[stale],'games':{}}))
            (fixture/'gameg.html').write_text('<script id="timeline-data" type="application/json">'+json.dumps(self.data)+'</script>')
            first=wiki_sync.sync(data,state,fixture)
            self.assertEqual(len(first['events']),1);self.assertEqual(first['events'][0]['sources'][0]['provider'],'gameg')
            (fixture/'gameg.html').write_text('broken')
            second=wiki_sync.sync(data,state,fixture)
            self.assertEqual(second['events'],first['events']);self.assertIn('error',second['games']['genshin'])
    def test_public_yaml_matches_site_defaults_and_timezone(self):
        doc={'game':'genshin-impact','region':'cn','events':[{'id':'a','name':'卡池','type':'banner','start':'2026-10-23T20:00:00+08:00','sources':[]}]}
        group=source.from_yaml(doc,'data/genshin-impact/cn-2026.yaml')
        row=group['events'][0]
        self.assertEqual(row['timeCertainty'],{'start':'unknown'})
        self.assertEqual(source.iso(row['start']),'2026-10-23T20:00:00+08:00')
        self.assertEqual(row['key'],'genshin-impact/cn/event/a')
    def test_unknown_source_dates_are_visible_without_creating_confirmed_events(self):
        self.row['timeCertainty']={'start':'unknown'}
        events,reports=source.apply(self.data,[self.game],[],STAMP)
        self.assertEqual(events,[])
        record=reports['genshin']['source_records']['banner'][0]
        self.assertEqual(record['start'],source.iso(START))
        self.assertEqual(record['end'],source.iso(END))
        self.assertEqual(record['certainty']['start'],'unknown')
        self.assertEqual(reports['genshin']['source_types']['banner'],'pending')
    def test_absent_category_is_explicitly_not_listed_not_officially_unannounced(self):
        _,reviews,_=source.import_game(self.data,self.game,[],STAMP)
        self.assertEqual(reviews['livestream']['status'],'source_not_listed')
        self.assertIn('不是读取失败',reviews['livestream']['reason'])
        self.assertIn('不能据此认定官方没有公布',reviews['livestream']['reason'])
    def test_bad_structure_fails_loudly(self):
        with self.assertRaises(ValueError):source.parse('<html>error</html>')
if __name__=='__main__':unittest.main()
