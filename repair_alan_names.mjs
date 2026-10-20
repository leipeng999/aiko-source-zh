import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const { LlmClient, messageText } = await import(pathToFileURL('/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs').href)
const p='/home/ubuntu/alan_checkpoint.json', out='/home/ubuntu/alan_zh.json'
const d=JSON.parse(fs.readFileSync(p,'utf8'));const bad=d.apps.map((a,i)=>({i,name:a.name,subtitle:a.subtitle||'',description:a.localizedDescription||''})).filter(x=>!/[\u4e00-\u9fff]/.test(x.name))
const llm=new LlmClient({timeoutMs:300000,maxRetries:3})
const schema={type:'object',strict:true,additionalProperties:false,properties:{items:{type:'array',items:{type:'object',strict:true,additionalProperties:false,properties:{i:{type:'integer'},name:{type:'string'}},required:['i','name']}}},required:['items']}
async function run(items){const r=await llm.chat({model:'gpt-6-luna',messages:[{role:'system',content:'你是简体中文软件商店本地化译者。为每个 iOS 应用名称补充准确的中文功能译名。品牌名、版本号、Patched 等保留，并在全角括号中加入中文含义。每个 name 必须含至少一个中文字符。只输出 JSON。'},{role:'user',content:JSON.stringify({items},null,2)}],max_completion_tokens:10000,reasoning:{effort:'none'},response_format:{type:'json_schema',json_schema:{name:'names',schema}}});return JSON.parse(messageText(r)).items}
console.log('repair names',bad.length);for(let i=0;i<bad.length;i+=10){const r=await run(bad.slice(i,i+10));for(const x of r)d.apps[x.i].name=x.name}
const remaining=d.apps.filter(a=>!/[\u4e00-\u9fff]/.test(a.name||''));if(remaining.length)throw new Error(remaining.map(a=>a.name).join(', '))
fs.writeFileSync(out,JSON.stringify(d,null,2)+'\n');console.log('WROTE',out,'apps',d.apps.length)
