import json
src=json.load(open('/home/ubuntu/alan_zh.json'))
keys_top=['name','identifier','subtitle','website','iconURL']
top={k:src[k] for k in keys_top if k in src}
top.setdefault('identifier','com.fastsign.alans-gigantic-repo-zh')
top['description']=src.get('description') or src.get('subtitle') or 'Alan 的超大型软件源（中文镜像）'
apps=[]
for a in src.get('apps',[]):
    b={}
    for k in ['name','bundleIdentifier','developerName','subtitle','localizedDescription','iconURL','tintColor','screenshots']:
        if k in a: b[k]=a[k]
    # Keep legacy top-level fields required by older SideStore versions.
    versions=[]
    for v in a.get('versions',[]):
        versions.append({k:v[k] for k in ['version','date','localizedDescription','downloadURL','size','minOSVersion','sha256'] if k in v})
    if versions: b['versions']=versions
    for k in ['version','versionDate','downloadURL','size','minOSVersion','sha256']:
        if k in a: b[k]=a[k]
    apps.append(b)
top['apps']=apps
open('/home/ubuntu/alan_sidestore_zh.json','w').write(json.dumps(top,ensure_ascii=False,indent=2)+'\n')
print('apps',len(apps),'bytes',__import__('os').path.getsize('/home/ubuntu/alan_sidestore_zh.json'))
