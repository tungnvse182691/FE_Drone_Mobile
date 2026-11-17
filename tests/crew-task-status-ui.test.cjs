const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
test('Crew task states have distinct colors and icons, with the full readable label',()=>{
 const tones=[];
 for(const status of ['NewAssigned','Accepted','InProgress','Submitted','Completed','SupplementRequired']){
  const label='Trạng thái '+status;
  const s=screen('src/components/CrewTaskStatus.tsx',{exportName:'CrewTaskStatus',props:{status,label}});
  s.render();
  const text=s.nodes().find(n=>n.type==='Text');assert.ok(text.props.children.includes(label));
  const root=s.nodes().find(n=>n.type==='View');tones.push(root.props.style[1].backgroundColor);
  assert.ok(s.nodes().some(n=>n.type==='MaterialIcons'&&n.props.name));s.unmount();
 }
 assert.equal(new Set(tones).size,tones.length);
});
