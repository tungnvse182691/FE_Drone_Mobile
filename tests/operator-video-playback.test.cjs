const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');

function cacheFixture(options={}) {
  const events=[],listeners=new Set();let valid=true,reads=0;
  const file={fileId:'video-id',sizeBytes:options.size??5,checksumSha256:'fixture-hash'};
  const mod={exports:{}};
  const deps={
    'expo-crypto':{randomUUID:()=> 'test-preview'},
    '../store/auth':{useAuthStore:{getState:()=>({token:'secret-test-bearer'}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}}},
    './client':{apiClient:{defaults:{baseURL:'http://192.168.1.2:18181/api/v1'}}},
    './operatorVideoReadback':{operatorVideoGuard:()=>({check(){if(!valid)throw Error('session changed');},close(){}}),readOperatorVideos:async()=>{
      if(++reads===2&&options.denyAfter)throw {response:{status:403}};
      return {videos:[{...file,checksumSha256:reads===2&&options.changed?'changed':file.checksumSha256}]};
    }},
    'expo-file-system/legacy':{
      cacheDirectory:'file:///ios-or-android-cache/',deleteAsync:async uri=>events.push(['delete',uri]),makeDirectoryAsync:async()=>{},
      writeAsStringAsync:async()=>{},getInfoAsync:async()=>({exists:true,isDirectory:false,size:options.actualSize??file.sizeBytes}),
      createDownloadResumable:(url,uri,config,progress)=>({cancelAsync:async()=>events.push(['cancel']),downloadAsync:async()=>{
        events.push(['download',url,config]);await options.duringDownload?.(()=>{valid=false;listeners.forEach(f=>f());});
        progress({totalBytesWritten:file.sizeBytes,totalBytesExpectedToWrite:file.sizeBytes});
        if(options.interrupted)throw Error('network interrupted');
        return {status:options.status??200,headers:{'Content-Type':options.mime??'video/mp4'}};
      }}),
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/operatorVideoCache.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {module:mod,exports:mod.exports,setTimeout,clearTimeout,require:n=>deps[n]});
  return {events,listeners,api:mod.exports,open:signal=>mod.exports.downloadOperatorVideo('scope','task','project','dataset',file.fileId,signal??new AbortController().signal,()=>{})};
}

test('local video lease detaches native player before deleting its cache, disposal is idempotent',async()=>{
  const h=cacheFixture(),lease=await h.open();
  assert.match(lease.videoUri,/^file:.*\/video\.mp4$/);
  const detach=lease.attachPlayer(()=>h.events.push(['detach']));
  await lease.dispose();detach();await lease.dispose();
  assert.deepEqual(h.events.map(e=>e[0]),['delete','download','detach','delete']);
  assert.throws(()=>lease.attachPlayer(()=>{}));
  assert.equal(h.listeners.size,0);
});

test('one player/cache at a time; next download cannot delete a mounted player file',async()=>{
  const h=cacheFixture(),lease=await h.open();
  const detach=lease.attachPlayer(()=>h.events.push(['detach']));
  await assert.rejects(h.open(),/busy/);
  detach();await lease.dispose();const next=await h.open();await next.dispose();
  assert.equal(h.events.filter(e=>e[0]==='detach').length,1);
});

test('download uses LAN-configured endpoint and Bearer header without leaking token into URI',async()=>{
  const h=cacheFixture(),lease=await h.open(),download=h.events.find(e=>e[0]==='download');
  assert.equal(download[1],'http://192.168.1.2:18181/api/v1/files/video-id/content');
  assert.equal(download[2].headers.Authorization,'Bearer secret-test-bearer');
  assert.ok(!lease.videoUri.includes('secret-test-bearer'));await lease.dispose();
});

for(const options of [{size:256*1024*1024+1},{actualSize:4},{mime:'text/html'},{status:401},{status:403},{status:404},{denyAfter:true},{changed:true},{interrupted:true},{duringDownload:async invalidate=>invalidate()}]) {
  test('rejects invalid/unauthorized/interrupted preview '+JSON.stringify(options),async()=>{
    const h=cacheFixture(options);await assert.rejects(h.open());assert.equal(h.listeners.size,0);
    assert.ok(h.events.filter(e=>e[0]==='delete').every(e=>e[1].startsWith('file:///ios-or-android-cache/roadguard-operator-video-preview-v1/')));
    const recovered=cacheFixture();const lease=await recovered.open();await lease.dispose();
  });
}

test('cancel during download prevents a lease and allows manual retry',async()=>{
  const controller=new AbortController();let first=true;
  const h=cacheFixture({duringDownload:async()=>{if(first){first=false;controller.abort();}}});
  await assert.rejects(h.open(controller.signal));const lease=await h.open();await lease.dispose();
});

module.exports={cacheFixture};

const {screen}=require('./helpers/roadfe-screen.cjs');
function previewFixture(props={}) {
  const callbacks={},calls=[];let detach;
  const player={status:'loading',playing:false,duration:0,currentTime:0,
    pause:()=>calls.push('pause'),replace:source=>calls.push(['replace',source])};
  const lease={videoUri:'file:///private/preview/video.mp4',attachPlayer:f=>{detach=f;return()=>{f();detach=undefined;};}};
  const ui=screen('src/components/drone/VideoPreview.tsx',{exportName:'VideoPreview',props:{lease,...props},modules:{
    'expo-video':{VideoView:'VideoView',useVideoPlayer:(source,setup,options)=>{assert.equal(source.uri,lease.videoUri);assert.equal(options?.seekBackwardIncrement,5);assert.equal(options?.seekForwardIncrement,5);setup(player);return player;}},
  },moduleFactories:{expo:({react})=>({useEvent:(instance,name,initial)=>{
    const [value,setValue]=react.useState(initial??null);
    react.useEffect(()=>{callbacks[name]=setValue;return()=>delete callbacks[name];},[name]);
    return value;
  }})}});
  ui.render();return {...ui,player,calls,close:()=>detach?.(),emit:async(name,event)=>{callbacks[name](event);await ui.flush();}};
}
test('native preview waits for readiness, never autoplays, reports real duration/progress and first frame',async()=>{
  const ui=previewFixture();assert.ok(!ui.calls.includes('play'));
  await ui.emit('sourceLoad',{duration:30});await ui.emit('statusChange',{status:'readyToPlay'});
  await ui.emit('timeUpdate',{currentTime:12});await ui.emit('playingChange',{isPlaying:true});
  ui.nodes().find(n=>n.type==='VideoView').props.onFirstFrameRender();await ui.flush();
  assert.match(JSON.stringify(ui.nodes()),/0:12 \/ 0:30/);assert.match(JSON.stringify(ui.nodes()),/Đã hiển thị hình/);
  const view=ui.nodes().find(n=>n.type==='VideoView');assert.equal(view.props.nativeControls,true);assert.equal(view.props.fullscreenOptions.enable,true);
  ui.close();assert.deepEqual(ui.calls.slice(-2),['pause',['replace',null]]);ui.unmount();
});
test('decoder/corrupt-source errors replace the black player with an alert and do not leak native file paths',async()=>{
  for(const message of ['decoder unsupported mp4v','corrupt file:///private/secret/video.mp4']){
    const ui=previewFixture();await ui.emit('statusChange',{status:'error',error:{message}});
    assert.ok(!ui.nodes().some(n=>n.type==='VideoView'));
    assert.ok(ui.nodes().some(n=>n.props.accessibilityRole==='alert'));
    assert.doesNotMatch(JSON.stringify(ui.nodes()),/secret|decoder unsupported/);
    assert.ok(ui.calls.includes('pause'));ui.unmount();
  }
});

test('dedicated viewer expands the same native player without launching another Android Activity',()=>{
 const ui=previewFixture({expanded:true,immersive:true});
 const view=ui.nodes().find(n=>n.type==='VideoView');
 assert.equal(view.props.fullscreenOptions.enable,false);assert.equal(view.props.nativeControls,true);assert.equal(view.props.style.flex,1);
 assert.ok(!ui.nodes().some(n=>n.props.accessibilityLiveRegion==='polite'));ui.unmount();
});

test('initial readiness timeout never expires a previously ready video during seek buffering',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const ui=previewFixture();
  await ui.emit('statusChange',{status:'readyToPlay'});
  await ui.emit('statusChange',{status:'loading'});
  t.mock.timers.tick(21000);ui.render();
  assert.ok(ui.nodes().some(n=>n.type==='VideoView'));
  assert.ok(!ui.nodes().some(n=>n.props.accessibilityRole==='alert'));
  ui.unmount();
});

test('default dedicated viewer uses a contained 16:9 player instead of filling the screen',()=>{
 const ui=previewFixture({expanded:true});const view=ui.nodes().find(n=>n.type==='VideoView');
 assert.equal(view.props.style.aspectRatio,16/9);assert.equal(view.props.style.flex,undefined);assert.equal(view.props.contentFit,'contain');
 assert.equal(view.props.fullscreenOptions.enable,false);ui.unmount();
});
