import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { openLocalDroneFiles, type DroneLocalFile } from '../../api/droneLocalFiles';
import { useAuthStore } from '../../store/auth';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';

/** Local bytes only. Selecting a file never dispatches an upload. */
export function OperatorLocalFiles({taskId,selectedVideoKey,selectedTelemetryKey,onSelect}:{taskId:string;selectedVideoKey?:string|null;selectedTelemetryKey?:string|null;onSelect:(file:DroneLocalFile)=>void}) {
  const runtime=useRef<Awaited<ReturnType<typeof openLocalDroneFiles>>|null>(null);
  const active=useRef(false),lock=useRef(false);
  const [files,setFiles]=useState<Awaited<ReturnType<NonNullable<typeof runtime.current>['list']>>>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState<string|null>(null);
  useEffect(()=>{
    active.current=true;let opened:typeof runtime.current=null;
    const unsubscribe=useAuthStore.subscribe(()=>{active.current=false;runtime.current=null;setFiles([]);});
    void(async()=>{
      try{opened=await openLocalDroneFiles(taskId);if(!active.current){opened.close();return;}runtime.current=opened;
        const rows=await opened.list();if(active.current)setFiles(rows);
      }catch{if(active.current)setMessage('Chưa đọc được tệp đã lưu. Dữ liệu vẫn được giữ trên máy.');}
      finally{if(active.current)setLoading(false);}
    })();
    return()=>{active.current=false;runtime.current=null;unsubscribe();opened?.close();};
  },[taskId]);
  const select=async(key?:string,kind:'VIDEO'|'TELEMETRY'='VIDEO')=>{
    const store=runtime.current;if(!active.current||!store||lock.current)return;
    lock.current=true;setBusy(true);setMessage(null);
    try{
      let file:DroneLocalFile;
      if(key)file=await store.rehash(key);
      else{
        // Match the online picker: preserve() immediately copies the granted URI
        // into our durable private directory before returning a selectable file.
        const result=await DocumentPicker.getDocumentAsync({type:kind==='VIDEO'?'video/mp4':'*/*',copyToCacheDirectory:false,multiple:false});
        if(!active.current||result.canceled)return;
        file=await store.preserve(kind,result.assets[0]);
      }
      if(!active.current)return;
      const rows=await store.list();if(!active.current)return;
      setFiles(rows);onSelect(file);
    }catch(error){if(active.current){
      const code=error instanceof Error?error.message:'';
      setMessage(['drone_file_cached_task_missing','drone_file_cached_task_invalid','drone_file_task_invalid'].includes(code)
        ? 'Chưa có đủ thông tin nhiệm vụ trên máy. Kết nối lại và mở nhiệm vụ trước khi thêm tệp. Tệp gốc vẫn được giữ.'
        : code==='drone_file_size_invalid'?'Không đọc được kích thước tệp hoặc tệp vượt giới hạn. Chọn lại tệp MP4/SRT trên thiết bị.'
        : code==='drone_file_invalid'?'Chọn tệp video có đuôi .mp4 hoặc phụ đề có đuôi .srt.'
        : code==='drone_file_copy_incomplete'?'Bản sao tệp chưa đầy đủ. Tệp gốc vẫn được giữ, hãy thử chọn lại.'
        : 'Chưa chọn được tệp. Kiểm tra tệp MP4/SRT còn đọc được trên máy rồi thử lại.');
    }}
    finally{lock.current=false;if(active.current)setBusy(false);}
  };
  return <View style={styles.container}>
    {loading||busy?<ActivityIndicator color={colors.primary}/>:null}
    {!loading&&!files.length?<Text style={styles.support}>Chưa có tệp. Thêm video MP4 hoặc tệp SRT từ thiết bị.</Text>:null}
    {files.map(file=>{
      const ready=['LOCAL_READY','LOCAL_UNHASHED'].includes(file.availability);
      const selected=file.key===(file.kind==='VIDEO'?selectedVideoKey:selectedTelemetryKey);
      const kind=file.kind==='VIDEO'?'Video':'SRT';
      const size=Number.isFinite(file.size)?(file.size>=1024**2?`${(file.size/1024**2).toFixed(1)} MB`:`${file.size} B`):'';
      return <Pressable key={file.key} testID={`local-file-${file.key}`} accessibilityRole="button"
        accessibilityLabel={`Dùng ${kind.toLowerCase()}: ${file.name}`}
        accessibilityState={{selected,disabled:busy||!ready}}
        disabled={busy||!ready} onPress={()=>void select(file.key)}
        style={({pressed})=>[styles.file,selected&&styles.selected,pressed&&styles.pressed]}>
        <View style={styles.fileIcon}><MaterialIcons name={file.kind==='VIDEO'?'videocam':'description'} size={24} color={colors.secondary}/></View>
        <View style={styles.fileText}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">{file.name}</Text>
          <Text style={styles.support}>{!ready?'Tệp không còn đọc được · Chọn lại':`${kind}${size?` · ${size}`:''}${selected?' · Đã chọn':''}`}</Text>
        </View>
        <MaterialIcons name={selected?'check-circle':'radio-button-unchecked'} size={22} color={selected?colors.success:colors.secondary}/>
      </Pressable>;
    })}
    <View style={styles.actions}>
      <Button style={styles.action} variant="secondary" title="Thêm video MP4" disabled={loading||busy||!runtime.current} onPress={()=>void select(undefined,'VIDEO')}/>
      <Button style={styles.action} variant="secondary" title="Thêm tệp SRT" disabled={loading||busy||!runtime.current} onPress={()=>void select(undefined,'TELEMETRY')}/>
    </View>
    {message?<Text accessibilityLiveRegion="polite" style={styles.support}>{message}</Text>:null}
  </View>;
}

const styles=StyleSheet.create({
  container:{gap:spacing.sm},
  file:{flexDirection:'row',alignItems:'center',gap:spacing.sm,minHeight:72,padding:spacing.sm,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.surface},
  selected:{borderColor:colors.success},
  pressed:{backgroundColor:colors.surfaceAlt},
  fileIcon:{width:36,height:40,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceAlt,borderRadius:8},
  fileText:{flex:1,minWidth:0,gap:spacing.xs},
  name:{...typography.labelLg,color:colors.neutral},
  support:{...typography.caption,color:colors.secondary},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginTop:spacing.xs},
  action:{flexGrow:1,flexBasis:140},
});
