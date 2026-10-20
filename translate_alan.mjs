import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const { LlmClient, messageText } = await import(pathToFileURL('/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs').href)
const MODEL='gpt-6-luna', input='/home/ubuntu/alan_source.json', output='/home/ubuntu/alan_zh.json', checkpoint='/home/ubuntu/alan_checkpoint.json'
const source=JSON.parse(fs.readFileSync(input,'utf8'))
const out=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):structuredClone(source)
const llm=new LlmClient({timeoutMs:300000,maxRetries:3})
const schema={type:'object',strict:true,additionalProperties:false,properties:{items:{type:'array',items:{type:'object',strict:true,additionalProperties:false,properties:{id:{type:'string'},text:{type:'string'}},required:['id','text']}}},required:['items']}
function collect(node,out=[],loc=''){
 if(!node||typeof node!=='object')return out
 if(Array.isArray(node)){node.forEach((v,i)=>collect(v,out,loc+'['+i+']'));return out}
 for(const [k,v] of Object.entries(node)){const p=loc?loc+'.'+k:k
  if(typeof v==='string'&&['name','subtitle','description','localizedDescription'].includes(k)&&v.trim()&&!/^https?:\/\//.test(v))out.push({id:p,key:k,text:v})
  else if(v&&typeof v==='object')collect(v,out,p)}
 return out
}
const items=collect(source)
function setAt(root,loc,value){const parts=loc.replace(/\[(\d+)\]/g,'.$1').split('.');let o=root;for(let i=0;i<parts.length-1;i++)o=o[parts[i]];o[parts.at(-1)]=value}
async function call(batch){
 const r=await llm.chat({model:MODEL,messages:[
  {role:'system',content:'你是专业的简体中文 iOS 软件商店本地化译者。将用户可见文本翻译成自然准确的简体中文。key=name 时必须至少含一个中文字符；品牌名、项目名和缩写保留，并用全角括号补充中文功能译名。保留夜间版、预发布、Patched、Lite、SE 等限定信息。其他文本保留 Markdown、版本号、URL、代码、占位符和换行结构。已经是中文的原样返回。只输出 JSON。'},
  {role:'user',content:JSON.stringify({items:batch},null,2)}
 ],max_completion_tokens:18000,reasoning:{effort:'none'},response_format:{type:'json_schema',json_schema:{name:'translations',schema}}})
 const parsed=JSON.parse(messageText(r)).items
 if(parsed.length!==batch.length)throw new Error(`count ${parsed.length}/${batch.length}`)
 const expected=new Set(batch.map(x=>x.id));for(const x of parsed)if(!expected.has(x.id)||typeof x.text!=='string')throw new Error('bad response')
 return parsed
}
async function translateSafe(batch){
 try{return await call(batch)}catch(e){
  if(batch.length>1){const mid=Math.ceil(batch.length/2);console.error(`split ${batch.length} after ${e.message}`);const a=await translateSafe(batch.slice(0,mid));const b=await translateSafe(batch.slice(mid));return a.concat(b)}
  console.error(`fallback original for ${batch[0].id}: ${e.message}`);return [{id:batch[0].id,text:batch[0].text}]
 }}
function makeBatches(){const a=[];let cur=[],chars=0;for(const x of items){const n=x.text.length;if(cur.length&&(chars+n>4500||cur.length>=6)){a.push(cur);cur=[];chars=0}cur.push(x);chars+=n}if(cur.length)a.push(cur);return a}
const batches=makeBatches();console.log(`Alan: ${items.length} strings in ${batches.length} batches`)
let next=0,done=0
async function worker(){while(true){const i=next++;if(i>=batches.length)return;const result=await translateSafe(batches[i]);for(const x of result)setAt(out,x.id,x.text);done++;if(done%5===0){fs.writeFileSync(checkpoint,JSON.stringify(out));console.log(`completed ${done}/${batches.length}`)}}}
await Promise.all(Array.from({length:3},()=>worker()))
fs.writeFileSync(checkpoint,JSON.stringify(out))
const bad=out.apps.filter(a=>!/[\u4e00-\u9fff]/.test(a.name||''));if(bad.length)throw new Error(`names without Chinese: ${bad.slice(0,20).map(a=>a.name).join(', ')}`)
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(`WROTE ${output}; apps=${out.apps.length}; strings=${items.length}`)
