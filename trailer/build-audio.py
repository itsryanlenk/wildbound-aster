#!/usr/bin/env python3
"""Mix the original orchestral synthesis and timestamped engine sound effects."""
from pathlib import Path
import hashlib,json,os,re,shutil,subprocess,wave
import numpy as np

ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT/'public/audio';PUBLIC.mkdir(parents=True,exist_ok=True)
SOURCE=Path(os.environ.get('WILDBOUND_AUDIO_SOURCE',str(ROOT.parent/'audio-assets/audio')))
SR=48000;DURATION=50;N=SR*DURATION
story=json.loads((ROOT/'storyboard.json').read_text())
events=json.loads((ROOT/'clips/events.json').read_text()) if (ROOT/'clips/events.json').exists() else {}
music=np.zeros((N,2),np.float32);effects=np.zeros_like(music);cache={};used=[];skipped=[]

def run(args,**kw):return subprocess.run(args,check=True,**kw)
def decode(path,tempo=1):
    key=(str(path),tempo)
    if key in cache:return cache[key]
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-i',str(path)]
    if tempo!=1:cmd+=['-af',f'atempo={tempo:.9f}']
    cmd+=['-ar',str(SR),'-ac','2','-f','f32le','pipe:1']
    x=np.frombuffer(run(cmd,capture_output=True).stdout,dtype='<f4').reshape(-1,2).copy()
    assert np.isfinite(x).all() and len(x)>0
    cache[key]=x;return x

def source_asset(group,name):
    ext='.mp3' if group in ('music','stingers') else '.wav'
    filename=name+ext
    dest=PUBLIC/(filename if group=='music' else group+'-'+filename)
    src=SOURCE/group/filename
    if src.exists():shutil.copy2(src,dest)
    if not dest.exists():return None
    raw=dest.read_bytes()
    if not raw:raise RuntimeError(f'Empty audio asset {dest}')
    return dest

def stretch_rate(x,rate):
    if abs(rate-1)<1e-6:return x
    old=np.arange(len(x));new=np.arange(round(len(x)/rate))*rate
    return np.column_stack([np.interp(new,old,x[:,c])for c in range(2)]).astype(np.float32)

def lay(bus,x,start,duration=None,offset=0,gain=1,fade_in=.008,fade_out=.02,loop=False):
    count=round((duration if duration is not None else len(x)/SR)*SR)
    ix=np.arange(count)+round(offset*SR)
    if loop:y=x[ix%len(x)].copy()
    else:
        y=np.zeros((count,2),np.float32);valid=ix<len(x);y[valid]=x[ix[valid]]
    n_in=min(count,round(fade_in*SR));n_out=min(count,round(fade_out*SR))
    if n_in:y[:n_in]*=np.linspace(0,1,n_in)[:,None]
    if n_out:y[-n_out:]*=np.linspace(1,0,n_out)[:,None]
    pos=round(start*SR);count=min(len(y),len(bus)-pos)
    if count>0 and pos>=0:bus[pos:pos+count]+=y[:count]*gain

score=decode(PUBLIC/'orchestral-score.wav')
score_info=json.loads((ROOT/'orchestral-score.json').read_text())
lay(music,score,0,DURATION,gain=.85,fade_in=.15,fade_out=.3)
duck=np.ones(N,np.float32)

