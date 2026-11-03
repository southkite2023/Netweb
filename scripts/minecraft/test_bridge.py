import importlib.util, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('bridge',Path(__file__).with_name('whitelist-bridge.py'))
bridge=importlib.util.module_from_spec(spec); spec.loader.exec_module(bridge)
UUID='364cfb21-c678-4af3-8547-fc97fae20cb1'
class BridgeTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(); bridge.ROOT=Path(self.temp.name); bridge.STATE=bridge.ROOT/'state'; bridge.STATE.mkdir(); self.calls=[]
  (bridge.ROOT/'whitelist.json').write_text(json.dumps([{'uuid':'manual','name':'ManualPlayer'}]))
  def rcon(command):
   self.calls.append(command); rows=json.loads((bridge.ROOT/'whitelist.json').read_text()); rows.append({'uuid':UUID,'name':'MR_SouthKite'}); (bridge.ROOT/'whitelist.json').write_text(json.dumps(rows)); return 'Added'
  bridge.rcon=rcon
 def tearDown(self): self.temp.cleanup()
 def test_add_preserves_manual_entries_and_is_idempotent(self):
  request={'operation':'add','uuid':UUID,'name':'MR_SouthKite'}
  self.assertTrue(bridge.run(request)['present']); self.assertTrue(bridge.run(request)['present']); self.assertEqual(len(self.calls),1)
  self.assertEqual(json.loads((bridge.ROOT/'whitelist.json').read_text())[0]['name'],'ManualPlayer')
 def test_manual_removal_is_not_reverted(self):
  request={'operation':'add','uuid':UUID,'name':'MR_SouthKite'}; bridge.run(request)
  (bridge.ROOT/'whitelist.json').write_text('[]')
  self.assertFalse(bridge.run(request)['present']); self.assertEqual(len(self.calls),1)
 def test_command_injection_is_rejected(self):
  with self.assertRaises(ValueError): bridge.run({'operation':'add','uuid':UUID,'name':'Steve\nstop'})
  self.assertEqual(self.calls,[])
if __name__=='__main__': unittest.main()
