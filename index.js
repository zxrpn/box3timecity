console.clear()

const boss = world.querySelector('#末影人-1')
    boss.collides=true, // 开启碰撞
    boss.gravity=false, // 开启重力
    boss.friction=0, // 关闭摩擦力
    boss.maxHp=650,
    boss.hp=650,
    boss.enableDamage=true,
    boss.onEntityContact(({other})=>{
        if(other.isPlayer){
            other.hurt(90,{damageType:'被末影人杀死'})
        }
    })
    boss.onDie(({attacker})=>{
        if(attacker.isPlayer) {
        boss.destroy()
        world.say(`有人干掉了末影人！`);
        attacker.player.directMessage('恭喜获得末影珍珠')
        attacker.bag.push('末影珍珠')
        }
    boss.onVoxelContact(()=>{//当公鸡碰到地形方块
        boss.velocity.y = 0.5 + Math.random()
        boss.velocity.x = (Math.random()-0.5)
        boss.velocity.z = (Math.random()-0.5)
    })
})
boss.onVoxelContact(()=>{//当公鸡碰到地形方块
        boss.velocity.y = 0.5 + Math.random()
        boss.velocity.x = (Math.random()-0.5)
        boss.velocity.z = (Math.random()-0.5)
})



const MeshScale = [0.625,0.625,0.625]
function spawn() {//把生成蜘蛛精英的代码封装成函数
    const spider = world.createEntity({
        mesh:'mesh/蜘蛛精英.vb',
        meshScale:MeshScale,
        collides:true, // 开启碰撞
        gravity:true, // 开启重力
        friction:0, // 关闭摩擦力
        maxHp:60,
        hp:60,
        position:[
            61,//x
            10,//y
            32,//z
        ],
    });
    spider.onEntityContact(({other})=>{
        if(other.isPlayer){//蜘蛛精英撞到玩家
            other.hurt(80,{damageType:'被蜘蛛喵死'})//对玩家造成伤害
        }
    })
    spider.onDie(()=>{
        spider.destroy()//蜘蛛精英喵掉，实体消失！谢谢@1232RvE反馈
        a=Math.random()*1000
        if (a==1) return
        world.say(`恭喜你获得蜘蛛腿。`);
        spawn()

    })
}
for (let i = 0; i < 30; i++) {//开局生成一堆蜘蛛精英
    spawn()
}
const Quat = new Box3Quaternion(0,0,0,1)// box引擎默认的旋转朝向
let allPlayers = []//所有玩家
let allZombies = []//所有蜘蛛精英
world.onTick(async ({tick}) => {//每秒16个tick
    if(tick%16===0){//每16个tick运行一次, 而不是每个tick都运行,节省性能
        allPlayers = world.querySelectorAll('player')
        allZombies = world.querySelectorAll('.蜘蛛精英')
    }
    allZombies.forEach(async (spider) => {
        let zomPos = spider.position
        if(tick%11===0){//每11个tick运行一次, 而不是每个tick都运行,节省性能
            let target = allPlayers.sort((a,b)=>{//蜘蛛精英寻找距离最近的玩家
                return a.position.distance(zomPos)-b.position.distance(zomPos)
            })[0]
            if(target){//地图如果还有玩家
                spider.target = target//让蜘蛛精英记住要追杀的玩家
            }
        }
        if(spider.target && !e.target.destroyed){//如果要追杀的玩家还没有离开地图
            var direction = spider.target.position.sub(zomPos); //蜘蛛精英往玩家的方向矢量
            var dist = direction.mag() //矢量的长度
            var speed = 0.2+Math.random()*0.3 //速度0.2~0.5随机
            spider.velocity.x = direction.x*speed/dist
            spider.velocity.z = direction.z*speed/dist
            // 让蜘蛛精英面向自己的前进方向
            var orientation = Quat.rotateY(Math.atan2(spider.velocity.z, spider.velocity.y,spider.velocity.x))
            spider.meshOrientation.copy(orientation)
        }
    })
})
world.onPlayerJoin(({entity})=>{
    entity.enableDamage = true;
    entity.onDie(async()=>{
        world.say(`${entity.player.name} 被袭击身亡, 3秒后复活`)
        await sleep(3000)
        // 空中随机位置复活
        entity.position.x =88
        entity.position.z =37
        entity.position.y = 179
        await sleep(100) // 防止引擎延迟造成复活后受到死前的伤害
        entity.hp = entity.maxHp //恢复满血
    })
})
world.onClick(({entity,attacker:entity})=>{
    entity.hurt(1000 ,{ attacker:entity }) //被点中的实体会掉血
})


async function js(){
    while(true){
        await sleep(5000)
        spawn(73,11,72)
    }
}js()
async function showPlayers() {
    console.clear() // 清空控制台
    const playerList = await db.sql`SELECT * FROM player`
    for (const p of playerList) {
        console.log(JSON.stringify(p))
    }
}
async function savePlayer(entity) {//定义保存玩家状态的函数
    if (entity.player.userKey) {//拥有userKey的玩家, 则玩家不是游客, 可以保存
        await db.sql`
            --尝试向player表插入一条记录, 向各个字段写入玩家身上对应的属性值
            INSERT INTO sqlplayer (
                username,
                coin,
                pexp,
                bag,
                bag_v,
                jn,
                userKey
            )
            VALUES(
                ${entity.player.name},
                ${entity.coin},
                ${entity.exp},
                ${JSON.stringify(entity.bag)},
                ${JSON.stringify(entity.bag_v)},
                ${JSON.stringify(entity.jn)},
                ${entity.player.userKey}
            )
            ON CONFLICT(userKey)--如果玩家记录已经存在, 则不需要插入, 而是更新各个字段的值
            DO UPDATE SET

            userName=excluded.userName,
            coin=excluded.coin,
            pexp=excluded.pexp,
            bag=excluded.bag,
            bag_v=excluded.bag_v,
            jn=excluded.jn
        `
    }
}
async function loadPlayer(entity) {
    const data = (await (db.sql`SELECT * FROM sqlplayer WHERE userKey=${entity.player.userKey} limit 1`))[0]
    if (data) { //如果存在这个玩家的存档
        entity.coin = data.coin //恢复金钱
        entity.pexp = data.pexp //恢复废品
        entity.bag = JSON.parse(data.bag) //恢复道具列表, 这里的JSON.parse用于把字符串变回数组
        entity.bag_v = JSON.parse(data.bag_v)
        entity.jn = JSON.parse(data.jn)
    }
    
}
async function createTable() {
    await db.sql`
        CREATE TABLE IF NOT EXISTS sqlplayer (
            username TEXT DEFAULT '',
            coin INTEGER DEFAULT 0,--金钱, INTEGER类型用于存储整数
            pexp INTEGER DEFAULT 0,--废品, INTEGER类型用于存储整数
            bag TEXT DEFAULT '',--道具列表, TEXT类型用于存储字符串
            bag_v TEXT DEFAULT '',
            jn TEXT DEFAULT '',
            userKey TEXT PRIMARY KEY UNIQUE DEFAULT ''--玩家的唯一识别码, TEXT类型用于存储字符串
        )
    `
    showPlayers() //每次运行代码都能查看数据库里所有记录
}
createTable()
world.onPlayerJoin(async({entity})=>{
    entity.coin=0
    entity.bag=[]
    entity.bag_v=[]
    entity.jn=[]
    entity.exp=10
    entity.hand=0
    loadPlayer(entity)
    entity.onClick(({entity,clicker}) => {
        entity.hurt(1000,{attacker:clicker})
    })
})
world.onPlayerLeave(({entity:e})=>{
    savePlayer(e)
})
function give(e,thing,number){
    x=false
    for(i in e.bag){
        if(e.bag[i]==thing){x=true
            e.bag_v[i]+=number
            return
            }
        }
    if(!x){e.bag.push(thing)
    e.bag_v.push(number)}
}
function take(e,thing,number){
        for(i in e.bag){
            if(e.bag[i]==thing){
                if(Array.isArray(e.bag_v[i])){
                    if(e.bag_v[i][0]<=number){
                        e.bag.splice(i,1)
                        e.bag_v.splice(i,1)
                    }else{e.bag_v[i][0]-=number}
                }else{if(e.bag_v[i]<=number){
                        e.bag.splice(i,1)
                        e.bag_v.splice(i,1)
                    }else{e.bag_v[i]-=number}}
            }
        return}

}
world.onPress(async({entity,button})=>{
    if(button==="action1"){
        const choice = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: "背包",
            options:["主手",'背包'],
            content:`
            剩余血量${entity.hp}
            剩余金币${entity.coin}
            总经验${entity.exp}
            等级${(entity.exp-=(entity.exp%100))/100}
            距离升级还有${entity.exp%100}经验`
        })
        
        if(!choice || choice === null){return}
    switch(choice.index){
        case 0:
            list=[]
            for(i in e.bag){
               if(Array.isArray(e.bag_v[i])){
                   list.push(`${e.bag[i]}(剩余耐久:${e.bag_v[i][0]})`)
               }else{list.push(`${e.bag[i]}*${e.bag_v[i]}`)}
            }
            choice1=await e.player.dialog({
            type: Box3DialogType.SELECT,
            title: "背包",
            options:list
            })
            if(!choice1 || choice1 === null){return}
            if(choice1["value"]!=""){
                e.hand=choice1["index"]
            }
        break;
        case 1:
        const dialog1 = await entity.player.dialog({
            type:"select",
            content:'选择你需要的道具',
            options:entity.bag,
        })
        default:
    }
    }
})
const TEST_PLAYER = ['图图喵CS舰队司令','Threadripper',"23332808"]
world.onPlayerJoin(({ entity }) => {
    if (!TEST_PLAYER.includes(entity.player.name)) return; // 如果玩家名称不在列表里，则跳过后续脚本。
    world.say(`地图作者${entity.player.name} 出现了！`);
})
world.addCollisionFilter('player', 'player');

world.onPlayerJoin(({ entity }) => {
    if (!TEST_PLAYER.includes(entity.player.name)) return;
    entity.player.canFly = true;
});
var admin = ['图图喵CS舰队司令','Threadripper','黑暗中的曙光','冰雪蜜桃','ACL.番茄炒蛋（退岛一年）','庄轩睿','zxr3425']
world.onChat(async ({ entity, message }) => {
    if (entity.isPlayer) {
        if (admin.includes(entity.player.name)) {
            if (message == '权限') { entity.player.directMessage('亲爱的创作人员你好！特殊功能包含大，小，日出、天亮、消失、傍晚、天黑、变大、变小、还原大小、封神、飞行、解除飞行、加速、隐身、现身、隐藏名字、显示名字、幽灵、解除幽灵、发光、还原发光、反光、还原反光、恢复血量、变红色、变蓝色、变绿色、变紫色、变黄色、变浅蓝色、还原颜色、瞬移、关闭瞬移、加血、清屏、传送(出)管理室、全部还原、关闭粒子特效、开启粒子特效、禁言(例如:禁言+禁言者名字)、解除禁言(例如:解除禁言+被禁言者名字)、制裁(例如:制裁+被制裁者名字)、解除制裁(例如:解除制裁+被解除制裁者名字)') }
            if (message == '变大') { entity.player.scale += 0.2; world.say(entity.player.name + '变大了') }
            if (message == '变小') { entity.player.scale += -0.2; world.say(entity.player.name + '变小了') }
            if (message == '大') { entity.player.scale += 1; world.say(entity.player.name + '变大了') }
            if (message == '小') { entity.player.scale += -1; world.say(entity.player.name + '变小了') }
            if (message == '还原大小') { entity.player.scale = 1; world.say(entity.player.name + '还原了大小') }
            if (message == '飞行') { entity.player.canFly = true; world.say(entity.player.name + '开启了飞行模式') }
            if (message == '解除飞行') { entity.player.canFly = false; world.say(entity.player.name + '关闭了飞行模式') }
            if (message == '加速') {
                entity.player.walkSpeed += 1000
                entity.player.runSpeed += 1000
                entity.player.flySpeed += 1000
                world.say(entity.player.name + '加速了')
            }
            if (message === '日出') { world.sunPhase = 0; entity.player.directMessage('已设置到日出') }
            if (message === '天亮') { world.sunPhase = 0.25; entity.player.directMessage('已设置到天亮') }
            if (message === '傍晚') { world.sunPhase = 0.5; entity.player.directMessage('已设置到傍晚') }
            if (message === '天黑') { world.sunPhase = 0.75; entity.player.directMessage('已设置到天黑') }
            if (message === '隐形') { entity.player.invisible = true; entity.player.directMessage('你已经打开隐形模式') }
            if (message === '解除隐形') { entity.player.invisible = false; entity.player.directMessage('你已经关闭隐形模式') }
            if (message == '恢复血量') { entity.hp = entity.maxHp; world.say(entity.player.name + '恢复了全部血量') }
            if (message == '无敌') { entity.hp = 1e6; entity.maxHp = 1e5; world.say(entity.player.name + '无敌了') }
            if (message == '隐身') { entity.player.invisible = true; world.say(entity.player.name + '隐身了') }
            if (message == '现身') { entity.player.invisible = false; world.say(entity.player.name + '现身了') }
            if (message == '隐藏名字') { entity.player.showName = false; world.say(entity.player.name + '隐藏了名字') }
            if (message == '显示名字') { entity.player.showName = true; world.say(entity.player.name + '显示了名字') }
            if (message == '幽灵') { entity.player.spectator = true; world.say(entity.player.name + '开启了幽灵模式') }
            if (message == '解除幽灵') { entity.player.spectator = false; world.say(entity.player.name + '关闭了幽灵模式') }
            if (message == '发光') { entity.player.emissive = 1; world.say(entity.player.name + '开启了发光效果') }
            if (message == '还原发光') { entity.player.emissive = 0; world.say(entity.player.name + '还原了发光效果') }
            if (message == '反光') { entity.player.shininess = 1; world.say(entity.player.name + '开启了反光效果') }
            if (message == '还原反光') { entity.player.shininess = 0; world.say(entity.player.name + '还原了反光效果') }
            if (message == '变红色') { entity.player.color.set(1, 0, 0); world.say(entity.player.name + '变成了红色') }
            if (message == '变蓝色') { entity.player.color.set(0, 0, 1); world.say(entity.player.name + '变成了蓝色') }
            if (message == '变绿色') { entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了绿色') }
            if (message == '变紫色') { entity.player.color.set(1, 0, 1); world.say(entity.player.name + '变成了紫色') }
            if (message == '变黄色') { entity.player.color.set(1, 1, 0); world.say(entity.player.name + '变成了黄色') }
            if (message == '变浅蓝色') { entity.player.color.set(0, 1, 1); world.say(entity.player.name + '变成了浅蓝色') }
            if (message == '还原颜色') { entity.player.color.set(1, 1, 1); world.say(entity.player.name + '还原了颜色') }
            if (message == '删除宠物') { entity.setPet(); }
            if (message == '消失') {
                entity.player.invisible = true; entity.player.showName = false;
                world.say(entity.player.name + '消失了')
            };
            if (message == '封神') {
                entity.player.invisible = true;
                entity.player.showName = false;
                entity.player.spectator = true;
                entity.atta = 1;
                entity.player.canFly = true;
                entity.player.walkSpeed += 500;
                entity.player.runSpeed += 500;
                entity.player.flySpeed += 500;
                entity.player.jumpPower = 5;
                Object.assign(entity, {
                    particleRate: 500,//粒子数量，可更改，越大粒子越多
                    particleSize: [1, 3, 5, 3, 1],//粒子在每个阶段的大小，可更改
                    particleColor: [//例子在每个阶段的颜色，可更改
                        new Box3RGBColor(6, 0, 0),//第一阶段
                        new Box3RGBColor(5, 0, 0),//第二阶段
                        new Box3RGBColor(5, 0, 0),//第三阶段
                        new Box3RGBColor(8, 6, 0),//第四阶段
                        new Box3RGBColor(9, 0, 0),//第五阶段
                    ],
                    particleLifetime: 0.4,
                    particleVelocitySpread: new Box3Vector3(2, 2, 2),
                });
                world.say(entity.player.name + '封神了!')
            };


            if (message == '还原') {
                entity.player.scale = 1;
                entity.player.canFly = false;
                entity.player.showName = true;
                entity.player.spectator = false;
                entity.player.invisible = false;
                entity.player.emissive = 0;
                entity.player.shininess = 0;
                entity.player.color.set(1, 1, 1);
                Object.assign(entity, { particleRate: 250, });
                world.say(entity.player.name + '全部还原了');
            };
            if (message == '清屏') {
                for (let x = 0; x < 3000; x++) {
                    world.say('')
                }
            }
            if (message.startsWith('过来')) {
                const sendentity = await entity.player.dialog({
                    type: Box3DialogType.SELECT,
                    title: '系统',
                    content: `尊敬的创作者，你想让谁过来？`,
                    options: players,   // 将提供玩家选择的选项放入数组里。
                })

                if (!sendentity || sendentity === null) {
                    return
                }
                if (players_entity[sendentity.index].player.name == entity.player.name) {
                    entity.player.directMessage('无法让自己过来，请重新尝试！')
                }
                if (players_entity[sendentity.index].player.name == '飞跃的流星') {
                    entity.player.directMessage('无法让作者过来，请重新尝试！')
                }
                switch (sendentity) {
                    default:
                        if (players_entity[sendentity.index].player.name == '') return;
                        if (players_entity[sendentity.index].player.name == entity.player.name) return;
                        world.say(`管理员让${players_entity[sendentity.index].player.name}过来了`);
                        players_entity[sendentity.index].player.spawnPoint.copy(entity.position);
                        players_entity[sendentity.index].player.forceRespawn()
                }
            }
            if (message.startsWith('解除禁言')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            entity.player.directMessage(`已解除禁言  ${x.player.name}  玩家`)
                            x.player.directMessage('希望你改过自新，谨遵地图秩序！')
                            world.say('有人被管理员解除禁言了！')
                            x.player.muted = false
                        }
                    })
                }
            }
            if (message.startsWith('我要去')) {
                const sendentity = await entity.player.dialog({
                    type: Box3DialogType.SELECT,
                    title: '系统',
                    content: `尊敬的创作者，你想去谁那里？`,
                    options: players,   // 将提供玩家选择的选项放入数组里。
                })

                if (!sendentity || sendentity === null) {
                    return
                }
                if (players_entity[sendentity.index].player.name == '飞跃的流星') {
                    entity.player.directMessage('无法去作者那里，请重新尝试！')
                }
                if (players_entity[sendentity.index].player.name == entity.player.name) {
                    entity.player.directMessage('无法去自己那里，请重新尝试！')
                }
                switch (sendentity) {
                    default:
                        if (players_entity[sendentity.index].player.name == '飞跃的流星') return;
                        if (players_entity[sendentity.index].player.name == entity.player.name) return;
                        world.say(`管理员去到${players_entity[sendentity.index].player.name}那里了`);
                        entity.player.spawnPoint.copy(players_entity[sendentity.index].position);
                        entity.player.forceRespawn()
                }
            } function randint(min, max) {
                return Math.round(Math.random() * (max - 1) + min);
            }
            if (message == '变彩虹') {
                entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了彩虹')
                world.onTick(({ tick }) => {
                    var r = randint(1, 7);
                    if (r == 1) {
                        entity.player.color = new Box3RGBColor(1, 0, 0);
                    }
                    else if (r == 2) {
                        entity.player.color = new Box3RGBColor(0, 1, 0);
                    }
                    else if (r == 3) {
                        entity.player.color = new Box3RGBColor(0, 0, 1);
                    }
                    else if (r == 4) {
                        entity.player.color = new Box3RGBColor(1, 1, 0);
                    }
                    else if (r == 5) {
                        entity.player.color = new Box3RGBColor(1, 0, 1);
                    }
                    else if (r == 6) {
                        entity.player.color = new Box3RGBColor(0, 1, 1);
                    }
                    else if (r == 7) {
                        entity.player.color = new Box3RGBColor(1, 1, 1);
                    }
                })
            }
            if (message == '关闭粒子特效') { Object.assign(entity, { particleRate: 0, }); world.say(entity.player.name + '关闭了粒子特效'); }
            if (message == '开启粒子特效') { Object.assign(entity, { particleRate: 250, }); world.say(entity.player.name + '开启了粒子特效'); }
            if (message.startsWith('禁言')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.directMessage('你被管理员禁言了，请遵守地图秩序！')
                            world.say('有人犯了错，被管理员禁言了！')
                            x.player.muted = true
                        }
                    })
                }
            }
            if (message.startsWith('踢了')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.kick()
                        }
                    })
                }
            }
            if (message.startsWith('制裁')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法制裁自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.directMessage('你惹怒了管理员，你被管理员制裁了！')
                            world.say('有人惹怒了管理员，被管理员制裁了！')
                            {
                                x.player.runSpeed = -0.5;
                                x.player.runAcceleration = -0.5;
                                x.player.walkSpeed = -0.5;
                                x.player.walkAcceleration = -0.5;
                            }
                        }
                    })
                }
            }
            if (message.startsWith('解除制裁')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除制裁自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('管理员气消了，放你一马吧！')
                            world.say('有人被管理员解除制裁了！')
                            {
                                x.player.runSpeed = 0.4;
                                x.player.runAcceleration = 0.35;
                                x.player.walkSpeed = 0.22;
                                x.player.walkAcceleration = 0.19;
                            }
                        }
                    })
                }
            }
            if (message.startsWith('击杀')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法击杀自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('击杀')
                            world.say('有人被管理员击杀了')
                            x.player.entity.hp -= 999999999999999999999
                        }
                    })
                }
            }
            if (message.startsWith('解除禁言')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('希望你改过自新，谨遵地图秩序！')
                            world.say('有人被管理员解除禁言了！')
                            x.player.muted = false
                        }
                    })
                }
            }
        }
    }
})

