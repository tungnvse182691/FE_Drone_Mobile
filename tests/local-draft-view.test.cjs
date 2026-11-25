const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function fixture(pending=false){
 const gate=deferred();let changed,closed=0;
 const user={id:'A',role_code:'REPAIR_CREW'};
 const store=selector=>selector({user});
 store.getState=()=>({localDraftReadIdentity:async()=>({actor:'A',role:'REPAIR_CREW',scope:'s',environment:'e'})});
 store.subscribe=fn=>{changed=fn;return()=>{};};
 const s=screen('src/components/LocalSavedDrafts.tsx',{exportName:'LocalSavedDrafts',props:{role:'REPAIR_CREW',onClose:()=>closed++},
 moduleFactories:{'react-native':({modules})=>({...modules['react-native'],FlatList:'FlatList',BackHandler:{addEventListener:()=>({remove(){}})}})},
 modules:{'./Button':{Button:'Button'},'../store/auth':{useAuthStore:store},
 '../offline/localDraftRead':{loadLocalDraftSummaries:async()=>pending?gate.promise:[{key:'local',reference:'saved-task',updatedAt:'2026-11-24T00:00:00Z',photoCount:2,measurementCount:1,hasCommand:true,description:null}]}}});
 return{s,change:()=>changed(),closed:()=>closed,gate};
}
function text(s){
 const list=s.nodes().find(n=>n.type==='FlatList');
 const walk=n=>Array.isArray(n)?n.map(walk).join(' '):typeof n==='string'||typeof n==='number'?String(n):n?.props?walk(n.props.children):'';
 return list.props.data.map(item=>walk(list.props.renderItem({item}))).join(' ');
}
test('cold draft view displays saved counts and offers no submit or route action',async()=>{
 const f=fixture();f.s.render();await f.s.flush();
 assert.doesNotMatch(text(f.s),/Mã tham chiếu|saved-ta/);assert.ok(!text(f.s).includes('saved-task'));assert.match(text(f.s),/2\s+ảnh/);
 assert.ok(text(f.s).includes('Cần đối soát khi kết nối lại'));
 const footer=f.s.nodes().find(n=>n.type==='FlatList').props.ListFooterComponent;
 const button=footer.props.children.flat().find(n=>n?.type==='Button');
 assert.equal(button.props.title,'Quay lại khôi phục phiên');
 button.props.onPress();assert.equal(f.closed(),1);
 f.change();await f.s.flush();assert.equal(f.closed(),2);assert.ok(!text(f.s).includes('saved-task'));f.s.unmount();
});
test('late SQLite result after auth change cannot reveal old account drafts',async()=>{
 const f=fixture(true);f.s.render();await f.s.flush();f.change();
 f.gate.resolve([{key:'secret',reference:'old-account',photoCount:2,measurementCount:1,updatedAt:'2026-11-24T00:00:00Z'}]);
 await f.s.flush();assert.ok(!text(f.s).includes('old-account'));assert.equal(f.closed(),1);f.s.unmount();
});
