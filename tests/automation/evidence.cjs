// A successful script exit is not proof that its positive HTTP branch ran.
function reporterReadStatus(log,exitCode){
  if(exitCode!==0)return 'FAIL';
  if(log.includes('BE_FIXTURE_BLOCKED'))return 'BE_FIXTURE_BLOCKED';
  const required=['API215 authorized list:200',
    ...['210','215','217','218'].map(id=>`API${id} anonymous:401`),
    ...['210','217','218'].map(id=>`API${id} authorized absent resource:404`)];
  return required.every(marker=>log.includes(marker))?'PASS':'FAIL';
}
module.exports={reporterReadStatus};