world.onPlayerJoin(async ({ entity }) => {
    entity.player.onPress(async ({ button, entity }) => {
        if (entity.player.name == '') {
            if (button == Box3ButtonType.CROUCH) {
                const fayan = await entity.player.dialog({
                    type: Box3DialogType.INPUT,
                    title: '系统',
                    content: '输入你要说的话吧！',
                    placeholder: '你要说……'
                })
                if (!fayan || fayan == null) {
                    entity.player.directMessage('你取消了发言')
                }
                if (fayan) {
                    world.say(`作者说： ${fayan}`)
                }
            }
        }
    })
})
world.onPress(async ({ entity, button }) => {
    if (button != Box3ButtonType.ACTION1||entity.player.walkState!='crouch'|| !entity.isPlayer)return
    if (entity.k) {
        entity.player.cameraEntity = entity;
        entity.player.enableJump = true;
        entity.player.enableDoubleJump = true;
        entity.player.walkSpeed = 0.22;
        entity.player.runSpeed = 0.4;
        entity.player.flySpeed = 2;
        entity.player.swimSpeed = 0.4;
        entity.player.crouchSpeed = 0.1;
        entity.player.runAcceleration = 0.35;
        entity.player.crouchAcceleration = 0.09;
        entity.player.flyAcceleration = 2;
        entity.player.swimAcceleration = 0.1;
        entity.player.walkAcceleration = 0.19;
        entity.player.directMessage(`��️已恢复视角`);
        entity.k = 0;
        return;
    }
    let re = await entity.player.dialog({
        type: Box3DialogType.SELECT,
        title: `${entity.level}`,
        options: ['刷新', '观看他人', '切换视角', '管理员专属', '取消'],
    });
    if (re == null || !re || re == '取消') return;
    if (re.index == 0) {
        entity.position.set(233, 10, 23)//刷新位置
        entity.jumpcounttime = 4;
        entity.player.directMessage('��已经刷新');
    }
    if (re.index == 1) {
        let ns = [];
        world.querySelectorAll('player').forEach((e) => {
            if (entity.player.name != e.player.name) ns.push(e.player.name);
        });
        let r2 = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: '控制',
            contect: '你要观看谁？',
            options: ns,
        });
        if (!r2.value || r2.value == null) return;
        world.querySelectorAll('player').forEach((e) => {
            if (e.player.name != r2.value) return;
            entity.player.cameraEntity = e;
            entity.player.enableJump = false;
            entity.player.enableDoubleJump = false;
            entity.player.walkSpeed = 0;
            entity.player.runSpeed = 0;
            entity.player.flySpeed = 0;
            entity.player.swimSpeed = 0;
            entity.player.crouchSpeed = 0;
            entity.player.runAcceleration = 0;
            entity.player.crouchAcceleration = 0;
            entity.player.flyAcceleration = 0;
            entity.player.swimAcceleration = 0;
            entity.player.walkAcceleration = 0;
            entity.player.directMessage(`��️观看了${e.player.name}`);
            e.player.directMessage(`��️你已被${entity.player.name}观看`);
            entity.k = 1;
        });
    }

    if (re.value == '切换视角') {
        const sj = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            lookEye: entity.player.position,
            content: '切换哪个视角？',//（提示：2D视角1层不适合哟）（2D视角代码原作者：编码喵）
            options: ['第三人称', '第一人称'],
        })
        if (!sj || sj === null) {

            entity.player.directMessage('取消交互');
            return;
        }
        if (sj.value == '第三人称') {
            entity.player.cameraMode = 'follow';
            entity.player.swapInputDirection = false;
            entity.player.cameraPosition = new Box3Vector3(0, 0, 0);
            entity.player.freezedForwardDirection = new Box3Vector3
            //entity.player.cameraFreezedAxis=Box3CameraFreezedAxis.X;
            entity.player.reverseInputDirection = Box3InputDirection.NONE
            entity.player.cameraFreezedAxis = Box3CameraFreezedAxis.NONE

        }
        if (sj.value == '第一人称') {
            entity.player.cameraMode = 'fps';
            entity.player.swapInputDirection = false;


        }
        if (sj.value == '2D视角') {
            entity.player.cameraMode = Box3CameraMode.RELATIVE;
            entity.player.cameraPosition = new Box3Vector3(-10, 0, entity.position.z - 155);
            entity.player.swapInputDirection = true;
            entity.player.reverseInputDirection = Box3InputDirection.HORIZONTAL;
            entity.player.cameraFreezedAxis = Box3CameraFreezedAxis.X;
            entity.player.freezedForwardDirection = new Box3Vector3(0, 0, 1);
            entity.player.cameraTarget = new Box3Vector3(entity.position.x, entity.position.y, entity.position.z)

        }

    }


    if (re.value == '管理员专属') {
        if (hzzzz.includes(entity.player.name)) {

            const selection = await entity.player.dialog({
                type: Box3DialogType.SELECT,
                content: `亲爱的合作者${entity.player.name}你好呀！
                    不要乱用权限哦！`,
                title: '管理员专属',
                options: ['飞行', '穿墙', '加速', 'world.say', '禁言', '控制台', '踢人', '操控玩家','反光','变色','粒子特效', '重启服务器','监狱','制裁']
            })
            if (selection) {
                if (selection.value == '操控玩家') {
                    var players = world.querySelectorAll('player')
                    var names = []
                    for (const i in players) {
                        names.push(players[i].player.name)
                    }
                    const ckwj = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        lookEye: entity.player.position,
                        content: '请选择玩家',
                        options: names,
                    })
                    const result15 = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        title: `操作玩家${ckwj.value}`,
                        titleTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        titleBackgroundColor: new Box3RGBAColor(0, 0, 0, 0.98),
                        content: `请问你要对${ckwj.value}输入什么代码？（前面加x哦，不是entity）`,
                        confirmText: '确定', // 确定按钮上面的文字。按下确定按钮后，提交回答。
                        placeholder: '输入代码哟', // 输入框背景上的提示文字。
                        contentTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        contentBackgroundColor: new Box3RGBAColor(0, 0, 0, 0.98),
                        lookEye: entity.position.add(entity.player.facingDirection.scale(5)),
                        lookTarget: ckwj.value,
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result15 || result15 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }

                    world.say(`${entity.player.name}对${ckwj.value}启用代码：${result15}`)

                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == ckwj.value) {
                            eval(result15)


                        }
                    })





                }

                if (selection.value == '重启服务器') {
                    const cqfwq = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                    
                        titleTextColor: new Box3RGBAColor(0, 0, 0, 0),
                        titleBackgroundColor: new Box3RGBAColor(1, 1, 1, 0.98),
                        content: `${entity.player.name}，确定重启服务器？？？`,
                        options: ['是', '否'],
                        contentTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        contentBackgroundColor: new Box3RGBAColor(1, 0, 0, 1),

                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!cqfwq || cqfwq === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (cqfwq.value === '是') {
                        world.say(`管理员${entity.player.name}强制重启了服务器`)
                        for (; ;) { }

                    }
                }
                if (selection.value == '反光') {
                    const fg = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        lookEye: entity.player.position,
                        content: '反光',
                        options: ['开', '关'],
                    })
                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!fg || fg === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fg.value == '开') {
                        entity.player.shininess = 2;
                        world.say(entity.player.name + '开启了反光效果')

                    }
                    if (fg.value == '关') {
                        entity.player.shininess = 0;
                        world.say(entity.player.name + '关闭了反光效果')

                    }
                }
                if (selection.value == '变色') {
                    const colors = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `请选择变色的颜色`,
                        title: '管理员专属',
                        options: ['蓝', '白', '紫', '绿', '红', '黑', '黄', '浅蓝'],
                    })
                    if (!colors || colors === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (colors.value == '白') {
                        entity.player.color.set(1, 1, 1);
                    }
                    if (colors.value == '蓝') {
                        entity.player.color.set(0, 0, 1);
                    }
                    if (colors.value == '紫') {
                        entity.player.color.set(1, 0, 1);
                    }
                    if (colors.value == '红') {
                        entity.player.color.set(1, 0, 0);
                    }
                    if (colors.value == '黑') {
                        entity.player.color.set(0, 0, 0);
                    }
                    if (colors.value == '绿') {
                        entity.player.color.set(0, 1, 0);
                    }
                    if (colors.value == '黄') {
                        entity.player.color.set(1, 1, 0);
                    }
                    if (colors.value == '浅蓝') {
                        entity.player.color.set(0, 1, 1);
                    }
                }
                if (selection.value == '粒子特效') {
                    const lztx = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `粒子特效`,
                        title: '开或关粒子特效',
                        options: ['开', '关'],
                    })
                    if (!lztx || lztx === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (lztx.value == '开') {
                        world.say(`管理员${entity.player.name}开启了粒子特效`)

                        Object.assign(entity, {
                            particleLimit: 300,
                            particleLifetime: 5,
                            particleRate: 300,
                            particleRateSpread: 500, particleSize: [5, 3, 5, 3, 5],
                            particleColor: [
                                new Box3RGBColor(10, 0, 0),
                                new Box3RGBColor(0, 10, 0),
                                new Box3RGBColor(0, 0, 10),
                            ], // 设置颜色(紫色)
                            particleVelocity: new Box3Vector3(0, 0, 0),
                        });
                    }
                    if (lztx.value == '关') {
                        world.say(`管理员${entity.player.name}关闭了粒子特效`)
                        Object.assign(entity, {
                            particleLimit: 0,
                            particleLifetime: 0,
                            particleRate: 0,
                            particleRateSpread: 0, particleSize: [5, 3, 5, 3, 5],
                            particleColor: [
                                new Box3RGBColor(10, 0, 0),
                                new Box3RGBColor(0, 10, 0),
                                new Box3RGBColor(0, 0, 10),
                            ], // 设置颜色(紫色)
                            particleVelocity: new Box3Vector3(0, 0, 0),
                        });
                    }
                }
                if (selection.value == '飞行') {
                    const fx = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `飞行`,
                        title: '开或关飞行',
                        options: ['开', '关'],
                    })
                    if (!fx || fx === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fx.value == '开') {
                        entity.player.canFly = true
                        world.say(`${entity.player.name}打开了飞行`)
                    }
                    if (fx.value == '关') {
                        entity.player.canFly = false
                        world.say(`${entity.player.name}关闭了飞行`)
                    }
                } else if (selection.value == '发光') {
                    const fg = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `发光`,
                        title: '开或关发光',
                        options: ['开', '关'],
                    })
                    if (!fg || fg === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fg.value == '开') {
                        entity.player.emissive = 1;
                        world.say(`${entity.player.name}使用了发光`)
                    }
                    if (fg.value == '关') {
                        entity.player.emissive = 0;

                        world.say(`${entity.player.name}取消了发光`)
                    }


                } else if (selection.value == '加速') {
                    const js = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `加速`,
                        title: '开或关加速',
                        options: ['开', '关'],
                    })
                    if (!js || js === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (js.value == '开') {
                        entity.player.walkSpeed = 8
                        entity.player.runSpeed = 8
                        world.say(`${entity.player.name}加速了！`)

                    }
                    if (js.value == '关') {
                        entity.player.walkSpeed = 1
                        entity.player.runSpeed = 1
                        world.say(`${entity.player.name}取消了加速`)
                    }

                } else if (selection.value == '隐身') {
                    const ys = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `隐身`,
                        title: '开或关隐身',
                        options: ['开', '关'],
                    })
                    if (!ys || ys === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (ys.value == '开') {
                        entity.player.showName = false
                        entity.player.invisible = true
                        world.say(`${entity.player.name}开启了隐身！`)

                    }
                    if (ys.value == '关') {
                        entity.player.showName = true
                        entity.player.invisible = false
                        world.say(`${entity.player.name}关闭了隐身！`)
                    }




                } else if (selection.value == '穿墙') {
                    const cq = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `穿墙`,
                        title: '开或关穿墙',
                        options: ['开', '关'],
                    })
                    if (!cq || cq === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (cq.value == '开') {
                        entity.player.spectator = true
                        world.say(`${entity.player.name}开启了穿墙！`)

                    }
                    if (cq.value == '关') {
                        entity.player.spectator = false
                        world.say(`${entity.player.name}关闭了穿墙！`)
                    }

                } else if (selection.value == '禁言') {
                    const result6 = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `${entity.player.name}，请选择禁言方式`,
                        options: ['禁言', '解除禁言'],   // 将提供玩家选择的选项放入数组里。
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result6 || result6 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }

                    // 判断玩家选了什么选项。
                    switch (result6.index) {
                        case 0:
                            var players = world.querySelectorAll('player')
                            var names = []
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result5 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要禁言谁？',
                                options: names,
                            })
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result5.value) {
                                    x.player.directMessage('你已被管理员禁言，请等待管理员解除')
                                    world.say(`${x.player.name}被管理员${entity.player.name}禁言了`)
                                    x.player.muted = true
                                }
                            })

                            break;
                        case 1:
                            var players = world.querySelectorAll('player')
                            var names = []
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result7 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要解除禁言谁？',
                                options: names,
                            })
                            if (!result7 || result7 === null) {
                                entity.player.directMessage('取消交互');
                                return;
                            }
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result7.value) {
                                    x.player.directMessage('你已被管理员解除禁言了')
                                    world.say(`${x.player.name}被管理员${entity.player.name}解除禁言了`)
                                    x.player.muted = false
                                }
                            })
                            break;
                        default:
                        // 注意，使用 switch 分支的时候，不要漏了后面的 break; 
                    }

                } else if (selection.value == '监狱') {
                    const jy = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `监狱`,
                        title: '请选择方式',
                        options: ['送监狱', '离开监狱', '前往监狱'],
                    })
                    if (!jy || jy === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (jy.value == '送监狱') {
                        var players = world.querySelectorAll('player')
                        var names = []
                        for (const i in players) {
                            names.push(players[i].player.name)
                        }
                        const result10 = await entity.player.dialog({
                            type: Box3DialogType.SELECT,
                            content: `${entity.player.name}，请选择玩家`,
                            options: names,   // 将提供玩家选择的选项放入数组里。
                        });

                        // 如果玩家点击了屏幕其他区域，取消了对话框。
                        if (!result10 || result10 === null) {
                            entity.player.directMessage('取消交互');
                            return;
                        }
                        world.querySelectorAll('player').forEach((x) => {
                            if (x.player.name == result10.value) {

                                x.player.directMessage('你已被管理员关在监狱里了！')
                                world.say(`${x.player.name}被管理员${entity.player.name}关在监狱里了！`)
                                x.position.set(62, 10, 176)//位置自己改
                            }
                        })
                    }
                    if (jy.value == '离开监狱') {
                        var players = world.querySelectorAll('player')
                        var names = []
                        for (const i in players) {
                            names.push(players[i].player.name)
                        }
                        const result11 = await entity.player.dialog({
                            type: Box3DialogType.SELECT,
                            content: `${entity.player.name}，请选择玩家`,
                            options: names,   // 将提供玩家选择的选项放入数组里。
                        });

                        // 如果玩家点击了屏幕其他区域，取消了对话框。
                        if (!result11 || result11 === null) {
                            entity.player.directMessage('取消交互');
                            return;
                        }
                        world.querySelectorAll('player').forEach((x) => {
                            if (x.player.name == result11.value) {

                                x.player.directMessage('你已被管理员送到起点！')
                                world.say(`${x.player.name}被管理员${entity.player.name}送到了起点！`)
                                x.position.set(125, 3, 5)//位置自己改

                            }
                        })
                    }
                    if (jy.value == '前往监狱') {

                        entity.position.set(62, 10, 176)//位置自己改
                    }
                } else if (selection.value == '踢人') {
                    const result9 = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `${entity.player.name}，请选择禁踢人方式`,
                        options: ['踢指定玩家', '踢所有玩家'],   // 将提供玩家选择的选项放入数组里。
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result9 || result9 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    switch (result9.index) {
                        case 0:
                            var players = world.querySelectorAll('player')
                            var names = ['飞跃的流星','一起来玩吧']
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result8 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要踢谁？',
                                options: names,
                            })
                            if (!result8 || result8 === null) {
                                entity.player.directMessage('取消交互');
                                return;
                            }
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result8.value) {

                                    x.player.directMessage('你已被管理员踢出去了！')
                                    world.say(`${x.player.name}被管理员${entity.player.name}踢出去了！`)
                                    x.player.kick()

                                }
                            })
                            break;
                        case 1:
                            world.say(`管理员${entity.player.name}踢了全部玩家！`)

                            for (const ee of world.querySelectorAll('player')) {//遍历所有实体
                                if (ee.player.name = entity.player.name) {

                                    ee.player.kick()
                                }
                            }
                            break;

                        default:
                    }


                } else if (selection.value == 'world.say') {
                    const result = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        lookEye: entity.player.position,
                        content: '你要对世界公布什么？',
                        placeholder: '请输入...',
                        confirmText: '发送',
                    })
                    world.say(result);
                } else if (selection.value == '控制台') {
                    entity.player.directMessage('输入中...')
                    const result4 = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        title: '控制台',
                        content: `${entity.player.name}请输入代码`,
                        confirmText: '运行',
                        placeholder: '请在输入代码',
                    });
                    if (!result4 || result4 === null) {
                        return;
                    }
                    try {
                        await entity.player.dialog({
                            type: Box3DialogType.TEXT,
                            title: '输出',
                            content: eval(result4),
                        });
                        world.say(`${entity.player.name}在控制台启用了${result4}`)

                    } catch (err) {
                        await entity.player.dialog({
                            type: Box3DialogType.TEXT,
                            title: '报错',
                            content: err
                        });
                    }
                }
            }
        } else {
            entity.player.directMessage('你不是管理员！')
        }
    }
});
var hzzzz = ['图图喵CS舰队司令','Threadripper','23332808','庄轩睿','zxr3425']

