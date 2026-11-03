#!/usr/bin/python3
"""Forced SSH entry point. No caller-supplied commands, paths, hosts or secrets."""
import fcntl, json, os, re, socket, struct, sys, time
from pathlib import Path
ROOT = Path('/srv/minecraft')
STATE = Path('/var/lib/minecraft-whitelist')

def packet(sock, kind, text):
    data = struct.pack('<ii', 731, kind) + text.encode() + b'\0\0'
    sock.sendall(struct.pack('<i',len(data)) + data)

def receive(sock):
    def exact(size):
        data = b''
        while len(data)<size:
            part=sock.recv(size-len(data))
            if not part: raise ValueError('rcon_closed')
            data+=part
        return data
    length=struct.unpack('<i',exact(4))[0]
    if not 10<=length<=65536: raise ValueError('rcon_packet')
    data=exact(length)
    return struct.unpack('<ii',data[:8]),data[8:-2].decode('utf-8')

def rcon(command):
    props=dict(line.split('=',1) for line in (ROOT/'server.properties').read_text().splitlines() if '=' in line and not line.startswith('#'))
    if props.get('online-mode')!='true' or props.get('white-list')!='true': raise ValueError('unsafe_server_config')
    with socket.create_connection(('127.0.0.1',25575),timeout=8) as sock:
        packet(sock,3,props['rcon.password'])
        for _ in range(3):
            (ident,kind),_=receive(sock)
            if ident==-1: raise ValueError('rcon_auth')
            if kind==2: break
        else: raise ValueError('rcon_auth')
        packet(sock,2,command)
        _,text=receive(sock)
        return text

def run(request):
    operation=request.get('operation')
    if operation=='health':
        text=rcon('list')
        return {'ok':True,'server':text}
    uuid=request.get('uuid',''); name=request.get('name','')
    if operation not in ('add','status') or not re.fullmatch('[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}',uuid) or not re.fullmatch('[A-Za-z0-9_]{3,16}',name): raise ValueError('invalid_request')
    def present(): return any(row['uuid'].lower()==uuid for row in json.loads((ROOT/'whitelist.json').read_text()))
    if operation=='status': return {'ok':True,'present':present()}
    # Durable intent is written BEFORE sending the command. If the outcome is
    # uncertain, retry checks membership only; it never resurrects a manual removal.
    receipt=STATE/(uuid+'.json')
    if receipt.exists(): return {'ok':True,'present':present(),'previouslyProcessed':True}
    existed=present()
    receipt.write_text(json.dumps({'uuid':uuid,'name':name,'at':time.time(),'existed':existed})+'\n')
    with receipt.open('r+') as f: f.flush(); os.fsync(f.fileno())
    if not existed:
        rcon('whitelist add '+name)
    found=present()
    with (STATE/'operations.jsonl').open('a') as f: f.write(json.dumps({'at':time.time(),'uuid':uuid,'name':name,'event':'add_checked','present':found,'existed':existed})+'\n')
    return {'ok':True,'present':found}

if __name__=='__main__':
    try:
        raw=sys.stdin.buffer.read(4097)
        if len(raw)>4096: raise ValueError('request_too_large')
        request=json.loads(raw)
        with (STATE/'bridge.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            print(json.dumps(run(request)))
    except Exception:
        print(json.dumps({'ok':False,'error':'bridge_operation_failed'}))
        sys.exit(1)
