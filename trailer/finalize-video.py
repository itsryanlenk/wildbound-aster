#!/usr/bin/env python3
"""Mux the final original score, verify playable streams, and extract a poster."""
from pathlib import Path
import hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parent
def run(args,**kw):return subprocess.run(args,check=True,**kw)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
capture=json.loads((ROOT/'clips/manifest.json').read_text())
assert capture['status']=='final','Only final, verified gameplay can be mastered.'
render_report=json.loads((ROOT/'work/render-report.json').read_text())
audio_report=json.loads((ROOT/'work/audio-report.json').read_text())
for source in render_report['sources']+render_report['staticSources']:
    assert sha(ROOT/source['path'])==source['sha256'],f"Source changed after render: {source['path']}"
assert sha(ROOT/'public/audio/mix.wav')==audio_report['sha256'],'Mixed audio changed after verification.'
assert sha(ROOT/'clips/events.json')==audio_report['eventManifestSha256'],'Gameplay events changed after the sound mix.'
assert sha(ROOT/'storyboard.json')==audio_report['storyboardSha256'],'Storyboard changed after the sound mix.'
out=ROOT/'wildbound-launch-trailer.mp4';tmp=ROOT/'work/final.partial.mp4'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(ROOT/'work/composition-silent.mp4'),'-i',str(ROOT/'public/audio/mix.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','50','-movflags','+faststart','-metadata','title=Wildbound: Echoes of Aster — Launch Trailer','-metadata','artist=Wildbound','-metadata','comment=Actual game engine footage with original game art and soundtrack; editorial trailer composition.',str(tmp)])
os.replace(tmp,out)
probe=json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(out)],capture_output=True,text=True).stdout)
video=next(s for s in probe['streams']if s['codec_type']=='video');audio=next(s for s in probe['streams']if s['codec_type']=='audio')
assert video['codec_name']=='h264'and video['width']==1280 and video['height']==720
assert video['pix_fmt']=='yuv420p'and video['r_frame_rate']=='30/1'
assert int(video.get('nb_read_frames',video.get('nb_frames',0)))==1500
assert audio['codec_name']=='aac'and audio['sample_rate']=='48000'and audio['channels']==2
assert abs(float(probe['format']['duration'])-50)<.1
decode=run(['ffmpeg','-v','error','-i',str(out),'-f','null','-'],capture_output=True,text=True)
assert not decode.stderr.strip(),decode.stderr
poster=ROOT/'wildbound-launch-poster.png'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','46','-i',str(out),'-frames:v','1',str(poster)])
for key,time in [('opening',2.5),('explore',8),('discover',15),('battle',21.2),('capture',28.2),('beacon',35),('save',40),('closing',46)]:
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(time),'-i',str(out),'-frames:v','1',str(ROOT/'work'/f'qa-{key}.png')])
loudness=run(['ffmpeg','-hide_banner','-i',str(out),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True)
measured=json.loads(re.findall(r'\{[^{}]+\}',loudness.stderr,re.S)[-1])
report={'output':str(out),'durationSeconds':float(probe['format']['duration']),'width':video['width'],'height':video['height'],'fps':30,'frames':1500,'videoCodec':video['codec_name'],'pixelFormat':video['pix_fmt'],'audioCodec':audio['codec_name'],'audioSampleRate':int(audio['sample_rate']),'audioChannels':audio['channels'],'integratedLoudnessLUFS':float(measured['input_i']),'truePeakDBTP':float(measured['input_tp']),'loudnessRangeLU':float(measured['input_lra']),'decodeErrors':decode.stderr.strip(),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'poster':str(poster),'posterTimeSeconds':46,'captureStatus':capture['status'],'sourceHashesVerified':True,'orchestralSource':'Original local synthesis; no external audio service'}
(ROOT/'video-quality.json').write_text(json.dumps(report,indent=2)+'\n')
(ROOT/'work/ffprobe.json').write_text(json.dumps(probe,indent=2)+'\n')
print(json.dumps(report,indent=2))