// 私聊
world.onPlayerJoin(({ entity }) => {
    entity.coin = 5
    entity.player.message1 = "";
    entity.player.interactTimes = 0;
    entity.enableInteract = true;
    entity.interactRadius = 2;
    entity.interactHint = "与 " + entity.player.name + "（跑酷萌新） 互动";
    entity.onInteract(async ({ entity, targetEntity }) => {
        const result = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: targetEntity.player.name,
            content: `和   ${targetEntity.player.name}  互动`,
            options: ['和TA私聊', '攻击','退出互动']    
        })
        if (!result || result === null) {
            entity.player.directMessage('已为你取消互动！');
            return;
        }
        if (result.index == 0) {
            const dialog = await entity.player.dialog({
                type: Box3DialogType.INPUT,
                title: "向 " + targetEntity.player.name + " 发送私聊信息",
                content: `${entity.player.name}，请输入私聊内容`,
                confirmText: '发送', 
                placeholder: '请输入私聊内容', 
            });
            targetEntity.player.message1 = dialog;
            targetEntity.player.directMessage('收到 ' + entity.player.name + ' 向你发送的私聊信息，正在为你打开查看……')
            await sleep(2000);
            targetEntity.player.directMessage('正在查收 ' + entity.player.name + " 发送的私聊信息")
            entity.player.directMessage('对方已收到聊天信息')
            if (dialog) {
                const dialog = targetEntity.player.dialog({
                    type: Box3DialogType.TEXT,
                    title: entity.player.name,    
                    content: targetEntity.player.message1, 
                });
            }
        } else if(result.index == 1){
            if (entity.hp == 0) return;        
            targetEntity.player.directMessage(`您受到${entity.player.name}的10点攻击！`)
            targetEntity.enableDamage = true
            targetEntity.hurt(10)
        }
    
    })
})





//只要这个常量名字不一样就行

/*const npc = world.querySelector('#市长');
npc.enableInteract = true; // 允许进行互动
npc.interactRadius = 16;   // 实体的互动范围
npc.interactHint = npc.id; // 互动提示框显示实体的名称
npc.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
npc.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});*/
/*
const shop_1 = world.querySelector('#市长')
shop_1.enableInteract = true; 
shop_1.interactRadius = 5; 
shop_1.interactHint = '房子商';
shop_1.onInteract(async ({ entity }) => {
const sl_1 = await entity.player.dialog({ 
type: Box3DialogType.SELECT, 
title: shop_1.id,  
content: `你好，${entity.player.name}，你要买啥？`,
options: ['盾（150金币）', '铁剑（650金币）', '石剑（430金币）']
})
*/

const npc = world.querySelector('#木材商人');
npc.enableInteract = true; // 允许进行互动
npc.interactRadius = 16;   // 实体的互动范围
npc.interactHint = npc.id; // 互动提示框显示实体的名称
npc.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
npc.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});


const n = world.querySelector('#木材商人');
n.enableInteract = true; // 允许进行互动
n.interactRadius = 16;   // 实体的互动范围
n.interactHint = npc.id; // 互动提示框显示实体的名称
n.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
n.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});




world.addCollisionFilter('player','.子弹')    
//首先先导入一个子弹的模型，为0，0，0，1的默认角度
    //子弹创建代码：
    console.clear()
    async function shoot(entity = new Box3Entity) {
        var speed = 5;//越大越快
        const e = world.createEntity({
            mesh: 'mesh/子弹.vb',//其实未必要子弹，弓箭啥一样的
            meshScale: new Box3Vector3(0.0625, 0.0625, 0.0625),//自己调整
            gravity: false, //通过代码控制，而不是使用自带的
            collides: true,//也是使用代码控制，防止打到墙壁会反弹，使用代码还可以有一点穿透效果
            position: entity.position,
        })
        e.speed = speed
        e.own = entity
        e.addTag('子弹')
        var angle = Math.atan2(entity.player.facingDirection.z, entity.player.facingDirection.x)
        //敲重点：
        e.velocity.set(
            Math.cos(angle) * Math.cos(-entity.player.cameraPitch) * speed,
            Math.sin(-entity.player.cameraPitch) * speed,
            Math.sin(angle) * Math.cos(-entity.player.cameraPitch) * speed,
        )
        e.meshOrientation = new Box3Quaternion(0, 0, 0, 1).rotateX(
            Math.atan2(e.velocity.y, Math.sqrt(e.velocity.x ** 2 + e.velocity.z ** 2))
        ).rotateY(angle)
        e.onVoxelContact(()=>{
        e.destroy()
    })        
	await sleep(10000);
        //10秒后消失，防止太多飞出边界
        e.destroy()
    
    }

    world.onPress(async ({ entity, button, raycast }) => {
        if (button == Box3ButtonType.ACTION0) {
            while (entity.player.action0Button) {//连射
                shoot(entity)
                await sleep(1)//连射间隔，自己定
            }
        }
    });

    (async function () {//主循环
        while (1) {
            world.querySelectorAll('.子弹').forEach((e) => {
                var angle = Math.atan2(e.velocity.z, e.velocity.x)
                var up = Math.atan2(e.velocity.y, Math.sqrt(e.velocity.x ** 2 + e.velocity.z ** 2))
                e.meshOrientation = new Box3Quaternion(0, 0, 0, 1).rotateX(
                    up
                ).rotateY(
                    angle
                )
                e.velocity.y -= 0.05//重力下垂
                var hitBox = new Box3Bounds3(e.position.sub(e.bounds), e.position.add(e.bounds));
                var hitEntities = world.querySelectorAll('*').filter(a => hitBox.intersects(new Box3Bounds3(a.position.sub(a.bounds), a.position.add(a.bounds))))
                for (let entity of hitEntities) {
                    //自己写！
                }
            })//不要乱删除！！！删了没有用！出错的不是这里！删了就是错中错！连大小括号都没有了！
            await sleep(100)      
        }
    })











//下面是我编写的
const MeshScale = [0.0625,0.0625,0.0625]
function spawn() {
    const e = world.createEntity({
        mesh:'mesh/僵尸.vb',
        meshScale:MeshScale,
        collides:true, 
        gravity:true, 
        friction:0, 
        maxHp:20,
        hp:20,
        position:[
            64+(Math.random()-0.5) * 60,
            24 + Math.random() * 50,
            64+(Math.random()-0.5) * 60,
        ],
    });
    e.addTag('僵尸');
    e.enableDamage = true;
    e.onVoxelContact(({x,y,z,voxel})=>{
        e.velocity.y = 0.3+Math.random()*0.7
    })
    e.onEntityContact(({other})=>{
        if(other.isPlayer){
            other.hurt(40)
        }
    })
    e.onDie(()=>{
        e.destroy()
    })
}
for (let i = 0; i < 30; i++) {
    spawn()
}
const Quat = new Box3Quaternion(0,0,0,1)
let allPlayers = []
let allZombies = []
world.onTick(async ({tick}) => {
    if(tick%16===0){
        allPlayers = world.querySelectorAll('player')
        allZombies = world.querySelectorAll('.僵尸')
    }
    allZombies.forEach(async (e) => {
        let zomPos = e.position
        if(tick%11===0){
            let target = allPlayers.sort((a,b)=/}
                return a.position.distance(zomPos)-b.position.distance(zomPos)
            })[0]
            if(target){
                e.target = target
            }
        }
        if(e.target && !e.target.destroyed){
            var direction = e.target.position.sub(zomPos); 
            var dist = direction.mag() 
            var speed = 0.2+Math.random()*0.3 
            e.velocity.x = direction.x*speed/dist
            e.velocity.z = direction.z*speed/dist
            
            var orientation = Quat.rotateY(Math.atan2(e.velocity.z, e.velocity.x))
            e.meshOrientation.copy(orientation)
        }
    })
})
world.onPlayerJoin(({entity})=>{
    entity.enableDamage = true;
    entity.onDie(async()=>{
        world.say(`${entity.player.name} 被袭击身亡, 3秒后复活`)
        await sleep(3000)
        
        entity.position.x = Math.random()*127
        entity.position.z = Math.random()*127
        entity.position.y = 100
        await sleep(100) 
        entity.hp = entity.maxHp 
    })
})
world.onClick(({entity})=>{
    entity.hurt(10) 
})console.clear()

const boss = world.querySelector('#末影人-1')
    boss.collides=true, // 开启碰撞
    boss.gravity=false, // 开启重力
    boss.friction=0, // 关闭摩擦力
    boss.maxHp=650,
    boss.hp=650,
    boss.enableDamage=true,
    boss.onEntityContact(({other})=>{
        if(other.isPlayer){
            other.hurt(90,{damageType:'被末影人杀死'})
        }
    })
    boss.onDie(({attacker})=>{
        if(attacker.isPlayer) {
        boss.destroy()
        world.say(`有人干掉了末影人！`);
        attacker.player.directMessage('恭喜获得末影珍珠')
        attacker.bag.push('末影珍珠')
        }
    boss.onVoxelContact(()=>{//当公鸡碰到地形方块
        boss.velocity.y = 0.5 + Math.random()
        boss.velocity.x = (Math.random()-0.5)
        boss.velocity.z = (Math.random()-0.5)
    })
})
boss.onVoxelContact(()=>{//当公鸡碰到地形方块
        boss.velocity.y = 0.5 + Math.random()
        boss.velocity.x = (Math.random()-0.5)
        boss.velocity.z = (Math.random()-0.5)
})



const MeshScale = [0.625,0.625,0.625]
function spawn() {//把生成蜘蛛精英的代码封装成函数
    const spider = world.createEntity({
        mesh:'mesh/蜘蛛精英.vb',
        meshScale:MeshScale,
        collides:true, // 开启碰撞
        gravity:true, // 开启重力
        friction:0, // 关闭摩擦力
        maxHp:60,
        hp:60,
        position:[
            61,//x
            10,//y
            32,//z
        ],
    });
    spider.onEntityContact(({other})=>{
        if(other.isPlayer){//蜘蛛精英撞到玩家
            other.hurt(80,{damageType:'被蜘蛛喵死'})//对玩家造成伤害
        }
    })
    spider.onDie(()=>{
        spider.destroy()//蜘蛛精英喵掉，实体消失！谢谢@1232RvE反馈
        a=Math.random()*1000
        if (a==1) return
        world.say(`恭喜你获得蜘蛛腿。`);
        spawn()

    })
}
for (let i = 0; i < 30; i++) {//开局生成一堆蜘蛛精英
    spawn()
}
const Quat = new Box3Quaternion(0,0,0,1)// box引擎默认的旋转朝向
let allPlayers = []//所有玩家
let allZombies = []//所有蜘蛛精英
world.onTick(async ({tick}) => {//每秒16个tick
    if(tick%16===0){//每16个tick运行一次, 而不是每个tick都运行,节省性能
        allPlayers = world.querySelectorAll('player')
        allZombies = world.querySelectorAll('.蜘蛛精英')
    }
    allZombies.forEach(async (spider) => {
        let zomPos = spider.position
        if(tick%11===0){//每11个tick运行一次, 而不是每个tick都运行,节省性能
            let target = allPlayers.sort((a,b)=>{//蜘蛛精英寻找距离最近的玩家
                return a.position.distance(zomPos)-b.position.distance(zomPos)
            })[0]
            if(target){//地图如果还有玩家
                spider.target = target//让蜘蛛精英记住要追杀的玩家
            }
        }
        if(spider.target && !e.target.destroyed){//如果要追杀的玩家还没有离开地图
            var direction = spider.target.position.sub(zomPos); //蜘蛛精英往玩家的方向矢量
            var dist = direction.mag() //矢量的长度
            var speed = 0.2+Math.random()*0.3 //速度0.2~0.5随机
            spider.velocity.x = direction.x*speed/dist
            spider.velocity.z = direction.z*speed/dist
            // 让蜘蛛精英面向自己的前进方向
            var orientation = Quat.rotateY(Math.atan2(spider.velocity.z, spider.velocity.y,spider.velocity.x))
            spider.meshOrientation.copy(orientation)
        }
    })
})
world.onPlayerJoin(({entity})=>{
    entity.enableDamage = true;
    entity.onDie(async()=>{
        world.say(`${entity.player.name} 被袭击身亡, 3秒后复活`)
        await sleep(3000)
        // 空中随机位置复活
        entity.position.x =88
        entity.position.z =37
        entity.position.y = 179
        await sleep(100) // 防止引擎延迟造成复活后受到死前的伤害
        entity.hp = entity.maxHp //恢复满血
    })
})
world.onClick(({entity,attacker:entity})=>{
    entity.hurt(1000 ,{ attacker:entity }) //被点中的实体会掉血
})


