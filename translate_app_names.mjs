import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const { LlmClient, messageText } = await import(pathToFileURL('/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs').href)
const MODEL='gpt-6-luna'
const dir='/home/ubuntu/source_inputs'
const files=['aiko.json','altgallery.json','ripestore.json','wuxu.json','kevin.json']
const llm=new LlmClient({timeoutMs:300000,maxRetries:3})
const schema={type:'object',strict:true,additionalProperties:false,properties:{items:{type:'array',items:{type:'object',strict:true,additionalProperties:false,properties:{id:{type:'string'},name:{type:'string'}},required:['id','name']}}},required:['items']}
async function batch(items){
 const r=await llm.chat({model:MODEL,messages:[
  {role:'system',content:'你是 iOS 软件商店的简体中文本地化专家。把每个应用名称改成适合中文目录显示的名称。要求：每个输出 name 必须包含至少一个中文字符；品牌名、项目名和缩写可以保留，并在后面用全角括号补充准确的中文功能译名，例如“PPSSPP（PSP 模拟器）”“SideStore（侧载工具）”“Aidoku（漫画阅读器）”。如果原名本身是中文则保持。不要加入夸张宣传，不要改动版本、夜间版、Patched、SE 等限定信息。只输出 JSON。'},
  {role:'user',content:JSON.stringify({items},null,2)}
 ],max_completion_tokens:12000,reasoning:{effort:'none'},response_format:{type:'json_schema',json_schema:{name:'names',schema}}})
 return JSON.parse(messageText(r)).items
}
function setName(d,index,name){d.apps[index].name=name}
for(const file of files){
 const input=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))
 const out=JSON.parse(fs.readFileSync('/home/ubuntu/'+file.replace('.json','_zh.json'),'utf8'))
 const items=input.apps.map((a,i)=>({id:String(i),name:a.name}))
 const result=[]
 for(let i=0;i<items.length;i+=20){
  const part=items.slice(i,i+20); console.log(`${file}: names ${i+1}-${i+part.length}/${items.length}`); result.push(...await batch(part))
 }
 for(const x of result) setName(out,Number(x.id),x.name)
 const bad=out.apps.filter(a=>!/[^\x00-\x7F]/.test(a.name))
 if(bad.length) throw new Error(`${file}: names without Chinese: ${bad.map(x=>x.name).join(', ')}`)
 const dest='/home/ubuntu/'+file.replace('.json','_zh.json')
 fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n')
 console.log(`WROTE ${dest}; names=${out.apps.length}`)
}
