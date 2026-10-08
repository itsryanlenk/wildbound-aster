#!/usr/bin/env python3
"""An original 50-second orchestral-synthesis arrangement of Aster's theme.

Offline and deterministic: no recordings, soundfonts, external services, paid
libraries or imitation of an existing composer's score. The original game's
melodic motif is arranged for synthesized strings, horns, flute, harp, low
strings, timpani, bass drum, snare and cymbals. This is synthesis, not a recorded
orchestra or an ElevenLabs output.
"""
from pathlib import Path
import hashlib,json,math,os,wave
import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parent;SR=32000;DURATION=50;BPM=120;BEAT=.5
N=SR*DURATION;TAU=2*np.pi
rng=np.random.default_rng(846219)
strings=np.zeros((N,2),np.float32);winds=np.zeros_like(strings);rhythm=np.zeros_like(strings)
SCALE=[0,2,4,5,7,9,11];KEY=60
def midi(degree,octave=0):return KEY+SCALE[degree%7]+12*(degree//7+octave)
def freq(note):return 440*2**((note-69)/12)
def envelope(n,attack,release,decay=.0):
    t=np.arange(n)/SR;a=np.minimum(t/max(attack,.001),1);r=np.minimum(np.maximum(n/SR-t,0)/max(release,.001),1)
    return np.sin(a*np.pi/2)**1.3*np.sin(r*np.pi/2)*(np.exp(-decay*t)if decay else 1)
def voice(note,gate,kind,seed=0):
    local=np.random.default_rng(seed+int(note*8191));f=freq(note)
    release={'strings':.24,'spiccato':.065,'horn':.18,'flute':.13,'harp':.30,'bass':.14,'bell':.7}.get(kind,.15)
    n=round((gate+release)*SR);t=np.arange(n)/SR;y=np.zeros(n)
    if kind in ('strings','spiccato','bass'):
        detunes=[-.047,.013,.048] if kind!='bass' else [-.02,.02]
        maxh=min(17,int(SR*.42/f))
        for k,detune in enumerate(detunes):
            vibrato=.0019*np.sin(TAU*(4.7+k*.21)*t+k)*np.minimum(t/.3,1)
            phase=TAU*np.cumsum(f*2**(detune/12)*(1+vibrato))/SR+k*.53
            for h in range(1,maxh+1):
                weight=(1/h**1.12)*np.exp(-(f*h)/5800)
                # A broad bowed-body resonance keeps the source from being a
                # static oscillator while retaining a coherent pitch.
                weight*=.72+.55*np.exp(-.5*((f*h-1200)/850)**2)
                y+=weight*np.sin(h*phase)/len(detunes)
        breath=signal.sosfilt(signal.butter(2,[650,4200],btype='bandpass',fs=SR,output='sos'),local.standard_normal(n))
        y+=breath*.016
        attack=.060 if kind=='strings' else .012 if kind=='spiccato' else .030
        env=envelope(n,attack,release,4.5 if kind=='spiccato' else .14 if kind=='bass' else 0)
        y*=env
    elif kind=='horn':
        for k,detune in enumerate([-.022,.022]):
            phase=TAU*np.cumsum(f*2**(detune/12)*(1+.0018*np.sin(TAU*5.2*t+k)))/SR
            for h in range(1,min(14,int(SR*.4/f))+1):
                weight=(1/h**.85)*np.exp(-f*h/2900)
                weight*=.65+.60*np.exp(-.5*((f*h-900)/650)**2)
                y+=np.sin(h*phase+k*.25)*weight*.5
        y=np.tanh(y*1.2)/1.2
        y*=envelope(n,.045,release)*(.80+.20*np.minimum(t/.2,1))
    elif kind=='flute':
        phase=TAU*np.cumsum(f*(1+.003*np.sin(TAU*5.1*t)*np.minimum(t/.25,1)))/SR
        y=np.sin(phase)+.11*np.sin(2*phase)+.035*np.sin(3*phase)
        breath=signal.sosfilt(signal.butter(2,[1100,5700],btype='bandpass',fs=SR,output='sos'),local.standard_normal(n))
        y+=.022*breath;y*=envelope(n,.045,release)
    elif kind=='harp':
        for h in range(1,min(13,int(SR*.42/f))+1):
            y+=np.sin(TAU*f*h*(1+.000035*h*h)*t+.12*h)/h**1.52*np.exp(-t*(2.2+h*.65))
        y*=envelope(n,.002,release)
    elif kind=='bell':
        y=np.sin(TAU*f*t)*np.exp(-t*2.6)+.25*np.sin(TAU*f*2.008*t)*np.exp(-t*4.5)+.10*np.sin(TAU*f*4.013*t)*np.exp(-t*7)
        y*=envelope(n,.003,release)
    return y.astype(np.float32)
def add(bus,y,start,gain=1,pan=0):
    i=round(start*SR);length=min(len(y),N-i)
    if length<=0 or i<0:return
    a=(pan+1)*np.pi/4;p=np.array([np.cos(a),np.sin(a)],np.float32)
    bus[i:i+length]+=y[:length,None]*p*gain
def note(bus,pitch,start,gate,kind,gain,pan=0):add(bus,voice(pitch,gate,kind,round(start*1000)),start,gain,pan)
def drum(kind):
    dur={'timpani':1.0,'bass':.9,'snare':.20,'cymbal':2.6,'shaker':.12}[kind]
    n=round(dur*SR);t=np.arange(n)/SR;noise=rng.standard_normal(n)
    if kind=='timpani':
        f=65.4+32*np.exp(-t*24);phase=TAU*np.cumsum(f)/SR
        y=(np.sin(phase)+.24*np.sin(1.51*phase)+.14*np.sin(2.16*phase))*np.exp(-t*4.8)
        y+=noise*.05*np.exp(-t*45)
    elif kind=='bass':
        phase=TAU*np.cumsum(35+48*np.exp(-t*18))/SR
        y=np.sin(phase)*np.exp(-t*6)+.14*signal.sosfilt(signal.butter(2,1300,fs=SR,output='sos'),noise)*np.exp(-t*19)
    elif kind=='snare':
        nse=signal.sosfilt(signal.butter(2,[500,8000],btype='bandpass',fs=SR,output='sos'),noise)
        y=nse*.64*np.exp(-t*22)+.20*np.sin(TAU*190*t)*np.exp(-t*28)
    elif kind=='cymbal':
        nse=signal.sosfilt(signal.butter(2,[3400,11800],btype='bandpass',fs=SR,output='sos'),noise)
        y=nse*np.exp(-t*2.2)
        y+=sum(.025*np.sin(TAU*f*t)*np.exp(-t*3)for f in [3169,4711,6347,7919])
    else:
        y=signal.sosfilt(signal.butter(2,[4200,10500],btype='bandpass',fs=SR,output='sos'),noise)*np.exp(-t*43)
    return (y*envelope(n,.002,.04)).astype(np.float32)
kit={k:drum(k)for k in ['timpani','bass','snare','cymbal','shaker']}

# Original Aster melody: an ascending third and sixth, then a stepwise answer.
PHRASES=[[(0,.5),(2,.5),(5,1),(4,1),(2,.5),(1,.5)],[(0,1),(2,.5),(3,.5),(5,1),(4,1)],
 [(2,.5),(4,.5),(7,1),(6,.5),(5,.5),(4,1)],[(1,.5),(2,.5),(4,1),(3,.5),(2,.5),(1,1)],
 [(4,.5),(5,.5),(7,1),(9,1),(7,1)],[(5,1),(4,.5),(3,.5),(2,.5),(3,.5),(5,1)],
 [(6,.5),(5,.5),(3,1),(1,1),(2,.5),(3,.5)],[(4,1),(2,.5),(1,.5),(-1,1),(1,1)]]
CHORDS=[0,3,0,3,5,4,0,3,1,4,5,3,0,4,5,4,0,3,1,4,5,3,4,0,0]
for bar,chord in enumerate(CHORDS):
    if bar%5==0:print('Orchestral arrangement bar',bar+1,'/25',flush=True)
    start=bar*2.0;action=9<=bar<16;climax=16<=bar<24;intro=bar<2;closing=bar>=23
    power=.58 if intro else 1.15 if action else 1.05 if climax else .85
    # Sustained violas/violins and low cello/bass roots.
    chord_notes=[midi(chord+d,-1)for d in [0,2,4]]
    for j,p in enumerate(chord_notes):
        note(strings,p,start,1.86,'strings',.028*power,[-.65,.15,.58][j])
        if bar>=4:note(strings,p+12,start+.025*j,1.75,'strings',.013*power,[-.45,.30,.70][j])
    root=midi(chord,-2)
    while root<31:root+=12
    for b,p in [(0,root),(1.0,root+7)]:note(strings,p,start+b,.9,'bass',.080*power,-.12)
    # Harp arpeggios supply movement without a synthetic chip ostinato timbre.
    if not closing:
        for j in range(8):
            p=midi(chord+[0,2,4,2,0,4,2,4][j],0)
            note(winds,p,start+j*.25,.35,'harp',.043 if not action else .030,-.42 if j%2 else .35)
    if action or climax:
        for j in range(8):
            p=midi(chord+[0,4,2,4][j%4],0)
            note(strings,p,start+j*.25,.115,'spiccato',.035*power,-.55 if j%2 else .55)
    # Woodwind opening, then lyrical horn/strings melody and a heroic return.
    if bar>=2 and not closing:
        phrase=PHRASES[(bar-2)%8];cursor=0
        for degree,duration in phrase:
            p=midi(degree,0 if action or climax else 1)
            kind='horn'if action or climax else 'flute'
            note(winds,p,start+cursor*BEAT,duration*BEAT*.88,kind,.118 if kind=='horn'else .093,-.08)
            if climax:note(strings,p+12,start+cursor*BEAT,duration*BEAT*.92,'strings',.026,.35)
            cursor+=duration
    elif intro:
        for j,d in enumerate([0,4,7]):note(winds,midi(d,1),start+j*.65,.45,'bell',.040,.15-j*.15)
    else:
        # Final two-bar tonic cadence keeps the ending conclusive.
        for j,p in enumerate([midi(0,0),midi(2,0),midi(4,0),midi(7,0)]):
            note(winds,p,start,1.80,'horn',.028 if bar==24 else .040,[-.4,-.1,.2,.4][j])
            note(winds,p+12,start+j*.12,.65,'harp',.028,-.3+j*.2)
    if bar>=2:
        add(rhythm,kit['bass'],start,.105*power,0)
        if action or climax:add(rhythm,kit['timpani'],start+1.0,.098*power,-.15)
        if action:
            for b in [.5,1.5]:add(rhythm,kit['snare'],start+b,.085,.12)
            for j in range(8):add(rhythm,kit['shaker'],start+j*.25,.018*(1 if j%2 else .6),.42)
        elif bar<23:
            add(rhythm,kit['timpani'],start+1.5,.045,-.18)
    if bar in [2,6,9,16,21,23]:add(rhythm,kit['cymbal'],start,.080 if bar in [9,16,23]else .045,.25)
    if bar in [8,15,22]:
        for j in range(6):add(rhythm,kit['snare'],start+1.25+j*.125,.020+j*.008,-.10+j*.04)

# Long, diffuse room reflections provide an orchestral space. Early reflections
# are explicit; the late field is a deterministic exponentially decaying IR.
dry=strings+winds+rhythm
wet=np.zeros_like(dry)
for channel in range(2):
    ir_t=np.arange(round(1.5*SR))/SR
    ir=rng.standard_normal(len(ir_t))*np.exp(-ir_t*5.3)
    ir=signal.sosfilt(signal.butter(2,7200,fs=SR,output='sos'),ir)
    ir*=.007/np.sqrt(np.sum(ir*ir))
    for delay,gain in [(.043,.030),(.079,.022),(.137,.017),(.223,.010),(.361,.006)]:ir[round((delay+channel*.011)*SR)]+=gain
    wet[:,channel]=signal.fftconvolve(dry[:,1-channel],ir,mode='full')[:N]
mix=dry+wet
mix=signal.sosfilt(signal.butter(2,[30,12000],btype='bandpass',fs=SR,output='sos'),mix,axis=0)
mix-=np.mean(mix,axis=0,keepdims=True)
mix=np.tanh(mix*1.04)/1.04
rms=float(np.sqrt(np.mean(mix*mix)));peak=float(np.max(np.abs(mix)))
mix*=min(.15/rms,.88/peak)
mix[:round(.45*SR)]*=np.linspace(0,1,round(.45*SR))[:,None]
mix[-round(.9*SR):]*=np.linspace(1,0,round(.9*SR))[:,None]
assert np.isfinite(mix).all()
out=ROOT/'public/audio/orchestral-score.wav';out.parent.mkdir(parents=True,exist_ok=True)
temp=out.with_name('orchestral-score.partial.wav')
with wave.open(str(temp),'wb')as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(np.rint(mix*32767).astype('<i2').tobytes())
with wave.open(str(temp),'rb')as f:
    assert f.getnframes()==N and f.getnchannels()==2 and f.getframerate()==SR
    actual=np.frombuffer(f.readframes(N),dtype='<i2')
    assert actual.size==N*2 and np.max(np.abs(actual.astype(np.int32)))<32767
os.replace(temp,out)
report={'title':'Aster Takes Flight','duration':50,'bpm':120,'key':'C major / relative A minor','source':'Original local orchestral synthesis, arranged from the original Aster motif','externalAudioService':None,'sampleLibraries':None,'instruments':['bowed violin/viola ensemble','spiccato strings','cello/double-bass','French-horn ensemble','flute','harp','glockenspiel','timpani','orchestral bass drum','snare','cymbals'],'sections':[{'start':0,'name':'Beacon-light prelude'},{'start':4,'name':'Adventure theme, woodwinds and harp'},{'start':18,'name':'Action, horns and string ostinato'},{'start':32,'name':'Heroic return'},{'start':46,'name':'Tonic cadence'}],'finite':True,'peak':float(np.abs(mix).max()),'rmsDbFS':float(20*np.log10(np.sqrt(np.mean(mix*mix)))),'clippedSamples':int((np.abs(mix)>=.999).sum()),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(ROOT/'orchestral-score.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2),flush=True)