async function js(){
    while(true){
        await sleep(5000)
        spawn(73,11,72)
    }
}js()
async function showPlayers() {
    console.clear() // 清空控制台
    const playerList = await db.sql`SELECT * FROM player`
    for (const p of playerList) {
        console.log(JSON.stringify(p))
    }
}
async function savePlayer(entity) {//定义保存玩家状态的函数
    if (entity.player.userKey) {//拥有userKey的玩家, 则玩家不是游客, 可以保存
        await db.sql`
            --尝试向player表插入一条记录, 向各个字段写入玩家身上对应的属性值
            INSERT INTO sqlplayer (
                username,
                coin,
                pexp,
                bag,
                bag_v,
                jn,
                userKey
            )
            VALUES(
                ${entity.player.name},
                ${entity.coin},
                ${entity.exp},
                ${JSON.stringify(entity.bag)},
                ${JSON.stringify(entity.bag_v)},
                ${JSON.stringify(entity.jn)},
                ${entity.player.userKey}
            )
            ON CONFLICT(userKey)--如果玩家记录已经存在, 则不需要插入, 而是更新各个字段的值
            DO UPDATE SET

            userName=excluded.userName,
            coin=excluded.coin,
            pexp=excluded.pexp,
            bag=excluded.bag,
            bag_v=excluded.bag_v,
            jn=excluded.jn
        `
    }
}
async function loadPlayer(entity) {
    const data = (await (db.sql`SELECT * FROM sqlplayer WHERE userKey=${entity.player.userKey} limit 1`))[0]
    if (data) { //如果存在这个玩家的存档
        entity.coin = data.coin //恢复金钱
        entity.pexp = data.pexp //恢复废品
        entity.bag = JSON.parse(data.bag) //恢复道具列表, 这里的JSON.parse用于把字符串变回数组
        entity.bag_v = JSON.parse(data.bag_v)
        entity.jn = JSON.parse(data.jn)
    }
    
}
async function createTable() {
    await db.sql`
        CREATE TABLE IF NOT EXISTS sqlplayer (
            username TEXT DEFAULT '',
            coin INTEGER DEFAULT 0,--金钱, INTEGER类型用于存储整数
            pexp INTEGER DEFAULT 0,--废品, INTEGER类型用于存储整数
            bag TEXT DEFAULT '',--道具列表, TEXT类型用于存储字符串
            bag_v TEXT DEFAULT '',
            jn TEXT DEFAULT '',
            userKey TEXT PRIMARY KEY UNIQUE DEFAULT ''--玩家的唯一识别码, TEXT类型用于存储字符串
        )
    `
    showPlayers() //每次运行代码都能查看数据库里所有记录
}
createTable()
world.onPlayerJoin(async({entity})=>{
    entity.coin=0
    entity.bag=[]
    entity.bag_v=[]
    entity.jn=[]
    entity.exp=10
    entity.hand=0
    loadPlayer(entity)
    entity.onClick(({entity,clicker}) => {
        entity.hurt(1000,{attacker:clicker})
    })
})
world.onPlayerLeave(({entity:e})=>{
    savePlayer(e)
})
function give(e,thing,number){
    x=false
    for(i in e.bag){
        if(e.bag[i]==thing){x=true
            e.bag_v[i]+=number
            return
            }
        }
    if(!x){e.bag.push(thing)
    e.bag_v.push(number)}
}
function take(e,thing,number){
        for(i in e.bag){
            if(e.bag[i]==thing){
                if(Array.isArray(e.bag_v[i])){
                    if(e.bag_v[i][0]<=number){
                        e.bag.splice(i,1)
                        e.bag_v.splice(i,1)
                    }else{e.bag_v[i][0]-=number}
                }else{if(e.bag_v[i]<=number){
                        e.bag.splice(i,1)
                        e.bag_v.splice(i,1)
                    }else{e.bag_v[i]-=number}}
            }
        return}

}
world.onPress(async({entity,button})=>{
    if(button==="action1"){
        const choice = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: "背包",
            options:["主手",'背包'],
            content:`
            剩余血量${entity.hp}
            剩余金币${entity.coin}
            总经验${entity.exp}
            等级${(entity.exp-=(entity.exp%100))/100}
            距离升级还有${entity.exp%100}经验`
        })
        
        if(!choice || choice === null){return}
    switch(choice.index){
        case 0:
            list=[]
            for(i in e.bag){
               if(Array.isArray(e.bag_v[i])){
                   list.push(`${e.bag[i]}(剩余耐久:${e.bag_v[i][0]})`)
               }else{list.push(`${e.bag[i]}*${e.bag_v[i]}`)}
            }
            choice1=await e.player.dialog({
            type: Box3DialogType.SELECT,
            title: "背包",
            options:list
            })
            if(!choice1 || choice1 === null){return}
            if(choice1["value"]!=""){
                e.hand=choice1["index"]
            }
        break;
        case 1:
        const dialog1 = await entity.player.dialog({
            type:"select",
            content:'选择你需要的道具',
            options:entity.bag,
        })
        default:
    }
    }
})
const TEST_PLAYER = ['图图喵CS舰队司令','Threadripper',"23332808"]
world.onPlayerJoin(({ entity }) => {
    if (!TEST_PLAYER.includes(entity.player.name)) return; // 如果玩家名称不在列表里，则跳过后续脚本。
    world.say(`地图作者${entity.player.name} 出现了！`);
})
world.addCollisionFilter('player', 'player');

world.onPlayerJoin(({ entity }) => {
    if (!TEST_PLAYER.includes(entity.player.name)) return;
    entity.player.canFly = true;
});
var admin = ['图图喵CS舰队司令','Threadripper','黑暗中的曙光','冰雪蜜桃','ACL.番茄炒蛋（退岛一年）','庄轩睿','zxr3425']
world.onChat(async ({ entity, message }) => {
    if (entity.isPlayer) {
        if (admin.includes(entity.player.name)) {
            if (message == '权限') { entity.player.directMessage('亲爱的创作人员你好！特殊功能包含大，小，日出、天亮、消失、傍晚、天黑、变大、变小、还原大小、封神、飞行、解除飞行、加速、隐身、现身、隐藏名字、显示名字、幽灵、解除幽灵、发光、还原发光、反光、还原反光、恢复血量、变红色、变蓝色、变绿色、变紫色、变黄色、变浅蓝色、还原颜色、瞬移、关闭瞬移、加血、清屏、传送(出)管理室、全部还原、关闭粒子特效、开启粒子特效、禁言(例如:禁言+禁言者名字)、解除禁言(例如:解除禁言+被禁言者名字)、制裁(例如:制裁+被制裁者名字)、解除制裁(例如:解除制裁+被解除制裁者名字)') }
            if (message == '变大') { entity.player.scale += 0.2; world.say(entity.player.name + '变大了') }
            if (message == '变小') { entity.player.scale += -0.2; world.say(entity.player.name + '变小了') }
            if (message == '大') { entity.player.scale += 1; world.say(entity.player.name + '变大了') }
            if (message == '小') { entity.player.scale += -1; world.say(entity.player.name + '变小了') }
            if (message == '还原大小') { entity.player.scale = 1; world.say(entity.player.name + '还原了大小') }
            if (message == '飞行') { entity.player.canFly = true; world.say(entity.player.name + '开启了飞行模式') }
            if (message == '解除飞行') { entity.player.canFly = false; world.say(entity.player.name + '关闭了飞行模式') }
            if (message == '加速') {
                entity.player.walkSpeed += 1000
                entity.player.runSpeed += 1000
                entity.player.flySpeed += 1000
                world.say(entity.player.name + '加速了')
            }
            if (message === '日出') { world.sunPhase = 0; entity.player.directMessage('已设置到日出') }
            if (message === '天亮') { world.sunPhase = 0.25; entity.player.directMessage('已设置到天亮') }
            if (message === '傍晚') { world.sunPhase = 0.5; entity.player.directMessage('已设置到傍晚') }
            if (message === '天黑') { world.sunPhase = 0.75; entity.player.directMessage('已设置到天黑') }
            if (message === '隐形') { entity.player.invisible = true; entity.player.directMessage('你已经打开隐形模式') }
            if (message === '解除隐形') { entity.player.invisible = false; entity.player.directMessage('你已经关闭隐形模式') }
            if (message == '恢复血量') { entity.hp = entity.maxHp; world.say(entity.player.name + '恢复了全部血量') }
            if (message == '无敌') { entity.hp = 1e6; entity.maxHp = 1e5; world.say(entity.player.name + '无敌了') }
            if (message == '隐身') { entity.player.invisible = true; world.say(entity.player.name + '隐身了') }
            if (message == '现身') { entity.player.invisible = false; world.say(entity.player.name + '现身了') }
            if (message == '隐藏名字') { entity.player.showName = false; world.say(entity.player.name + '隐藏了名字') }
            if (message == '显示名字') { entity.player.showName = true; world.say(entity.player.name + '显示了名字') }
            if (message == '幽灵') { entity.player.spectator = true; world.say(entity.player.name + '开启了幽灵模式') }
            if (message == '解除幽灵') { entity.player.spectator = false; world.say(entity.player.name + '关闭了幽灵模式') }
            if (message == '发光') { entity.player.emissive = 1; world.say(entity.player.name + '开启了发光效果') }
            if (message == '还原发光') { entity.player.emissive = 0; world.say(entity.player.name + '还原了发光效果') }
            if (message == '反光') { entity.player.shininess = 1; world.say(entity.player.name + '开启了反光效果') }
            if (message == '还原反光') { entity.player.shininess = 0; world.say(entity.player.name + '还原了反光效果') }
            if (message == '变红色') { entity.player.color.set(1, 0, 0); world.say(entity.player.name + '变成了红色') }
            if (message == '变蓝色') { entity.player.color.set(0, 0, 1); world.say(entity.player.name + '变成了蓝色') }
            if (message == '变绿色') { entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了绿色') }
            if (message == '变紫色') { entity.player.color.set(1, 0, 1); world.say(entity.player.name + '变成了紫色') }
            if (message == '变黄色') { entity.player.color.set(1, 1, 0); world.say(entity.player.name + '变成了黄色') }
            if (message == '变浅蓝色') { entity.player.color.set(0, 1, 1); world.say(entity.player.name + '变成了浅蓝色') }
            if (message == '还原颜色') { entity.player.color.set(1, 1, 1); world.say(entity.player.name + '还原了颜色') }
            if (message == '删除宠物') { entity.setPet(); }
            if (message == '消失') {
                entity.player.invisible = true; entity.player.showName = false;
                world.say(entity.player.name + '消失了')
            };
            if (message == '封神') {
                entity.player.invisible = true;
                entity.player.showName = false;
                entity.player.spectator = true;
                entity.atta = 1;
                entity.player.canFly = true;
                entity.player.walkSpeed += 500;
                entity.player.runSpeed += 500;
                entity.player.flySpeed += 500;
                entity.player.jumpPower = 5;
                Object.assign(entity, {
                    particleRate: 500,//粒子数量，可更改，越大粒子越多
                    particleSize: [1, 3, 5, 3, 1],//粒子在每个阶段的大小，可更改
                    particleColor: [//例子在每个阶段的颜色，可更改
                        new Box3RGBColor(6, 0, 0),//第一阶段
                        new Box3RGBColor(5, 0, 0),//第二阶段
                        new Box3RGBColor(5, 0, 0),//第三阶段
                        new Box3RGBColor(8, 6, 0),//第四阶段
                        new Box3RGBColor(9, 0, 0),//第五阶段
                    ],
                    particleLifetime: 0.4,
                    particleVelocitySpread: new Box3Vector3(2, 2, 2),
                });
                world.say(entity.player.name + '封神了!')
            };


            if (message == '还原') {
                entity.player.scale = 1;
                entity.player.canFly = false;
                entity.player.showName = true;
                entity.player.spectator = false;
                entity.player.invisible = false;
                entity.player.emissive = 0;
                entity.player.shininess = 0;
                entity.player.color.set(1, 1, 1);
                Object.assign(entity, { particleRate: 250, });
                world.say(entity.player.name + '全部还原了');
            };
            if (message == '清屏') {
                for (let x = 0; x < 3000; x++) {
                    world.say('')
                }
            }
            if (message.startsWith('过来')) {
                const sendentity = await entity.player.dialog({
                    type: Box3DialogType.SELECT,
                    title: '系统',
                    content: `尊敬的创作者，你想让谁过来？`,
                    options: players,   // 将提供玩家选择的选项放入数组里。
                })

                if (!sendentity || sendentity === null) {
                    return
                }
                if (players_entity[sendentity.index].player.name == entity.player.name) {
                    entity.player.directMessage('无法让自己过来，请重新尝试！')
                }
                if (players_entity[sendentity.index].player.name == '飞跃的流星') {
                    entity.player.directMessage('无法让作者过来，请重新尝试！')
                }
                switch (sendentity) {
                    default:
                        if (players_entity[sendentity.index].player.name == '') return;
                        if (players_entity[sendentity.index].player.name == entity.player.name) return;
                        world.say(`管理员让${players_entity[sendentity.index].player.name}过来了`);
                        players_entity[sendentity.index].player.spawnPoint.copy(entity.position);
                        players_entity[sendentity.index].player.forceRespawn()
                }
            }
            if (message.startsWith('解除禁言')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            entity.player.directMessage(`已解除禁言  ${x.player.name}  玩家`)
                            x.player.directMessage('希望你改过自新，谨遵地图秩序！')
                            world.say('有人被管理员解除禁言了！')
                            x.player.muted = false
                        }
                    })
                }
            }
            if (message.startsWith('我要去')) {
                const sendentity = await entity.player.dialog({
                    type: Box3DialogType.SELECT,
                    title: '系统',
                    content: `尊敬的创作者，你想去谁那里？`,
                    options: players,   // 将提供玩家选择的选项放入数组里。
                })

                if (!sendentity || sendentity === null) {
                    return
                }
                if (players_entity[sendentity.index].player.name == '飞跃的流星') {
                    entity.player.directMessage('无法去作者那里，请重新尝试！')
                }
                if (players_entity[sendentity.index].player.name == entity.player.name) {
                    entity.player.directMessage('无法去自己那里，请重新尝试！')
                }
                switch (sendentity) {
                    default:
                        if (players_entity[sendentity.index].player.name == '飞跃的流星') return;
                        if (players_entity[sendentity.index].player.name == entity.player.name) return;
                        world.say(`管理员去到${players_entity[sendentity.index].player.name}那里了`);
                        entity.player.spawnPoint.copy(players_entity[sendentity.index].position);
                        entity.player.forceRespawn()
                }
            } function randint(min, max) {
                return Math.round(Math.random() * (max - 1) + min);
            }
            if (message == '变彩虹') {
                entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了彩虹')
                world.onTick(({ tick }) => {
                    var r = randint(1, 7);
                    if (r == 1) {
                        entity.player.color = new Box3RGBColor(1, 0, 0);
                    }
                    else if (r == 2) {
                        entity.player.color = new Box3RGBColor(0, 1, 0);
                    }
                    else if (r == 3) {
                        entity.player.color = new Box3RGBColor(0, 0, 1);
                    }
                    else if (r == 4) {
                        entity.player.color = new Box3RGBColor(1, 1, 0);
                    }
                    else if (r == 5) {
                        entity.player.color = new Box3RGBColor(1, 0, 1);
                    }
                    else if (r == 6) {
                        entity.player.color = new Box3RGBColor(0, 1, 1);
                    }
                    else if (r == 7) {
                        entity.player.color = new Box3RGBColor(1, 1, 1);
                    }
                })
            }
            if (message == '关闭粒子特效') { Object.assign(entity, { particleRate: 0, }); world.say(entity.player.name + '关闭了粒子特效'); }
            if (message == '开启粒子特效') { Object.assign(entity, { particleRate: 250, }); world.say(entity.player.name + '开启了粒子特效'); }
            if (message.startsWith('禁言')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.directMessage('你被管理员禁言了，请遵守地图秩序！')
                            world.say('有人犯了错，被管理员禁言了！')
                            x.player.muted = true
                        }
                    })
                }
            }
            if (message.startsWith('踢了')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.kick()
                        }
                    })
                }
            }
            if (message.startsWith('制裁')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法制裁自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.directMessage('你惹怒了管理员，你被管理员制裁了！')
                            world.say('有人惹怒了管理员，被管理员制裁了！')
                            {
                                x.player.runSpeed = -0.5;
                                x.player.runAcceleration = -0.5;
                                x.player.walkSpeed = -0.5;
                                x.player.walkAcceleration = -0.5;
                            }
                        }
                    })
                }
            }
            if (message.startsWith('解除制裁')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除制裁自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('管理员气消了，放你一马吧！')
                            world.say('有人被管理员解除制裁了！')
                            {
                                x.player.runSpeed = 0.4;
                                x.player.runAcceleration = 0.35;
                                x.player.walkSpeed = 0.22;
                                x.player.walkAcceleration = 0.19;
                            }
                        }
                    })
                }
            }
            if (message.startsWith('击杀')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法击杀自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('击杀')
                            world.say('有人被管理员击杀了')
                            x.player.entity.hp -= 999999999999999999999
                        }
                    })
                }
            }
            if (message.startsWith('解除禁言')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('希望你改过自新，谨遵地图秩序！')
                            world.say('有人被管理员解除禁言了！')
                            x.player.muted = false
                        }
                    })
                }
            }
        }
    }
})

