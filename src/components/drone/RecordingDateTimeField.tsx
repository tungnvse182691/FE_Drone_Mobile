import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../../design-tokens';

const pad = (n: number) => String(n).padStart(2, '0');
function parse(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y,mo,d,h,mi] = m.slice(1).map(Number);
  const date = new Date(y,mo-1,d,h,mi);
  return date.getFullYear()===y && date.getMonth()===mo-1 && date.getDate()===d && date.getHours()===h && date.getMinutes()===mi ? date : null;
}
function format(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local wall-clock time, matching the existing upload draft and submit contract. */
export function RecordingDateTimeField({value,onChangeText,disabled=false}: {
  value: string; onChangeText: (value: string) => void; disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [mode,setMode] = useState<'date'|'time'|null>(null);
  const [temp,setTemp] = useState(new Date());
  const active = useRef(true);
  const latest = useRef({disabled,onChangeText});
  latest.current = {disabled,onChangeText};
  useEffect(()=>{active.current=true;return ()=>{active.current=false;};},[]);
  useEffect(()=>{ if (disabled) setMode(null); },[disabled]);
  const current = parse(value);
  const open = (next: 'date'|'time') => { if (!disabled) {setTemp(current??new Date());setMode(next);} };
  const merge = (date: Date) => {
    const next = new Date(temp);
    if(mode==='date')next.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());
    else next.setHours(date.getHours(),date.getMinutes(),0,0);
    return next;
  };
  const confirm = (date=temp) => {
    if(!active.current || latest.current.disabled)return;
    if(mode)latest.current.onChangeText(format(date));
    setMode(null);
  };
  const nativePicker = mode && !disabled ? <DateTimePicker testID="recording-native-picker" value={temp} mode={mode}
    display={mode==='time'?'spinner':Platform.OS==='ios'?'inline':'calendar'}
    locale="vi-VN" is24Hour themeVariant="light" textColor={colors.neutral} accentColor={colors.secondary}
    onDismiss={()=>setMode(null)} onValueChange={(_,date)=>{
      if(!active.current || latest.current.disabled)return;
      const next=merge(date);
      if(Platform.OS==='android')confirm(next);else setTemp(next);
    }}/>:null;
  return <View accessibilityLabel="Thời gian ghi hình" style={styles.container}>
    {Platform.OS==='web' ? React.createElement('input',{
      type:'datetime-local',value:value.replace(' ','T'),disabled,'aria-label':'Thời gian ghi hình',
      onChange:(event: {target:{value:string}})=>{const next=event.target.value.replace('T',' ');if(active.current && !latest.current.disabled && parse(next))latest.current.onChangeText(next);},
      style:{minHeight:52,fontSize:16,padding:12,border:'1px solid '+colors.border,borderRadius:12,color:colors.neutral,background:colors.surfaceAlt},
    }):<View style={styles.fields}>
      {(['date','time'] as const).map(kind=><Pressable key={kind} testID={`recording-${kind}`} accessibilityRole="button"
        accessibilityLabel={kind==='date'?'Chọn ngày ghi hình':'Chọn giờ ghi hình'} accessibilityState={{disabled}}
        disabled={disabled} onPress={()=>open(kind)} style={[styles.field,disabled&&styles.disabled]}>
        <MaterialIcons name={kind==='date'?'calendar-today':'access-time'} size={22} color={colors.secondary}/>
        <View style={styles.copy}><Text style={styles.label}>{kind==='date'?'Ngày':'Giờ'}</Text>
          <Text style={styles.value}>{current ? kind==='date'?`${pad(current.getDate())}/${pad(current.getMonth()+1)}/${current.getFullYear()}`:`${pad(current.getHours())}:${pad(current.getMinutes())}` : kind==='date'?'Chọn ngày':'Chọn giờ'}</Text></View>
      </Pressable>)}
    </View>}
    {Platform.OS==='android'?nativePicker:null}
    {Platform.OS==='ios' && mode && !disabled ? <Modal visible transparent animationType="slide" onRequestClose={()=>setMode(null)}>
      <View style={[styles.overlay,{paddingTop:insets.top+16,paddingLeft:insets.left,paddingRight:insets.right}]}>
        <View accessibilityViewIsModal style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,16)}]}>
          <View style={styles.toolbar}>
            <Pressable testID="recording-cancel" accessibilityRole="button" onPress={()=>setMode(null)} style={styles.action}><Text style={styles.label}>Hủy</Text></Pressable>
            <Text style={styles.title}>{mode==='date'?'Ngày ghi hình':'Giờ ghi hình'}</Text>
            <Pressable testID="recording-confirm" accessibilityRole="button" onPress={()=>confirm()} style={styles.action}><Text style={styles.done}>Xong</Text></Pressable>
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.picker}>{nativePicker}</ScrollView>
        </View>
      </View>
    </Modal>:null}
  </View>;
}
const styles=StyleSheet.create({
  container:{gap:8},fields:{flexDirection:'row',flexWrap:'wrap',gap:12},
  field:{flex:1,minWidth:130,minHeight:76,flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.surfaceAlt},
  copy:{flex:1,gap:4},label:{...typography.bodyMd,color:colors.secondary},value:{...typography.titleMd,color:colors.neutral},disabled:{opacity:0.5},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'},
  sheet:{maxHeight:'100%',backgroundColor:colors.surface,borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden'},
  toolbar:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.border,padding:8},
  action:{minHeight:48,minWidth:60,alignItems:'center',justifyContent:'center'},title:{...typography.titleMd,color:colors.neutral,flex:1,textAlign:'center'},
  done:{...typography.titleMd,color:colors.secondary},picker:{padding:12},
});
