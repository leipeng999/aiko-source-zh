import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const { LlmClient, messageText } = await import(pathToFileURL('/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs').href)
const MODEL='gpt-6-luna'
const dir='/home/ubuntu/source_inputs'
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.json'))
const llm=new LlmClient({timeoutMs:300000,maxRetries:3})
function collect(node, out=[], loc='') {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) { node.forEach((v,i)=>collect(v,out,loc+'['+i+']')); return out }
  for (const [k,v] of Object.entries(node)) {
    const p=loc?loc+'.'+k:k
    if (typeof v==='string' && ['name','subtitle','description','localizedDescription'].includes(k) && v.trim() && !/^https?:\/\//.test(v)) out.push({id:p,text:v})
    else if (v && typeof v==='object') collect(v,out,p)
  }
  return out
}
async function translateBatch(items) {
  const schema={type:'object',strict:true,additionalProperties:false,properties:{items:{type:'array',items:{type:'object',strict:true,additionalProperties:false,properties:{id:{type:'string'},text:{type:'string'}},required:['id','text']}}},required:['items']}
  const r=await llm.chat({model:MODEL,messages:[
    {role:'system',content:'你是专业的简体中文本地化译者。将 iOS AltStore/SideStore 软件源的用户可见文本翻译成自然、准确、简洁的简体中文。保留品牌名、应用名、技术名词、Markdown、版本号、URL、代码、占位符和换行结构；已经是中文的原样返回。只返回与输入 id 一一对应的 JSON，不要解释。'},
    {role:'user',content:JSON.stringify({targetLanguage:'zh-CN',items},null,2)}
  ],max_completion_tokens:30000,reasoning:{effort:'none'},response_format:{type:'json_schema',json_schema:{name:'translations',schema}}})
  const t=messageText(r)
  return JSON.parse(t).items
}
function setAt(root, loc, value){ const parts=loc.replace(/\[(\d+)\]/g,'.$1').split('.'); let o=root; for(let i=0;i<parts.length-1;i++) o=o[parts[i]]; o[parts.at(-1)]=value }
for (const file of files) {
  const input=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))
  const output=structuredClone(input)
  const items=collect(input)
  const map=new Map()
  for(let i=0;i<items.length;i+=10){
    const batch=items.slice(i,i+10)
    process.stdout.write(`${file}: ${i+1}-${i+batch.length}/${items.length}\n`)
    const result=await translateBatch(batch)
    for(const x of result) map.set(x.id,x.text)
  }
  for(const x of items) if(map.has(x.id)) setAt(output,x.id,map.get(x.id))
  // Keep source provenance explicit while translating only display metadata.
  output.name = map.get('name') || output.name
  if(output.subtitle) output.subtitle = map.get('subtitle') || output.subtitle
  if(output.description) output.description = map.get('description') || output.description
  const out=path.join('/home/ubuntu',file.replace('.json','_zh.json'))
  fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n')
  console.log(`WROTE ${out}; translated ${items.length} display strings`)
}