world.onPlayerJoin(async ({ entity }) => {
    entity.player.onPress(async ({ button, entity }) => {
        if (entity.player.name == '') {
            if (button == Box3ButtonType.CROUCH) {
                const fayan = await entity.player.dialog({
                    type: Box3DialogType.INPUT,
                    title: '系统',
                    content: '输入你要说的话吧！',
                    placeholder: '你要说……'
                })
                if (!fayan || fayan == null) {
                    entity.player.directMessage('你取消了发言')
                }
                if (fayan) {
                    world.say(`作者说： ${fayan}`)
                }
            }
        }
    })
})
world.onPress(async ({ entity, button }) => {
    if (button != Box3ButtonType.ACTION1||entity.player.walkState!='crouch'|| !entity.isPlayer)return
    if (entity.k) {
        entity.player.cameraEntity = entity;
        entity.player.enableJump = true;
        entity.player.enableDoubleJump = true;
        entity.player.walkSpeed = 0.22;
        entity.player.runSpeed = 0.4;
        entity.player.flySpeed = 2;
        entity.player.swimSpeed = 0.4;
        entity.player.crouchSpeed = 0.1;
        entity.player.runAcceleration = 0.35;
        entity.player.crouchAcceleration = 0.09;
        entity.player.flyAcceleration = 2;
        entity.player.swimAcceleration = 0.1;
        entity.player.walkAcceleration = 0.19;
        entity.player.directMessage(`��️已恢复视角`);
        entity.k = 0;
        return;
    }
    let re = await entity.player.dialog({
        type: Box3DialogType.SELECT,
        title: `${entity.level}`,
        options: ['刷新', '观看他人', '切换视角', '管理员专属', '取消'],
    });
    if (re == null || !re || re == '取消') return;
    if (re.index == 0) {
        entity.position.set(233, 10, 23)//刷新位置
        entity.jumpcounttime = 4;
        entity.player.directMessage('��已经刷新');
    }
    if (re.index == 1) {
        let ns = [];
        world.querySelectorAll('player').forEach((e) => {
            if (entity.player.name != e.player.name) ns.push(e.player.name);
        });
        let r2 = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: '控制',
            contect: '你要观看谁？',
            options: ns,
        });
        if (!r2.value || r2.value == null) return;
        world.querySelectorAll('player').forEach((e) => {
            if (e.player.name != r2.value) return;
            entity.player.cameraEntity = e;
            entity.player.enableJump = false;
            entity.player.enableDoubleJump = false;
            entity.player.walkSpeed = 0;
            entity.player.runSpeed = 0;
            entity.player.flySpeed = 0;
            entity.player.swimSpeed = 0;
            entity.player.crouchSpeed = 0;
            entity.player.runAcceleration = 0;
            entity.player.crouchAcceleration = 0;
            entity.player.flyAcceleration = 0;
            entity.player.swimAcceleration = 0;
            entity.player.walkAcceleration = 0;
            entity.player.directMessage(`��️观看了${e.player.name}`);
            e.player.directMessage(`��️你已被${entity.player.name}观看`);
            entity.k = 1;
        });
    }

    if (re.value == '切换视角') {
        const sj = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            lookEye: entity.player.position,
            content: '切换哪个视角？',//（提示：2D视角1层不适合哟）（2D视角代码原作者：编码喵）
            options: ['第三人称', '第一人称'],
        })
        if (!sj || sj === null) {

            entity.player.directMessage('取消交互');
            return;
        }
        if (sj.value == '第三人称') {
            entity.player.cameraMode = 'follow';
            entity.player.swapInputDirection = false;
            entity.player.cameraPosition = new Box3Vector3(0, 0, 0);
            entity.player.freezedForwardDirection = new Box3Vector3
            //entity.player.cameraFreezedAxis=Box3CameraFreezedAxis.X;
            entity.player.reverseInputDirection = Box3InputDirection.NONE
            entity.player.cameraFreezedAxis = Box3CameraFreezedAxis.NONE

        }
        if (sj.value == '第一人称') {
            entity.player.cameraMode = 'fps';
            entity.player.swapInputDirection = false;


        }
        if (sj.value == '2D视角') {
            entity.player.cameraMode = Box3CameraMode.RELATIVE;
            entity.player.cameraPosition = new Box3Vector3(-10, 0, entity.position.z - 155);
            entity.player.swapInputDirection = true;
            entity.player.reverseInputDirection = Box3InputDirection.HORIZONTAL;
            entity.player.cameraFreezedAxis = Box3CameraFreezedAxis.X;
            entity.player.freezedForwardDirection = new Box3Vector3(0, 0, 1);
            entity.player.cameraTarget = new Box3Vector3(entity.position.x, entity.position.y, entity.position.z)

        }

    }


    if (re.value == '管理员专属') {
        if (hzzzz.includes(entity.player.name)) {

            const selection = await entity.player.dialog({
                type: Box3DialogType.SELECT,
                content: `亲爱的合作者${entity.player.name}你好呀！
                    不要乱用权限哦！`,
                title: '管理员专属',
                options: ['飞行', '穿墙', '加速', 'world.say', '禁言', '控制台', '踢人', '操控玩家','反光','变色','粒子特效', '重启服务器','监狱','制裁']
            })
            if (selection) {
                if (selection.value == '操控玩家') {
                    var players = world.querySelectorAll('player')
                    var names = []
                    for (const i in players) {
                        names.push(players[i].player.name)
                    }
                    const ckwj = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        lookEye: entity.player.position,
                        content: '请选择玩家',
                        options: names,
                    })
                    const result15 = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        title: `操作玩家${ckwj.value}`,
                        titleTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        titleBackgroundColor: new Box3RGBAColor(0, 0, 0, 0.98),
                        content: `请问你要对${ckwj.value}输入什么代码？（前面加x哦，不是entity）`,
                        confirmText: '确定', // 确定按钮上面的文字。按下确定按钮后，提交回答。
                        placeholder: '输入代码哟', // 输入框背景上的提示文字。
                        contentTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        contentBackgroundColor: new Box3RGBAColor(0, 0, 0, 0.98),
                        lookEye: entity.position.add(entity.player.facingDirection.scale(5)),
                        lookTarget: ckwj.value,
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result15 || result15 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }

                    world.say(`${entity.player.name}对${ckwj.value}启用代码：${result15}`)

                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == ckwj.value) {
                            eval(result15)


                        }
                    })





                }

                if (selection.value == '重启服务器') {
                    const cqfwq = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                    
                        titleTextColor: new Box3RGBAColor(0, 0, 0, 0),
                        titleBackgroundColor: new Box3RGBAColor(1, 1, 1, 0.98),
                        content: `${entity.player.name}，确定重启服务器？？？`,
                        options: ['是', '否'],
                        contentTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        contentBackgroundColor: new Box3RGBAColor(1, 0, 0, 1),

                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!cqfwq || cqfwq === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (cqfwq.value === '是') {
                        world.say(`管理员${entity.player.name}强制重启了服务器`)
                        for (; ;) { }

                    }
                }
                if (selection.value == '反光') {
                    const fg = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        lookEye: entity.player.position,
                        content: '反光',
                        options: ['开', '关'],
                    })
                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!fg || fg === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fg.value == '开') {
                        entity.player.shininess = 2;
                        world.say(entity.player.name + '开启了反光效果')

                    }
                    if (fg.value == '关') {
                        entity.player.shininess = 0;
                        world.say(entity.player.name + '关闭了反光效果')

                    }
                }
                if (selection.value == '变色') {
                    const colors = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `请选择变色的颜色`,
                        title: '管理员专属',
                        options: ['蓝', '白', '紫', '绿', '红', '黑', '黄', '浅蓝'],
                    })
                    if (!colors || colors === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (colors.value == '白') {
                        entity.player.color.set(1, 1, 1);
                    }
                    if (colors.value == '蓝') {
                        entity.player.color.set(0, 0, 1);
                    }
                    if (colors.value == '紫') {
                        entity.player.color.set(1, 0, 1);
                    }
                    if (colors.value == '红') {
                        entity.player.color.set(1, 0, 0);
                    }
                    if (colors.value == '黑') {
                        entity.player.color.set(0, 0, 0);
                    }
                    if (colors.value == '绿') {
                        entity.player.color.set(0, 1, 0);
                    }
                    if (colors.value == '黄') {
                        entity.player.color.set(1, 1, 0);
                    }
                    if (colors.value == '浅蓝') {
                        entity.player.color.set(0, 1, 1);
                    }
                }
                if (selection.value == '粒子特效') {
                    const lztx = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `粒子特效`,
                        title: '开或关粒子特效',
                        options: ['开', '关'],
                    })
                    if (!lztx || lztx === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (lztx.value == '开') {
                        world.say(`管理员${entity.player.name}开启了粒子特效`)

                        Object.assign(entity, {
                            particleLimit: 300,
                            particleLifetime: 5,
                            particleRate: 300,
                            particleRateSpread: 500, particleSize: [5, 3, 5, 3, 5],
                            particleColor: [
                                new Box3RGBColor(10, 0, 0),
                                new Box3RGBColor(0, 10, 0),
                                new Box3RGBColor(0, 0, 10),
                            ], // 设置颜色(紫色)
                            particleVelocity: new Box3Vector3(0, 0, 0),
                        });
                    }
                    if (lztx.value == '关') {
                        world.say(`管理员${entity.player.name}关闭了粒子特效`)
                        Object.assign(entity, {
                            particleLimit: 0,
                            particleLifetime: 0,
                            particleRate: 0,
                            particleRateSpread: 0, particleSize: [5, 3, 5, 3, 5],
                            particleColor: [
                                new Box3RGBColor(10, 0, 0),
                                new Box3RGBColor(0, 10, 0),
                                new Box3RGBColor(0, 0, 10),
                            ], // 设置颜色(紫色)
                            particleVelocity: new Box3Vector3(0, 0, 0),
                        });
                    }
                }
                if (selection.value == '飞行') {
                    const fx = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `飞行`,
                        title: '开或关飞行',
                        options: ['开', '关'],
                    })
                    if (!fx || fx === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fx.value == '开') {
                        entity.player.canFly = true
                        world.say(`${entity.player.name}打开了飞行`)
                    }
                    if (fx.value == '关') {
                        entity.player.canFly = false
                        world.say(`${entity.player.name}关闭了飞行`)
                    }
                } else if (selection.value == '发光') {
                    const fg = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `发光`,
                        title: '开或关发光',
                        options: ['开', '关'],
                    })
                    if (!fg || fg === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fg.value == '开') {
                        entity.player.emissive = 1;
                        world.say(`${entity.player.name}使用了发光`)
                    }
                    if (fg.value == '关') {
                        entity.player.emissive = 0;

                        world.say(`${entity.player.name}取消了发光`)
                    }


                } else if (selection.value == '加速') {
                    const js = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `加速`,
                        title: '开或关加速',
                        options: ['开', '关'],
                    })
                    if (!js || js === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (js.value == '开') {
                        entity.player.walkSpeed = 8
                        entity.player.runSpeed = 8
                        world.say(`${entity.player.name}加速了！`)

                    }
                    if (js.value == '关') {
                        entity.player.walkSpeed = 1
                        entity.player.runSpeed = 1
                        world.say(`${entity.player.name}取消了加速`)
                    }

                } else if (selection.value == '隐身') {
                    const ys = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `隐身`,
                        title: '开或关隐身',
                        options: ['开', '关'],
                    })
                    if (!ys || ys === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (ys.value == '开') {
                        entity.player.showName = false
                        entity.player.invisible = true
                        world.say(`${entity.player.name}开启了隐身！`)

                    }
                    if (ys.value == '关') {
                        entity.player.showName = true
                        entity.player.invisible = false
                        world.say(`${entity.player.name}关闭了隐身！`)
                    }




                } else if (selection.value == '穿墙') {
                    const cq = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `穿墙`,
                        title: '开或关穿墙',
                        options: ['开', '关'],
                    })
                    if (!cq || cq === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (cq.value == '开') {
                        entity.player.spectator = true
                        world.say(`${entity.player.name}开启了穿墙！`)

                    }
                    if (cq.value == '关') {
                        entity.player.spectator = false
                        world.say(`${entity.player.name}关闭了穿墙！`)
                    }

                } else if (selection.value == '禁言') {
                    const result6 = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `${entity.player.name}，请选择禁言方式`,
                        options: ['禁言', '解除禁言'],   // 将提供玩家选择的选项放入数组里。
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result6 || result6 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }

                    // 判断玩家选了什么选项。
                    switch (result6.index) {
                        case 0:
                            var players = world.querySelectorAll('player')
                            var names = []
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result5 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要禁言谁？',
                                options: names,
                            })
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result5.value) {
                                    x.player.directMessage('你已被管理员禁言，请等待管理员解除')
                                    world.say(`${x.player.name}被管理员${entity.player.name}禁言了`)
                                    x.player.muted = true
                                }
                            })

                            break;
                        case 1:
                            var players = world.querySelectorAll('player')
                            var names = []
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result7 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要解除禁言谁？',
                                options: names,
                            })
                            if (!result7 || result7 === null) {
                                entity.player.directMessage('取消交互');
                                return;
                            }
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result7.value) {
                                    x.player.directMessage('你已被管理员解除禁言了')
                                    world.say(`${x.player.name}被管理员${entity.player.name}解除禁言了`)
                                    x.player.muted = false
                                }
                            })
                            break;
                        default:
                        // 注意，使用 switch 分支的时候，不要漏了后面的 break; 
                    }

                } else if (selection.value == '监狱') {
                    const jy = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `监狱`,
                        title: '请选择方式',
                        options: ['送监狱', '离开监狱', '前往监狱'],
                    })
                    if (!jy || jy === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (jy.value == '送监狱') {
                        var players = world.querySelectorAll('player')
                        var names = []
                        for (const i in players) {
                            names.push(players[i].player.name)
                        }
                        const result10 = await entity.player.dialog({
                            type: Box3DialogType.SELECT,
                            content: `${entity.player.name}，请选择玩家`,
                            options: names,   // 将提供玩家选择的选项放入数组里。
                        });

                        // 如果玩家点击了屏幕其他区域，取消了对话框。
                        if (!result10 || result10 === null) {
                            entity.player.directMessage('取消交互');
                            return;
                        }
                        world.querySelectorAll('player').forEach((x) => {
                            if (x.player.name == result10.value) {

                                x.player.directMessage('你已被管理员关在监狱里了！')
                                world.say(`${x.player.name}被管理员${entity.player.name}关在监狱里了！`)
                                x.position.set(62, 10, 176)//位置自己改
                            }
                        })
                    }
                    if (jy.value == '离开监狱') {
                        var players = world.querySelectorAll('player')
                        var names = []
                        for (const i in players) {
                            names.push(players[i].player.name)
                        }
                        const result11 = await entity.player.dialog({
                            type: Box3DialogType.SELECT,
                            content: `${entity.player.name}，请选择玩家`,
                            options: names,   // 将提供玩家选择的选项放入数组里。
                        });

                        // 如果玩家点击了屏幕其他区域，取消了对话框。
                        if (!result11 || result11 === null) {
                            entity.player.directMessage('取消交互');
                            return;
                        }
                        world.querySelectorAll('player').forEach((x) => {
                            if (x.player.name == result11.value) {

                                x.player.directMessage('你已被管理员送到起点！')
                                world.say(`${x.player.name}被管理员${entity.player.name}送到了起点！`)
                                x.position.set(125, 3, 5)//位置自己改

                            }
                        })
                    }
                    if (jy.value == '前往监狱') {

                        entity.position.set(62, 10, 176)//位置自己改
                    }
                } else if (selection.value == '踢人') {
                    const result9 = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `${entity.player.name}，请选择禁踢人方式`,
                        options: ['踢指定玩家', '踢所有玩家'],   // 将提供玩家选择的选项放入数组里。
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result9 || result9 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    switch (result9.index) {
                        case 0:
                            var players = world.querySelectorAll('player')
                            var names = ['飞跃的流星','一起来玩吧']
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result8 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要踢谁？',
                                options: names,
                            })
                            if (!result8 || result8 === null) {
                                entity.player.directMessage('取消交互');
                                return;
                            }
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result8.value) {

                                    x.player.directMessage('你已被管理员踢出去了！')
                                    world.say(`${x.player.name}被管理员${entity.player.name}踢出去了！`)
                                    x.player.kick()

                                }
                            })
                            break;
                        case 1:
                            world.say(`管理员${entity.player.name}踢了全部玩家！`)

                            for (const ee of world.querySelectorAll('player')) {//遍历所有实体
                                if (ee.player.name = entity.player.name) {

                                    ee.player.kick()
                                }
                            }
                            break;

                        default:
                    }


                } else if (selection.value == 'world.say') {
                    const result = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        lookEye: entity.player.position,
                        content: '你要对世界公布什么？',
                        placeholder: '请输入...',
                        confirmText: '发送',
                    })
                    world.say(result);
                } else if (selection.value == '控制台') {
                    entity.player.directMessage('输入中...')
                    const result4 = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        title: '控制台',
                        content: `${entity.player.name}请输入代码`,
                        confirmText: '运行',
                        placeholder: '请在输入代码',
                    });
                    if (!result4 || result4 === null) {
                        return;
                    }
                    try {
                        await entity.player.dialog({
                            type: Box3DialogType.TEXT,
                            title: '输出',
                            content: eval(result4),
                        });
                        world.say(`${entity.player.name}在控制台启用了${result4}`)

                    } catch (err) {
                        await entity.player.dialog({
                            type: Box3DialogType.TEXT,
                            title: '报错',
                            content: err
                        });
                    }
                }
            }
        } else {
            entity.player.directMessage('你不是管理员！')
        }
    }
});
var hzzzz = ['图图喵CS舰队司令','Threadripper','23332808','庄轩睿','zxr3425']

// 私聊
world.onPlayerJoin(({ entity }) => {
    entity.coin = 5
    entity.player.message1 = "";
    entity.player.interactTimes = 0;
    entity.enableInteract = true;
    entity.interactRadius = 2;
    entity.interactHint = "与 " + entity.player.name + "（跑酷萌新） 互动";
    entity.onInteract(async ({ entity, targetEntity }) => {
        const result = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: targetEntity.player.name,
            content: `和   ${targetEntity.player.name}  互动`,
            options: ['和TA私聊', '攻击','退出互动']    
        })
        if (!result || result === null) {
            entity.player.directMessage('已为你取消互动！');
            return;
        }
        if (result.index == 0) {
            const dialog = await entity.player.dialog({
                type: Box3DialogType.INPUT,
                title: "向 " + targetEntity.player.name + " 发送私聊信息",
                content: `${entity.player.name}，请输入私聊内容`,
                confirmText: '发送', 
                placeholder: '请输入私聊内容', 
            });
            targetEntity.player.message1 = dialog;
            targetEntity.player.directMessage('收到 ' + entity.player.name + ' 向你发送的私聊信息，正在为你打开查看……')
            await sleep(2000);
            targetEntity.player.directMessage('正在查收 ' + entity.player.name + " 发送的私聊信息")
            entity.player.directMessage('对方已收到聊天信息')
            if (dialog) {
                const dialog = targetEntity.player.dialog({
                    type: Box3DialogType.TEXT,
                    title: entity.player.name,    
                    content: targetEntity.player.message1, 
                });
            }
        } else if(result.index == 1){
            if (entity.hp == 0) return;        
            targetEntity.player.directMessage(`您受到${entity.player.name}的10点攻击！`)
            targetEntity.enableDamage = true
            targetEntity.hurt(10)
        }
    
    })
})





//只要这个常量名字不一样就行

/*const npc = world.querySelector('#市长');
npc.enableInteract = true; // 允许进行互动
npc.interactRadius = 16;   // 实体的互动范围
npc.interactHint = npc.id; // 互动提示框显示实体的名称
npc.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
npc.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});*/
/*
const shop_1 = world.querySelector('#市长')
shop_1.enableInteract = true; 
shop_1.interactRadius = 5; 
shop_1.interactHint = '房子商';
shop_1.onInteract(async ({ entity }) => {
const sl_1 = await entity.player.dialog({ 
type: Box3DialogType.SELECT, 
title: shop_1.id,  
content: `你好，${entity.player.name}，你要买啥？`,
options: ['盾（150金币）', '铁剑（650金币）', '石剑（430金币）']
})
*/

const npc = world.querySelector('#木材商人');
npc.enableInteract = true; // 允许进行互动
npc.interactRadius = 16;   // 实体的互动范围
npc.interactHint = npc.id; // 互动提示框显示实体的名称
npc.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
npc.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});


const n = world.querySelector('#木材商人');
n.enableInteract = true; // 允许进行互动
n.interactRadius = 16;   // 实体的互动范围
n.interactHint = npc.id; // 互动提示框显示实体的名称
n.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
n.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});




