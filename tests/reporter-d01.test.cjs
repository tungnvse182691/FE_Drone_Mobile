const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const flatten=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flatten)):s??{};
const detailModules={'../../src/components/Card':{Card:'Card'},'@tanstack/react-query':{useQuery:()=>({})}};
test('D01 description preserves an unbroken backend value and expands from three lines',async()=>{
 const value='X'.repeat(2000);
 const s=screen('app/(reporter)/report-detail.tsx',{expose:'ExpandableDescription',exportName:'ExpandableDescription',props:{value},modules:detailModules});
 s.render();let text=s.nodes().find(n=>n.props.testID==='report-description');assert.equal(text.props.children[0],value);assert.equal(text.props.numberOfLines,3);
 text.props.onTextLayout({nativeEvent:{lines:[1,2,3,4]}});await s.flush();await s.tap('toggle-description');await s.flush();
 text=s.nodes().find(n=>n.props.testID==='report-description');assert.equal(text.props.numberOfLines,undefined);assert.equal(text.props.children[0],value);
 await s.tap('toggle-description');await s.flush();assert.equal(s.nodes().find(n=>n.props.testID==='report-description').props.numberOfLines,3);s.unmount();
});
test('D01 metadata is opt-in and retained without any external link',async()=>{
 const s=screen('app/(reporter)/report-detail.tsx',{expose:'EvidenceMetadata',exportName:'EvidenceMetadata',props:{item:{locationSource:'CAPTURE',capturedAt:'2026-11-02T00:00:00Z',location:{latitude:10.12345,longitude:106.67890,accuracyMeters:3}},index:0},modules:detailModules});
 s.render();assert.doesNotMatch(JSON.stringify(s.nodes()),/10.12345/);await s.tap('metadata-0');await s.flush();assert.match(JSON.stringify(s.nodes()),/10.12345/);await s.tap('metadata-0');await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes()),/10.12345/);s.unmount();
});
for(const count of [0,1,2,3])test('D01 detail '+count+' photos has compact refresh, pull refresh and a two column grid',()=>{
 const report={id:'r',description:'QA',createdAt:'2026-11-02T00:00:00Z',routingStatus:'UNASSIGNED',evidence:Array.from({length:count},(_,i)=>({id:'e'+i})),supplements:[],publicUpdates:[]};
 const q={isError:false,isFetching:false,isPending:false,data:{report},refetch(){}};
 const s=screen('app/(reporter)/report-detail.tsx',{modules:{...detailModules,'../../src/api/authApi':{passwordSessionIdentity:()=> 'scope'},'@tanstack/react-query':{useQuery:()=>q}}});s.h.login();s.render();
 const refresh=s.nodes().find(n=>n.props.testID==='refresh-report');assert.ok(refresh);assert.ok(flatten(refresh.props.style).minHeight>=48);assert.ok(flatten(refresh.props.style).minWidth>=48);
 assert.ok(s.nodes().find(n=>n.type==='ScrollView').props.refreshControl);assert.equal(s.nodes().filter(n=>n.props.testID==='evidence-cell').length,count);
 for(const cell of s.nodes().filter(n=>n.props.testID==='evidence-cell'))assert.equal(flatten(cell.props.style).width,'48%');
 assert.ok(s.nodes().some(n=>n.props.title==='Bổ sung thông tin'));s.unmount();
});