def schedule(group,name,start,volume=1,rate=1,editorial=False):
    p=source_asset(group,name)
    if p is None:
        skipped.append({'group':group,'name':name,'time':start,'reason':'No corresponding original asset'});return
    x=stretch_rate(decode(p),rate)
    base=.64 if group=='sfx' else .40 if group=='cries' else .56
    if name=='step-grass':base=.24
    if name.startswith('ui-'):base=.28
    lay(effects,x,start,gain=base*volume)
    entry={'time':round(start,3),'group':group,'name':name,'volume':volume,'rate':rate,'duration':len(x)/SR,'asset':str(p.relative_to(ROOT)),'editorial':editorial}
    used.append(entry)
    if group=='stingers':
        a=max(0,round((start-.08)*SR));b=min(N,round((start+len(x)/SR+.16)*SR))
        env=np.ones(b-a,np.float32)*.26;edge=min(int(.18*SR),len(env)//2)
        env[:edge]=np.linspace(1,.26,edge);env[-edge:]=np.linspace(.26,1,edge)
        duck[a:b]=np.minimum(duck[a:b],env)

# Logo accents use original game UI sounds. The gameplay sound bed uses only
# emitted engine events at their recorded relative times.
schedule('sfx','ui-start',.42,.60,editorial=True)
for segment in story['segments']:
    if segment['kind']!='gameplay':continue
    shots=segment.get('shots',[{'asset':segment['asset'],'sourceStart':0,'duration':segment['duration']}])
    shot_offset=0
    for shot in shots:
        clip_id=Path(shot['asset']).stem;source_start=shot.get('sourceStart',0)
        for event in events.get(clip_id,[]):
            source_time=float(event.get('time',0))
            if source_time<source_start or source_time>=source_start+shot['duration']:continue
            t=segment['start']+shot_offset+source_time-source_start
            kind=event.get('kind');cue=event.get('cue','')
            if kind=='audio':
                if cue in ('win','evolve'):
                    skipped.append({'group':'stingers','name':{'win':'victory','evolve':'evolution'}[cue],'time':round(t,3),'reason':'Editorial music mix uses the continuous orchestral score'})
                    continue
                cue={'select':'ui-press','attack':'attack-neutral','start':'ui-start','battle':'encounter','capture':'throw','pause':'ui-pause'}.get(cue,cue)
                if cue=='ui-error':continue
                schedule('sfx',cue,t,float(event.get('volume',1)),float(event.get('rate',1)))
            elif kind=='cry':schedule('cries',f"{int(event['speciesId']):03d}",t,.80)
            elif kind=='stinger':
                # Melodic game fanfares are omitted under the continuous score;
                # real capture-success and level-up SFX remain at their events.
                skipped.append({'group':'stingers','name':cue,'time':round(t,3),'reason':'Editorial music mix uses the continuous orchestral score'})
        shot_offset+=shot['duration']
schedule('sfx','ui-confirm',44.45,.48,editorial=True)
mix=music*duck[:,None]+effects
mix[-int(.75*SR):]*=np.linspace(1,0,int(.75*SR))[:,None]
peak=float(np.abs(mix).max())
if peak>.94:mix*=.94/peak
assert np.isfinite(mix).all()
raw=ROOT/'work/audio-mix-raw.wav';raw.parent.mkdir(exist_ok=True)
with wave.open(str(raw),'wb')as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(np.rint(mix*32767).astype('<i2').tobytes())
analysis=run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True)
stats=json.loads(re.findall(r'\{[^{}]+\}',analysis.stderr,re.S)[-1])
filt=('loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:print_format=json'
      f":measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}"
      f":measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}")
tmp=PUBLIC/'mix.partial.wav';out=PUBLIC/'mix.wav'
normal=run(['ffmpeg','-hide_banner','-loglevel','info','-y','-i',str(raw),'-af',filt,'-ar',str(SR),'-ac','2','-c:a','pcm_s16le',str(tmp)],capture_output=True,text=True)
os.replace(tmp,out)
normalized=decode(out)
report={'duration':DURATION,'sampleRate':SR,'channels':2,'music':[score_info],'eventsUsed':used,'eventsSkipped':skipped,'normalization':stats,'finite':bool(np.isfinite(normalized).all()),'peak':float(np.abs(normalized).max()),'clippedSamples':int((np.abs(normalized)>=.999).sum()),'asset':str(out.relative_to(ROOT)),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
report['eventManifestSha256']=hashlib.sha256((ROOT/'clips/events.json').read_bytes()).hexdigest()
report['storyboardSha256']=hashlib.sha256((ROOT/'storyboard.json').read_bytes()).hexdigest()
(ROOT/'work/audio-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k]for k in ['duration','sampleRate','channels','finite','peak','clippedSamples','bytes']},indent=2))
print(f'Mixed {len(used)} original sound events; output: {out}')