world.addCollisionFilter('player','.子弹')    
//首先先导入一个子弹的模型，为0，0，0，1的默认角度
    //子弹创建代码：
    console.clear()
    async function shoot(entity = new Box3Entity) {
        var speed = 5;//越大越快
        const e = world.createEntity({
            mesh: 'mesh/子弹.vb',//其实未必要子弹，弓箭啥一样的
            meshScale: new Box3Vector3(0.0625, 0.0625, 0.0625),//自己调整
            gravity: false, //通过代码控制，而不是使用自带的
            collides: true,//也是使用代码控制，防止打到墙壁会反弹，使用代码还可以有一点穿透效果
            position: entity.position,
        })
        e.speed = speed
        e.own = entity
        e.addTag('子弹')
        var angle = Math.atan2(entity.player.facingDirection.z, entity.player.facingDirection.x)
        //敲重点：
        e.velocity.set(
            Math.cos(angle) * Math.cos(-entity.player.cameraPitch) * speed,
            Math.sin(-entity.player.cameraPitch) * speed,
            Math.sin(angle) * Math.cos(-entity.player.cameraPitch) * speed,
        )
        e.meshOrientation = new Box3Quaternion(0, 0, 0, 1).rotateX(
            Math.atan2(e.velocity.y, Math.sqrt(e.velocity.x ** 2 + e.velocity.z ** 2))
        ).rotateY(angle)
        e.onVoxelContact(()=>{
        e.destroy()
    })        
	await sleep(10000);
        //10秒后消失，防止太多飞出边界
        e.destroy()
    
    }

    world.onPress(async ({ entity, button, raycast }) => {
        if (button == Box3ButtonType.ACTION0) {
            while (entity.player.action0Button) {//连射
                shoot(entity)
                await sleep(1)//连射间隔，自己定
            }
        }
    });

    (async function () {//主循环
        while (1) {
            world.querySelectorAll('.子弹').forEach((e) => {
                var angle = Math.atan2(e.velocity.z, e.velocity.x)
                var up = Math.atan2(e.velocity.y, Math.sqrt(e.velocity.x ** 2 + e.velocity.z ** 2))
                e.meshOrientation = new Box3Quaternion(0, 0, 0, 1).rotateX(
                    up
                ).rotateY(
                    angle
                )
                e.velocity.y -= 0.05//重力下垂
                var hitBox = new Box3Bounds3(e.position.sub(e.bounds), e.position.add(e.bounds));
                var hitEntities = world.querySelectorAll('*').filter(a => hitBox.intersects(new Box3Bounds3(a.position.sub(a.bounds), a.position.add(a.bounds))))
                for (let entity of hitEntities) {
                    //自己写！
                }
            })//不要乱删除！！！删了没有用！出错的不是这里！删了就是错中错！连大小括号都没有了！
            await sleep(100)      
        }
    })











//下面是我编写的
const MeshScale = [0.0625,0.0625,0.0625]
function spawn() {
    const e = world.createEntity({
        mesh:'mesh/僵尸.vb',
        meshScale:MeshScale,
        collides:true, 
        gravity:true, 
        friction:0, 
        maxHp:20,
        hp:20,
        position:[
            64+(Math.random()-0.5) * 60,
            24 + Math.random() * 50,
            64+(Math.random()-0.5) * 60,
        ],
    });
    e.addTag('僵尸');
    e.enableDamage = true;
    e.onVoxelContact(({x,y,z,voxel})=>{
        e.velocity.y = 0.3+Math.random()*0.7
    })
    e.onEntityContact(({other})=>{
        if(other.isPlayer){
            other.hurt(40)
        }
    })
    e.onDie(()=>{
        e.destroy()
    })
}
for (let i = 0; i < 30; i++) {
    spawn()
}
const Quat = new Box3Quaternion(0,0,0,1)
let allPlayers = []
let allZombies = []
world.onTick(async ({tick}) => {
    if(tick%16===0){
        allPlayers = world.querySelectorAll('player')
        allZombies = world.querySelectorAll('.僵尸')
    }
    allZombies.forEach(async (e) => {
        let zomPos = e.position
        if(tick%11===0){
            let target = allPlayers.sort((a,b)=/}
                return a.position.distance(zomPos)-b.position.distance(zomPos)
            })[0]
            if(target){
                e.target = target
            }
        }
        if(e.target && !e.target.destroyed){
            var direction = e.target.position.sub(zomPos); 
            var dist = direction.mag() 
            var speed = 0.2+Math.random()*0.3 
            e.velocity.x = direction.x*speed/dist
            e.velocity.z = direction.z*speed/dist
            
            var orientation = Quat.rotateY(Math.atan2(e.velocity.z, e.velocity.x))
            e.meshOrientation.copy(orientation)
        }
    })
})
world.onPlayerJoin(({entity})=>{
    entity.enableDamage = true;
    entity.onDie(async()=>{
        world.say(`${entity.player.name} 被袭击身亡, 3秒后复活`)
        await sleep(3000)
        
        entity.position.x = Math.random()*127
        entity.position.z = Math.random()*127
        entity.position.y = 100
        await sleep(100) 
        entity.hp = entity.maxHp 
    })
})
world.onClick(({entity})=>{
    entity.hurt(10) 
})console.clear()

const boss = world.querySelector('#末影人-1')
    boss.collides=true, // 开启碰撞
    boss.gravity=false, // 开启重力
    boss.friction=0, // 关闭摩擦力
    boss.maxHp=650,
    boss.hp=650,
    boss.enableDamage=true,
    boss.onEntityContact(({other})=>{
        if(other.isPlayer){
            other.hurt(90,{damageType:'被末影人杀死'})
        }
    })
    boss.onDie(({attacker})=>{
        if(attacker.isPlayer) {
        boss.destroy()
        world.say(`有人干掉了末影人！`);
        attacker.player.directMessage('恭喜获得末影珍珠')
        attacker.bag.push('末影珍珠')
        }
    boss.onVoxelContact(()=>{//当公鸡碰到地形方块
        boss.velocity.y = 0.5 + Math.random()
        boss.velocity.x = (Math.random()-0.5)
        boss.velocity.z = (Math.random()-0.5)
    })
})
boss.onVoxelContact(()=>{//当公鸡碰到地形方块
        boss.velocity.y = 0.5 + Math.random()
        boss.velocity.x = (Math.random()-0.5)
        boss.velocity.z = (Math.random()-0.5)
})



const MeshScale = [0.625,0.625,0.625]
function spawn() {//把生成蜘蛛精英的代码封装成函数
    const spider = world.createEntity({
        mesh:'mesh/蜘蛛精英.vb',
        meshScale:MeshScale,
        collides:true, // 开启碰撞
        gravity:true, // 开启重力
        friction:0, // 关闭摩擦力
        maxHp:60,
        hp:60,
        position:[
            61,//x
            10,//y
            32,//z
        ],
    });
    spider.onEntityContact(({other})=>{
        if(other.isPlayer){//蜘蛛精英撞到玩家
            other.hurt(80,{damageType:'被蜘蛛喵死'})//对玩家造成伤害
        }
    })
    spider.onDie(()=>{
        spider.destroy()//蜘蛛精英喵掉，实体消失！谢谢@1232RvE反馈
        a=Math.random()*1000
        if (a==1) return
        world.say(`恭喜你获得蜘蛛腿。`);
        spawn()

    })
}
for (let i = 0; i < 30; i++) {//开局生成一堆蜘蛛精英
    spawn()
}
const Quat = new Box3Quaternion(0,0,0,1)// box引擎默认的旋转朝向
let allPlayers = []//所有玩家
let allZombies = []//所有蜘蛛精英
world.onTick(async ({tick}) => {//每秒16个tick
    if(tick%16===0){//每16个tick运行一次, 而不是每个tick都运行,节省性能
        allPlayers = world.querySelectorAll('player')
        allZombies = world.querySelectorAll('.蜘蛛精英')
    }
    allZombies.forEach(async (spider) => {
        let zomPos = spider.position
        if(tick%11===0){//每11个tick运行一次, 而不是每个tick都运行,节省性能
            let target = allPlayers.sort((a,b)=>{//蜘蛛精英寻找距离最近的玩家
                return a.position.distance(zomPos)-b.position.distance(zomPos)
            })[0]
            if(target){//地图如果还有玩家
                spider.target = target//让蜘蛛精英记住要追杀的玩家
            }
        }
        if(spider.target && !e.target.destroyed){//如果要追杀的玩家还没有离开地图
            var direction = spider.target.position.sub(zomPos); //蜘蛛精英往玩家的方向矢量
            var dist = direction.mag() //矢量的长度
            var speed = 0.2+Math.random()*0.3 //速度0.2~0.5随机
            spider.velocity.x = direction.x*speed/dist
            spider.velocity.z = direction.z*speed/dist
            // 让蜘蛛精英面向自己的前进方向
            var orientation = Quat.rotateY(Math.atan2(spider.velocity.z, spider.velocity.y,spider.velocity.x))
            spider.meshOrientation.copy(orientation)
        }
    })
})
world.onPlayerJoin(({entity})=>{
    entity.enableDamage = true;
    entity.onDie(async()=>{
        world.say(`${entity.player.name} 被袭击身亡, 3秒后复活`)
        await sleep(3000)
        // 空中随机位置复活
        entity.position.x =88
        entity.position.z =37
        entity.position.y = 179
        await sleep(100) // 防止引擎延迟造成复活后受到死前的伤害
        entity.hp = entity.maxHp //恢复满血
    })
})
world.onClick(({entity,attacker:entity})=>{
    entity.hurt(1000 ,{ attacker:entity }) //被点中的实体会掉血
})


async function js(){
    while(true){
        await sleep(5000)
        spawn(73,11,72)
    }
}js()
async function showPlayers() {
    console.clear() // 清空控制台
    const playerList = await db.sql`SELECT * FROM player`
    for (const p of playerList) {
        console.log(JSON.stringify(p))
    }
}
async function savePlayer(entity) {//定义保存玩家状态的函数
    if (entity.player.userKey) {//拥有userKey的玩家, 则玩家不是游客, 可以保存
        await db.sql`
            --尝试向player表插入一条记录, 向各个字段写入玩家身上对应的属性值
            INSERT INTO sqlplayer (
                username,
                coin,
                pexp,
                bag,
                bag_v,
                jn,
                userKey
            )
            VALUES(
                ${entity.player.name},
                ${entity.coin},
                ${entity.exp},
                ${JSON.stringify(entity.bag)},
                ${JSON.stringify(entity.bag_v)},
                ${JSON.stringify(entity.jn)},
                ${entity.player.userKey}
            )
            ON CONFLICT(userKey)--如果玩家记录已经存在, 则不需要插入, 而是更新各个字段的值
            DO UPDATE SET

            userName=excluded.userName,
            coin=excluded.coin,
            pexp=excluded.pexp,
            bag=excluded.bag,
            bag_v=excluded.bag_v,
            jn=excluded.jn
        `
    }
}
async function loadPlayer(entity) {
    const data = (await (db.sql`SELECT * FROM sqlplayer WHERE userKey=${entity.player.userKey} limit 1`))[0]
    if (data) { //如果存在这个玩家的存档
        entity.coin = data.coin //恢复金钱
        entity.pexp = data.pexp //恢复废品
        entity.bag = JSON.parse(data.bag) //恢复道具列表, 这里的JSON.parse用于把字符串变回数组
        entity.bag_v = JSON.parse(data.bag_v)
        entity.jn = JSON.parse(data.jn)
    }
    
}
async function createTable() {
    await db.sql`
        CREATE TABLE IF NOT EXISTS sqlplayer (
            username TEXT DEFAULT '',
            coin INTEGER DEFAULT 0,--金钱, INTEGER类型用于存储整数
            pexp INTEGER DEFAULT 0,--废品, INTEGER类型用于存储整数
            bag TEXT DEFAULT '',--道具列表, TEXT类型用于存储字符串
            bag_v TEXT DEFAULT '',
            jn TEXT DEFAULT '',
            userKey TEXT PRIMARY KEY UNIQUE DEFAULT ''--玩家的唯一识别码, TEXT类型用于存储字符串
        )
    `
    showPlayers() //每次运行代码都能查看数据库里所有记录
}
createTable()
world.onPlayerJoin(async({entity})=>{
    entity.coin=0
    entity.bag=[]
    entity.bag_v=[]
    entity.jn=[]
    entity.exp=10
    entity.hand=0
    loadPlayer(entity)
    entity.onClick(({entity,clicker}) => {
        entity.hurt(1000,{attacker:clicker})
    })
})
world.onPlayerLeave(({entity:e})=>{
    savePlayer(e)
})
function give(e,thing,number){
    x=false
    for(i in e.bag){
        if(e.bag[i]==thing){x=true
            e.bag_v[i]+=number
            return
            }
        }
    if(!x){e.bag.push(thing)
    e.bag_v.push(number)}
}
function take(e,thing,number){
        for(i in e.bag){
            if(e.bag[i]==thing){
                if(Array.isArray(e.bag_v[i])){
                    if(e.bag_v[i][0]<=number){
                        e.bag.splice(i,1)
                        e.bag_v.splice(i,1)
                    }else{e.bag_v[i][0]-=number}
                }else{if(e.bag_v[i]<=number){
                        e.bag.splice(i,1)
                        e.bag_v.splice(i,1)
                    }else{e.bag_v[i]-=number}}
            }
        return}

}
world.onPress(async({entity,button})=>{
    if(button==="action1"){
        const choice = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: "背包",
            options:["主手",'背包'],
            content:`
            剩余血量${entity.hp}
            剩余金币${entity.coin}
            总经验${entity.exp}
            等级${(entity.exp-=(entity.exp%100))/100}
            距离升级还有${entity.exp%100}经验`
        })
        
        if(!choice || choice === null){return}
    switch(choice.index){
        case 0:
            list=[]
            for(i in e.bag){
               if(Array.isArray(e.bag_v[i])){
                   list.push(`${e.bag[i]}(剩余耐久:${e.bag_v[i][0]})`)
               }else{list.push(`${e.bag[i]}*${e.bag_v[i]}`)}
            }
            choice1=await e.player.dialog({
            type: Box3DialogType.SELECT,
            title: "背包",
            options:list
            })
            if(!choice1 || choice1 === null){return}
            if(choice1["value"]!=""){
                e.hand=choice1["index"]
            }
        break;
        case 1:
        const dialog1 = await entity.player.dialog({
            type:"select",
            content:'选择你需要的道具',
            options:entity.bag,
        })
        default:
    }
    }
})
const TEST_PLAYER = ['图图喵CS舰队司令','Threadripper',"23332808"]
world.onPlayerJoin(({ entity }) => {
    if (!TEST_PLAYER.includes(entity.player.name)) return; // 如果玩家名称不在列表里，则跳过后续脚本。
    world.say(`地图作者${entity.player.name} 出现了！`);
})
world.addCollisionFilter('player', 'player');

world.onPlayerJoin(({ entity }) => {
    if (!TEST_PLAYER.includes(entity.player.name)) return;
    entity.player.canFly = true;
});
var admin = ['图图喵CS舰队司令','Threadripper','黑暗中的曙光','冰雪蜜桃','ACL.番茄炒蛋（退岛一年）','庄轩睿','zxr3425']
world.onChat(async ({ entity, message }) => {
    if (entity.isPlayer) {
        if (admin.includes(entity.player.name)) {
            if (message == '权限') { entity.player.directMessage('亲爱的创作人员你好！特殊功能包含大，小，日出、天亮、消失、傍晚、天黑、变大、变小、还原大小、封神、飞行、解除飞行、加速、隐身、现身、隐藏名字、显示名字、幽灵、解除幽灵、发光、还原发光、反光、还原反光、恢复血量、变红色、变蓝色、变绿色、变紫色、变黄色、变浅蓝色、还原颜色、瞬移、关闭瞬移、加血、清屏、传送(出)管理室、全部还原、关闭粒子特效、开启粒子特效、禁言(例如:禁言+禁言者名字)、解除禁言(例如:解除禁言+被禁言者名字)、制裁(例如:制裁+被制裁者名字)、解除制裁(例如:解除制裁+被解除制裁者名字)') }
            if (message == '变大') { entity.player.scale += 0.2; world.say(entity.player.name + '变大了') }
            if (message == '变小') { entity.player.scale += -0.2; world.say(entity.player.name + '变小了') }
            if (message == '大') { entity.player.scale += 1; world.say(entity.player.name + '变大了') }
            if (message == '小') { entity.player.scale += -1; world.say(entity.player.name + '变小了') }
            if (message == '还原大小') { entity.player.scale = 1; world.say(entity.player.name + '还原了大小') }
            if (message == '飞行') { entity.player.canFly = true; world.say(entity.player.name + '开启了飞行模式') }
            if (message == '解除飞行') { entity.player.canFly = false; world.say(entity.player.name + '关闭了飞行模式') }
            if (message == '加速') {
                entity.player.walkSpeed += 1000
                entity.player.runSpeed += 1000
                entity.player.flySpeed += 1000
                world.say(entity.player.name + '加速了')
            }
            if (message === '日出') { world.sunPhase = 0; entity.player.directMessage('已设置到日出') }
            if (message === '天亮') { world.sunPhase = 0.25; entity.player.directMessage('已设置到天亮') }
            if (message === '傍晚') { world.sunPhase = 0.5; entity.player.directMessage('已设置到傍晚') }
            if (message === '天黑') { world.sunPhase = 0.75; entity.player.directMessage('已设置到天黑') }
            if (message === '隐形') { entity.player.invisible = true; entity.player.directMessage('你已经打开隐形模式') }
            if (message === '解除隐形') { entity.player.invisible = false; entity.player.directMessage('你已经关闭隐形模式') }
            if (message == '恢复血量') { entity.hp = entity.maxHp; world.say(entity.player.name + '恢复了全部血量') }
            if (message == '无敌') { entity.hp = 1e6; entity.maxHp = 1e5; world.say(entity.player.name + '无敌了') }
            if (message == '隐身') { entity.player.invisible = true; world.say(entity.player.name + '隐身了') }
            if (message == '现身') { entity.player.invisible = false; world.say(entity.player.name + '现身了') }
            if (message == '隐藏名字') { entity.player.showName = false; world.say(entity.player.name + '隐藏了名字') }
            if (message == '显示名字') { entity.player.showName = true; world.say(entity.player.name + '显示了名字') }
            if (message == '幽灵') { entity.player.spectator = true; world.say(entity.player.name + '开启了幽灵模式') }
            if (message == '解除幽灵') { entity.player.spectator = false; world.say(entity.player.name + '关闭了幽灵模式') }
            if (message == '发光') { entity.player.emissive = 1; world.say(entity.player.name + '开启了发光效果') }
            if (message == '还原发光') { entity.player.emissive = 0; world.say(entity.player.name + '还原了发光效果') }
            if (message == '反光') { entity.player.shininess = 1; world.say(entity.player.name + '开启了反光效果') }
            if (message == '还原反光') { entity.player.shininess = 0; world.say(entity.player.name + '还原了反光效果') }
            if (message == '变红色') { entity.player.color.set(1, 0, 0); world.say(entity.player.name + '变成了红色') }
            if (message == '变蓝色') { entity.player.color.set(0, 0, 1); world.say(entity.player.name + '变成了蓝色') }
            if (message == '变绿色') { entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了绿色') }
            if (message == '变紫色') { entity.player.color.set(1, 0, 1); world.say(entity.player.name + '变成了紫色') }
            if (message == '变黄色') { entity.player.color.set(1, 1, 0); world.say(entity.player.name + '变成了黄色') }
            if (message == '变浅蓝色') { entity.player.color.set(0, 1, 1); world.say(entity.player.name + '变成了浅蓝色') }
            if (message == '还原颜色') { entity.player.color.set(1, 1, 1); world.say(entity.player.name + '还原了颜色') }
            if (message == '删除宠物') { entity.setPet(); }
            if (message == '消失') {
                entity.player.invisible = true; entity.player.showName = false;
                world.say(entity.player.name + '消失了')
            };
            if (message == '封神') {
                entity.player.invisible = true;
                entity.player.showName = false;
                entity.player.spectator = true;
                entity.atta = 1;
                entity.player.canFly = true;
                entity.player.walkSpeed += 500;
                entity.player.runSpeed += 500;
                entity.player.flySpeed += 500;
                entity.player.jumpPower = 5;
                Object.assign(entity, {
                    particleRate: 500,//粒子数量，可更改，越大粒子越多
                    particleSize: [1, 3, 5, 3, 1],//粒子在每个阶段的大小，可更改
                    particleColor: [//例子在每个阶段的颜色，可更改
                        new Box3RGBColor(6, 0, 0),//第一阶段
                        new Box3RGBColor(5, 0, 0),//第二阶段
                        new Box3RGBColor(5, 0, 0),//第三阶段
                        new Box3RGBColor(8, 6, 0),//第四阶段
                        new Box3RGBColor(9, 0, 0),//第五阶段
                    ],
                    particleLifetime: 0.4,
                    particleVelocitySpread: new Box3Vector3(2, 2, 2),
                });
                world.say(entity.player.name + '封神了!')
            };


            if (message == '还原') {
                entity.player.scale = 1;
                entity.player.canFly = false;
                entity.player.showName = true;
                entity.player.spectator = false;
                entity.player.invisible = false;
                entity.player.emissive = 0;
                entity.player.shininess = 0;
                entity.player.color.set(1, 1, 1);
                Object.assign(entity, { particleRate: 250, });
                world.say(entity.player.name + '全部还原了');
            };
            if (message == '清屏') {
                for (let x = 0; x < 3000; x++) {
                    world.say('')
                }
            }
            if (message.startsWith('过来')) {
                const sendentity = await entity.player.dialog({
                    type: Box3DialogType.SELECT,
                    title: '系统',
                    content: `尊敬的创作者，你想让谁过来？`,
                    options: players,   // 将提供玩家选择的选项放入数组里。
                })

                if (!sendentity || sendentity === null) {
                    return
                }
                if (players_entity[sendentity.index].player.name == entity.player.name) {
                    entity.player.directMessage('无法让自己过来，请重新尝试！')
                }
                if (players_entity[sendentity.index].player.name == '飞跃的流星') {
                    entity.player.directMessage('无法让作者过来，请重新尝试！')
                }
                switch (sendentity) {
                    default:
                        if (players_entity[sendentity.index].player.name == '') return;
                        if (players_entity[sendentity.index].player.name == entity.player.name) return;
                        world.say(`管理员让${players_entity[sendentity.index].player.name}过来了`);
                        players_entity[sendentity.index].player.spawnPoint.copy(entity.position);
                        players_entity[sendentity.index].player.forceRespawn()
                }
            }
            if (message.startsWith('解除禁言')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            entity.player.directMessage(`已解除禁言  ${x.player.name}  玩家`)
                            x.player.directMessage('希望你改过自新，谨遵地图秩序！')
                            world.say('有人被管理员解除禁言了！')
                            x.player.muted = false
                        }
                    })
                }
            }
            if (message.startsWith('我要去')) {
                const sendentity = await entity.player.dialog({
                    type: Box3DialogType.SELECT,
                    title: '系统',
                    content: `尊敬的创作者，你想去谁那里？`,
                    options: players,   // 将提供玩家选择的选项放入数组里。
                })

                if (!sendentity || sendentity === null) {
                    return
                }
                if (players_entity[sendentity.index].player.name == '飞跃的流星') {
                    entity.player.directMessage('无法去作者那里，请重新尝试！')
                }
                if (players_entity[sendentity.index].player.name == entity.player.name) {
                    entity.player.directMessage('无法去自己那里，请重新尝试！')
                }
                switch (sendentity) {
                    default:
                        if (players_entity[sendentity.index].player.name == '飞跃的流星') return;
                        if (players_entity[sendentity.index].player.name == entity.player.name) return;
                        world.say(`管理员去到${players_entity[sendentity.index].player.name}那里了`);
                        entity.player.spawnPoint.copy(players_entity[sendentity.index].position);
                        entity.player.forceRespawn()
                }
            } function randint(min, max) {
                return Math.round(Math.random() * (max - 1) + min);
            }
            if (message == '变彩虹') {
                entity.player.color.set(0, 1, 0); world.say(entity.player.name + '变成了彩虹')
                world.onTick(({ tick }) => {
                    var r = randint(1, 7);
                    if (r == 1) {
                        entity.player.color = new Box3RGBColor(1, 0, 0);
                    }
                    else if (r == 2) {
                        entity.player.color = new Box3RGBColor(0, 1, 0);
                    }
                    else if (r == 3) {
                        entity.player.color = new Box3RGBColor(0, 0, 1);
                    }
                    else if (r == 4) {
                        entity.player.color = new Box3RGBColor(1, 1, 0);
                    }
                    else if (r == 5) {
                        entity.player.color = new Box3RGBColor(1, 0, 1);
                    }
                    else if (r == 6) {
                        entity.player.color = new Box3RGBColor(0, 1, 1);
                    }
                    else if (r == 7) {
                        entity.player.color = new Box3RGBColor(1, 1, 1);
                    }
                })
            }
            if (message == '关闭粒子特效') { Object.assign(entity, { particleRate: 0, }); world.say(entity.player.name + '关闭了粒子特效'); }
            if (message == '开启粒子特效') { Object.assign(entity, { particleRate: 250, }); world.say(entity.player.name + '开启了粒子特效'); }
            if (message.startsWith('禁言')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.directMessage('你被管理员禁言了，请遵守地图秩序！')
                            world.say('有人犯了错，被管理员禁言了！')
                            x.player.muted = true
                        }
                    })
                }
            }
            if (message.startsWith('踢了')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.kick()
                        }
                    })
                }
            }
            if (message.startsWith('制裁')) {
                if (message.slice(2) == entity.player.name) {
                    entity.player.directMessage('无法制裁自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(2)) {
                            x.player.directMessage('你惹怒了管理员，你被管理员制裁了！')
                            world.say('有人惹怒了管理员，被管理员制裁了！')
                            {
                                x.player.runSpeed = -0.5;
                                x.player.runAcceleration = -0.5;
                                x.player.walkSpeed = -0.5;
                                x.player.walkAcceleration = -0.5;
                            }
                        }
                    })
                }
            }
            if (message.startsWith('解除制裁')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除制裁自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('管理员气消了，放你一马吧！')
                            world.say('有人被管理员解除制裁了！')
                            {
                                x.player.runSpeed = 0.4;
                                x.player.runAcceleration = 0.35;
                                x.player.walkSpeed = 0.22;
                                x.player.walkAcceleration = 0.19;
                            }
                        }
                    })
                }
            }
            if (message.startsWith('击杀')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法击杀自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('击杀')
                            world.say('有人被管理员击杀了')
                            x.player.entity.hp -= 999999999999999999999
                        }
                    })
                }
            }
            if (message.startsWith('解除禁言')) {
                if (message.slice(4) == entity.player.name) {
                    entity.player.directMessage('无法解除禁言自己，请重新尝试！')
                } else {
                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == message.slice(4)) {
                            x.player.directMessage('希望你改过自新，谨遵地图秩序！')
                            world.say('有人被管理员解除禁言了！')
                            x.player.muted = false
                        }
                    })
                }
            }
        }
    }
})

world.onPlayerJoin(async ({ entity }) => {
    entity.player.onPress(async ({ button, entity }) => {
        if (entity.player.name == '') {
            if (button == Box3ButtonType.CROUCH) {
                const fayan = await entity.player.dialog({
                    type: Box3DialogType.INPUT,
                    title: '系统',
                    content: '输入你要说的话吧！',
                    placeholder: '你要说……'
                })
                if (!fayan || fayan == null) {
                    entity.player.directMessage('你取消了发言')
                }
                if (fayan) {
                    world.say(`作者说： ${fayan}`)
                }
            }
        }
    })
})
world.onPress(async ({ entity, button }) => {
    if (button != Box3ButtonType.ACTION1||entity.player.walkState!='crouch'|| !entity.isPlayer)return
    if (entity.k) {
        entity.player.cameraEntity = entity;
        entity.player.enableJump = true;
        entity.player.enableDoubleJump = true;
        entity.player.walkSpeed = 0.22;
        entity.player.runSpeed = 0.4;
        entity.player.flySpeed = 2;
        entity.player.swimSpeed = 0.4;
        entity.player.crouchSpeed = 0.1;
        entity.player.runAcceleration = 0.35;
        entity.player.crouchAcceleration = 0.09;
        entity.player.flyAcceleration = 2;
        entity.player.swimAcceleration = 0.1;
        entity.player.walkAcceleration = 0.19;
        entity.player.directMessage(`��️已恢复视角`);
        entity.k = 0;
        return;
    }
    let re = await entity.player.dialog({
        type: Box3DialogType.SELECT,
        title: `${entity.level}`,
        options: ['刷新', '观看他人', '切换视角', '管理员专属', '取消'],
    });
    if (re == null || !re || re == '取消') return;
    if (re.index == 0) {
        entity.position.set(233, 10, 23)//刷新位置
        entity.jumpcounttime = 4;
        entity.player.directMessage('��已经刷新');
    }
    if (re.index == 1) {
        let ns = [];
        world.querySelectorAll('player').forEach((e) => {
            if (entity.player.name != e.player.name) ns.push(e.player.name);
        });
        let r2 = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: '控制',
            contect: '你要观看谁？',
            options: ns,
        });
        if (!r2.value || r2.value == null) return;
        world.querySelectorAll('player').forEach((e) => {
            if (e.player.name != r2.value) return;
            entity.player.cameraEntity = e;
            entity.player.enableJump = false;
            entity.player.enableDoubleJump = false;
            entity.player.walkSpeed = 0;
            entity.player.runSpeed = 0;
            entity.player.flySpeed = 0;
            entity.player.swimSpeed = 0;
            entity.player.crouchSpeed = 0;
            entity.player.runAcceleration = 0;
            entity.player.crouchAcceleration = 0;
            entity.player.flyAcceleration = 0;
            entity.player.swimAcceleration = 0;
            entity.player.walkAcceleration = 0;
            entity.player.directMessage(`��️观看了${e.player.name}`);
            e.player.directMessage(`��️你已被${entity.player.name}观看`);
            entity.k = 1;
        });
    }

    if (re.value == '切换视角') {
        const sj = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            lookEye: entity.player.position,
            content: '切换哪个视角？',//（提示：2D视角1层不适合哟）（2D视角代码原作者：编码喵）
            options: ['第三人称', '第一人称'],
        })
        if (!sj || sj === null) {

            entity.player.directMessage('取消交互');
            return;
        }
        if (sj.value == '第三人称') {
            entity.player.cameraMode = 'follow';
            entity.player.swapInputDirection = false;
            entity.player.cameraPosition = new Box3Vector3(0, 0, 0);
            entity.player.freezedForwardDirection = new Box3Vector3
            //entity.player.cameraFreezedAxis=Box3CameraFreezedAxis.X;
            entity.player.reverseInputDirection = Box3InputDirection.NONE
            entity.player.cameraFreezedAxis = Box3CameraFreezedAxis.NONE

        }
        if (sj.value == '第一人称') {
            entity.player.cameraMode = 'fps';
            entity.player.swapInputDirection = false;


        }
        if (sj.value == '2D视角') {
            entity.player.cameraMode = Box3CameraMode.RELATIVE;
            entity.player.cameraPosition = new Box3Vector3(-10, 0, entity.position.z - 155);
            entity.player.swapInputDirection = true;
            entity.player.reverseInputDirection = Box3InputDirection.HORIZONTAL;
            entity.player.cameraFreezedAxis = Box3CameraFreezedAxis.X;
            entity.player.freezedForwardDirection = new Box3Vector3(0, 0, 1);
            entity.player.cameraTarget = new Box3Vector3(entity.position.x, entity.position.y, entity.position.z)

        }

    }


    if (re.value == '管理员专属') {
        if (hzzzz.includes(entity.player.name)) {

            const selection = await entity.player.dialog({
                type: Box3DialogType.SELECT,
                content: `亲爱的合作者${entity.player.name}你好呀！
                    不要乱用权限哦！`,
                title: '管理员专属',
                options: ['飞行', '穿墙', '加速', 'world.say', '禁言', '控制台', '踢人', '操控玩家','反光','变色','粒子特效', '重启服务器','监狱','制裁']
            })
            if (selection) {
                if (selection.value == '操控玩家') {
                    var players = world.querySelectorAll('player')
                    var names = []
                    for (const i in players) {
                        names.push(players[i].player.name)
                    }
                    const ckwj = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        lookEye: entity.player.position,
                        content: '请选择玩家',
                        options: names,
                    })
                    const result15 = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        title: `操作玩家${ckwj.value}`,
                        titleTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        titleBackgroundColor: new Box3RGBAColor(0, 0, 0, 0.98),
                        content: `请问你要对${ckwj.value}输入什么代码？（前面加x哦，不是entity）`,
                        confirmText: '确定', // 确定按钮上面的文字。按下确定按钮后，提交回答。
                        placeholder: '输入代码哟', // 输入框背景上的提示文字。
                        contentTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        contentBackgroundColor: new Box3RGBAColor(0, 0, 0, 0.98),
                        lookEye: entity.position.add(entity.player.facingDirection.scale(5)),
                        lookTarget: ckwj.value,
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result15 || result15 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }

                    world.say(`${entity.player.name}对${ckwj.value}启用代码：${result15}`)

                    world.querySelectorAll('player').forEach((x) => {
                        if (x.player.name == ckwj.value) {
                            eval(result15)


                        }
                    })





                }

                if (selection.value == '重启服务器') {
                    const cqfwq = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                    
                        titleTextColor: new Box3RGBAColor(0, 0, 0, 0),
                        titleBackgroundColor: new Box3RGBAColor(1, 1, 1, 0.98),
                        content: `${entity.player.name}，确定重启服务器？？？`,
                        options: ['是', '否'],
                        contentTextColor: new Box3RGBAColor(1, 1, 1, 1),
                        contentBackgroundColor: new Box3RGBAColor(1, 0, 0, 1),

                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!cqfwq || cqfwq === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (cqfwq.value === '是') {
                        world.say(`管理员${entity.player.name}强制重启了服务器`)
                        for (; ;) { }

                    }
                }
                if (selection.value == '反光') {
                    const fg = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        lookEye: entity.player.position,
                        content: '反光',
                        options: ['开', '关'],
                    })
                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!fg || fg === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fg.value == '开') {
                        entity.player.shininess = 2;
                        world.say(entity.player.name + '开启了反光效果')

                    }
                    if (fg.value == '关') {
                        entity.player.shininess = 0;
                        world.say(entity.player.name + '关闭了反光效果')

                    }
                }
                if (selection.value == '变色') {
                    const colors = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `请选择变色的颜色`,
                        title: '管理员专属',
                        options: ['蓝', '白', '紫', '绿', '红', '黑', '黄', '浅蓝'],
                    })
                    if (!colors || colors === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (colors.value == '白') {
                        entity.player.color.set(1, 1, 1);
                    }
                    if (colors.value == '蓝') {
                        entity.player.color.set(0, 0, 1);
                    }
                    if (colors.value == '紫') {
                        entity.player.color.set(1, 0, 1);
                    }
                    if (colors.value == '红') {
                        entity.player.color.set(1, 0, 0);
                    }
                    if (colors.value == '黑') {
                        entity.player.color.set(0, 0, 0);
                    }
                    if (colors.value == '绿') {
                        entity.player.color.set(0, 1, 0);
                    }
                    if (colors.value == '黄') {
                        entity.player.color.set(1, 1, 0);
                    }
                    if (colors.value == '浅蓝') {
                        entity.player.color.set(0, 1, 1);
                    }
                }
                if (selection.value == '粒子特效') {
                    const lztx = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `粒子特效`,
                        title: '开或关粒子特效',
                        options: ['开', '关'],
                    })
                    if (!lztx || lztx === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (lztx.value == '开') {
                        world.say(`管理员${entity.player.name}开启了粒子特效`)

                        Object.assign(entity, {
                            particleLimit: 300,
                            particleLifetime: 5,
                            particleRate: 300,
                            particleRateSpread: 500, particleSize: [5, 3, 5, 3, 5],
                            particleColor: [
                                new Box3RGBColor(10, 0, 0),
                                new Box3RGBColor(0, 10, 0),
                                new Box3RGBColor(0, 0, 10),
                            ], // 设置颜色(紫色)
                            particleVelocity: new Box3Vector3(0, 0, 0),
                        });
                    }
                    if (lztx.value == '关') {
                        world.say(`管理员${entity.player.name}关闭了粒子特效`)
                        Object.assign(entity, {
                            particleLimit: 0,
                            particleLifetime: 0,
                            particleRate: 0,
                            particleRateSpread: 0, particleSize: [5, 3, 5, 3, 5],
                            particleColor: [
                                new Box3RGBColor(10, 0, 0),
                                new Box3RGBColor(0, 10, 0),
                                new Box3RGBColor(0, 0, 10),
                            ], // 设置颜色(紫色)
                            particleVelocity: new Box3Vector3(0, 0, 0),
                        });
                    }
                }
                if (selection.value == '飞行') {
                    const fx = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `飞行`,
                        title: '开或关飞行',
                        options: ['开', '关'],
                    })
                    if (!fx || fx === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fx.value == '开') {
                        entity.player.canFly = true
                        world.say(`${entity.player.name}打开了飞行`)
                    }
                    if (fx.value == '关') {
                        entity.player.canFly = false
                        world.say(`${entity.player.name}关闭了飞行`)
                    }
                } else if (selection.value == '发光') {
                    const fg = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `发光`,
                        title: '开或关发光',
                        options: ['开', '关'],
                    })
                    if (!fg || fg === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (fg.value == '开') {
                        entity.player.emissive = 1;
                        world.say(`${entity.player.name}使用了发光`)
                    }
                    if (fg.value == '关') {
                        entity.player.emissive = 0;

                        world.say(`${entity.player.name}取消了发光`)
                    }


                } else if (selection.value == '加速') {
                    const js = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `加速`,
                        title: '开或关加速',
                        options: ['开', '关'],
                    })
                    if (!js || js === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (js.value == '开') {
                        entity.player.walkSpeed = 8
                        entity.player.runSpeed = 8
                        world.say(`${entity.player.name}加速了！`)

                    }
                    if (js.value == '关') {
                        entity.player.walkSpeed = 1
                        entity.player.runSpeed = 1
                        world.say(`${entity.player.name}取消了加速`)
                    }

                } else if (selection.value == '隐身') {
                    const ys = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `隐身`,
                        title: '开或关隐身',
                        options: ['开', '关'],
                    })
                    if (!ys || ys === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (ys.value == '开') {
                        entity.player.showName = false
                        entity.player.invisible = true
                        world.say(`${entity.player.name}开启了隐身！`)

                    }
                    if (ys.value == '关') {
                        entity.player.showName = true
                        entity.player.invisible = false
                        world.say(`${entity.player.name}关闭了隐身！`)
                    }




                } else if (selection.value == '穿墙') {
                    const cq = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `穿墙`,
                        title: '开或关穿墙',
                        options: ['开', '关'],
                    })
                    if (!cq || cq === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (cq.value == '开') {
                        entity.player.spectator = true
                        world.say(`${entity.player.name}开启了穿墙！`)

                    }
                    if (cq.value == '关') {
                        entity.player.spectator = false
                        world.say(`${entity.player.name}关闭了穿墙！`)
                    }

                } else if (selection.value == '禁言') {
                    const result6 = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `${entity.player.name}，请选择禁言方式`,
                        options: ['禁言', '解除禁言'],   // 将提供玩家选择的选项放入数组里。
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result6 || result6 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }

                    // 判断玩家选了什么选项。
                    switch (result6.index) {
                        case 0:
                            var players = world.querySelectorAll('player')
                            var names = []
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result5 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要禁言谁？',
                                options: names,
                            })
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result5.value) {
                                    x.player.directMessage('你已被管理员禁言，请等待管理员解除')
                                    world.say(`${x.player.name}被管理员${entity.player.name}禁言了`)
                                    x.player.muted = true
                                }
                            })

                            break;
                        case 1:
                            var players = world.querySelectorAll('player')
                            var names = []
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result7 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要解除禁言谁？',
                                options: names,
                            })
                            if (!result7 || result7 === null) {
                                entity.player.directMessage('取消交互');
                                return;
                            }
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result7.value) {
                                    x.player.directMessage('你已被管理员解除禁言了')
                                    world.say(`${x.player.name}被管理员${entity.player.name}解除禁言了`)
                                    x.player.muted = false
                                }
                            })
                            break;
                        default:
                        // 注意，使用 switch 分支的时候，不要漏了后面的 break; 
                    }

                } else if (selection.value == '监狱') {
                    const jy = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `监狱`,
                        title: '请选择方式',
                        options: ['送监狱', '离开监狱', '前往监狱'],
                    })
                    if (!jy || jy === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    if (jy.value == '送监狱') {
                        var players = world.querySelectorAll('player')
                        var names = []
                        for (const i in players) {
                            names.push(players[i].player.name)
                        }
                        const result10 = await entity.player.dialog({
                            type: Box3DialogType.SELECT,
                            content: `${entity.player.name}，请选择玩家`,
                            options: names,   // 将提供玩家选择的选项放入数组里。
                        });

                        // 如果玩家点击了屏幕其他区域，取消了对话框。
                        if (!result10 || result10 === null) {
                            entity.player.directMessage('取消交互');
                            return;
                        }
                        world.querySelectorAll('player').forEach((x) => {
                            if (x.player.name == result10.value) {

                                x.player.directMessage('你已被管理员关在监狱里了！')
                                world.say(`${x.player.name}被管理员${entity.player.name}关在监狱里了！`)
                                x.position.set(62, 10, 176)//位置自己改
                            }
                        })
                    }
                    if (jy.value == '离开监狱') {
                        var players = world.querySelectorAll('player')
                        var names = []
                        for (const i in players) {
                            names.push(players[i].player.name)
                        }
                        const result11 = await entity.player.dialog({
                            type: Box3DialogType.SELECT,
                            content: `${entity.player.name}，请选择玩家`,
                            options: names,   // 将提供玩家选择的选项放入数组里。
                        });

                        // 如果玩家点击了屏幕其他区域，取消了对话框。
                        if (!result11 || result11 === null) {
                            entity.player.directMessage('取消交互');
                            return;
                        }
                        world.querySelectorAll('player').forEach((x) => {
                            if (x.player.name == result11.value) {

                                x.player.directMessage('你已被管理员送到起点！')
                                world.say(`${x.player.name}被管理员${entity.player.name}送到了起点！`)
                                x.position.set(125, 3, 5)//位置自己改

                            }
                        })
                    }
                    if (jy.value == '前往监狱') {

                        entity.position.set(62, 10, 176)//位置自己改
                    }
                } else if (selection.value == '踢人') {
                    const result9 = await entity.player.dialog({
                        type: Box3DialogType.SELECT,
                        content: `${entity.player.name}，请选择禁踢人方式`,
                        options: ['踢指定玩家', '踢所有玩家'],   // 将提供玩家选择的选项放入数组里。
                    });

                    // 如果玩家点击了屏幕其他区域，取消了对话框。
                    if (!result9 || result9 === null) {
                        entity.player.directMessage('取消交互');
                        return;
                    }
                    switch (result9.index) {
                        case 0:
                            var players = world.querySelectorAll('player')
                            var names = ['飞跃的流星','一起来玩吧']
                            for (const i in players) {
                                names.push(players[i].player.name)
                            }
                            const result8 = await entity.player.dialog({
                                type: Box3DialogType.SELECT,
                                lookEye: entity.player.position,
                                content: '请问你要踢谁？',
                                options: names,
                            })
                            if (!result8 || result8 === null) {
                                entity.player.directMessage('取消交互');
                                return;
                            }
                            world.querySelectorAll('player').forEach((x) => {
                                if (x.player.name == result8.value) {

                                    x.player.directMessage('你已被管理员踢出去了！')
                                    world.say(`${x.player.name}被管理员${entity.player.name}踢出去了！`)
                                    x.player.kick()

                                }
                            })
                            break;
                        case 1:
                            world.say(`管理员${entity.player.name}踢了全部玩家！`)

                            for (const ee of world.querySelectorAll('player')) {//遍历所有实体
                                if (ee.player.name = entity.player.name) {

                                    ee.player.kick()
                                }
                            }
                            break;

                        default:
                    }


                } else if (selection.value == 'world.say') {
                    const result = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        lookEye: entity.player.position,
                        content: '你要对世界公布什么？',
                        placeholder: '请输入...',
                        confirmText: '发送',
                    })
                    world.say(result);
                } else if (selection.value == '控制台') {
                    entity.player.directMessage('输入中...')
                    const result4 = await entity.player.dialog({
                        type: Box3DialogType.INPUT,
                        title: '控制台',
                        content: `${entity.player.name}请输入代码`,
                        confirmText: '运行',
                        placeholder: '请在输入代码',
                    });
                    if (!result4 || result4 === null) {
                        return;
                    }
                    try {
                        await entity.player.dialog({
                            type: Box3DialogType.TEXT,
                            title: '输出',
                            content: eval(result4),
                        });
                        world.say(`${entity.player.name}在控制台启用了${result4}`)

                    } catch (err) {
                        await entity.player.dialog({
                            type: Box3DialogType.TEXT,
                            title: '报错',
                            content: err
                        });
                    }
                }
            }
        } else {
            entity.player.directMessage('你不是管理员！')
        }
    }
});
var hzzzz = ['图图喵CS舰队司令','Threadripper','23332808','庄轩睿','zxr3425']

// 私聊
world.onPlayerJoin(({ entity }) => {
    entity.coin = 5
    entity.player.message1 = "";
    entity.player.interactTimes = 0;
    entity.enableInteract = true;
    entity.interactRadius = 2;
    entity.interactHint = "与 " + entity.player.name + "（跑酷萌新） 互动";
    entity.onInteract(async ({ entity, targetEntity }) => {
        const result = await entity.player.dialog({
            type: Box3DialogType.SELECT,
            title: targetEntity.player.name,
            content: `和   ${targetEntity.player.name}  互动`,
            options: ['和TA私聊', '攻击','退出互动']    
        })
        if (!result || result === null) {
            entity.player.directMessage('已为你取消互动！');
            return;
        }
        if (result.index == 0) {
            const dialog = await entity.player.dialog({
                type: Box3DialogType.INPUT,
                title: "向 " + targetEntity.player.name + " 发送私聊信息",
                content: `${entity.player.name}，请输入私聊内容`,
                confirmText: '发送', 
                placeholder: '请输入私聊内容', 
            });
            targetEntity.player.message1 = dialog;
            targetEntity.player.directMessage('收到 ' + entity.player.name + ' 向你发送的私聊信息，正在为你打开查看……')
            await sleep(2000);
            targetEntity.player.directMessage('正在查收 ' + entity.player.name + " 发送的私聊信息")
            entity.player.directMessage('对方已收到聊天信息')
            if (dialog) {
                const dialog = targetEntity.player.dialog({
                    type: Box3DialogType.TEXT,
                    title: entity.player.name,    
                    content: targetEntity.player.message1, 
                });
            }
        } else if(result.index == 1){
            if (entity.hp == 0) return;        
            targetEntity.player.directMessage(`您受到${entity.player.name}的10点攻击！`)
            targetEntity.enableDamage = true
            targetEntity.hurt(10)
        }
    
    })
})





//只要这个常量名字不一样就行

/*const npc = world.querySelector('#市长');
npc.enableInteract = true; // 允许进行互动
npc.interactRadius = 16;   // 实体的互动范围
npc.interactHint = npc.id; // 互动提示框显示实体的名称
npc.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
npc.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});*/
/*
const shop_1 = world.querySelector('#市长')
shop_1.enableInteract = true; 
shop_1.interactRadius = 5; 
shop_1.interactHint = '房子商';
shop_1.onInteract(async ({ entity }) => {
const sl_1 = await entity.player.dialog({ 
type: Box3DialogType.SELECT, 
title: shop_1.id,  
content: `你好，${entity.player.name}，你要买啥？`,
options: ['盾（150金币）', '铁剑（650金币）', '石剑（430金币）']
})
*/

const npc = world.querySelector('#木材商人');
npc.enableInteract = true; // 允许进行互动
npc.interactRadius = 16;   // 实体的互动范围
npc.interactHint = npc.id; // 互动提示框显示实体的名称
npc.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
npc.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});


const n = world.querySelector('#木材商人');
n.enableInteract = true; // 允许进行互动
n.interactRadius = 16;   // 实体的互动范围
n.interactHint = npc.id; // 互动提示框显示实体的名称
n.interactColor = new Box3RGBColor(1,0,1);  // 互动提示的文字颜色

// 玩家与实体进行交互时触发
n.onInteract(async({entity}) => {
    const result = await entity.player.dialog({
        type: Box3DialogType.TEXT,   // 对话框的类型，TEXT是文本框。
        title: npc.id,               // 对话框标题为NPC名字，表示正在说话的是NPC
        lookEye: entity,             // 将相机放在玩家位置
        lookTarget: npc,             // 相机镜头对准NPC
        content: `你好，${entity.player.name}，很高兴认识你。`,
    });
});




world.addCollisionFilter('player','.子弹')    
//首先先导入一个子弹的模型，为0，0，0，1的默认角度
    //子弹创建代码：
    console.clear()
    async function shoot(entity = new Box3Entity) {
        var speed = 5;//越大越快
        const e = world.createEntity({
            mesh: 'mesh/子弹.vb',//其实未必要子弹，弓箭啥一样的
            meshScale: new Box3Vector3(0.0625, 0.0625, 0.0625),//自己调整
            gravity: false, //通过代码控制，而不是使用自带的
            collides: true,//也是使用代码控制，防止打到墙壁会反弹，使用代码还可以有一点穿透效果
            position: entity.position,
        })
        e.speed = speed
        e.own = entity
        e.addTag('子弹')
        var angle = Math.atan2(entity.player.facingDirection.z, entity.player.facingDirection.x)
        //敲重点：
        e.velocity.set(
            Math.cos(angle) * Math.cos(-entity.player.cameraPitch) * speed,
            Math.sin(-entity.player.cameraPitch) * speed,
            Math.sin(angle) * Math.cos(-entity.player.cameraPitch) * speed,
        )
        e.meshOrientation = new Box3Quaternion(0, 0, 0, 1).rotateX(
            Math.atan2(e.velocity.y, Math.sqrt(e.velocity.x ** 2 + e.velocity.z ** 2))
        ).rotateY(angle)
        e.onVoxelContact(()=>{
        e.destroy()
    })        
	await sleep(10000);
        //10秒后消失，防止太多飞出边界
        e.destroy()
    
    }

    world.onPress(async ({ entity, button, raycast }) => {
        if (button == Box3ButtonType.ACTION0) {
            while (entity.player.action0Button) {//连射
                shoot(entity)
                await sleep(1)//连射间隔，自己定
            }
        }
    });

    (async function () {//主循环
        while (1) {
            world.querySelectorAll('.子弹').forEach((e) => {
                var angle = Math.atan2(e.velocity.z, e.velocity.x)
                var up = Math.atan2(e.velocity.y, Math.sqrt(e.velocity.x ** 2 + e.velocity.z ** 2))
                e.meshOrientation = new Box3Quaternion(0, 0, 0, 1).rotateX(
                    up
                ).rotateY(
                    angle
                )
                e.velocity.y -= 0.05//重力下垂
                var hitBox = new Box3Bounds3(e.position.sub(e.bounds), e.position.add(e.bounds));
                var hitEntities = world.querySelectorAll('*').filter(a => hitBox.intersects(new Box3Bounds3(a.position.sub(a.bounds), a.position.add(a.bounds))))
                for (let entity of hitEntities) {
                    //自己写！
                }
            })//不要乱删除！！！删了没有用！出错的不是这里！删了就是错中错！连大小括号都没有了！
            await sleep(100)      
        }
    })











//下面是我编写的
const MeshScale = [0.0625,0.0625,0.0625]
function spawn() {
    const e = world.createEntity({
        mesh:'mesh/僵尸.vb',
        meshScale:MeshScale,
        collides:true, 
        gravity:true, 
        friction:0, 
        maxHp:20,
        hp:20,
        position:[
            64+(Math.random()-0.5) * 60,
            24 + Math.random() * 50,
            64+(Math.random()-0.5) * 60,
        ],
    });
    e.addTag('僵尸');
    e.enableDamage = true;
    e.onVoxelContact(({x,y,z,voxel})=>{
        e.velocity.y = 0.3+Math.random()*0.7
    })
    e.onEntityContact(({other})=>{
        if(other.isPlayer){
            other.hurt(40)
        }
    })
    e.onDie(()=>{
        e.destroy()
    })
}
for (let i = 0; i < 30; i++) {
    spawn()
}
const Quat = new Box3Quaternion(0,0,0,1)
let allPlayers = []
let allZombies = []
world.onTick(async ({tick}) => {
    if(tick%16===0){
        allPlayers = world.querySelectorAll('player')
        allZombies = world.querySelectorAll('.僵尸')
    }
    allZombies.forEach(async (e) => {
        let zomPos = e.position
        if(tick%11===0){
            let target = allPlayers.sort((a,b)=/}
                return a.position.distance(zomPos)-b.position.distance(zomPos)
            })[0]
            if(target){
                e.target = target
            }
        }
        if(e.target && !e.target.destroyed){
            var direction = e.target.position.sub(zomPos); 
            var dist = direction.mag() 
            var speed = 0.2+Math.random()*0.3 
            e.velocity.x = direction.x*speed/dist
            e.velocity.z = direction.z*speed/dist
            
            var orientation = Quat.rotateY(Math.atan2(e.velocity.z, e.velocity.x))
            e.meshOrientation.copy(orientation)
        }
    })
})
world.onPlayerJoin(({entity})=>{
    entity.enableDamage = true;
    entity.onDie(async()=>{
        world.say(`${entity.player.name} 被袭击身亡, 3秒后复活`)
        await sleep(3000)
        
        entity.position.x = Math.random()*127
        entity.position.z = Math.random()*127
        entity.position.y = 100
        await sleep(100) 
        entity.hp = entity.maxHp 
    })
})
world.onClick(({entity})=>{
    entity.hurt(10) 
})
