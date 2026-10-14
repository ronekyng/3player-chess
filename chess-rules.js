/* =====================================================================
   三轴正交三人象棋 —— 共享规则引擎
   3D 版（index.html）与平面版（index-2d.html）共用同一套规则；
   rules-test.js 直接加载本文件做回归测试，保证"两个版本规则完全一样"。
   棋盘：8×8 角隅布阵；连通轴线 AXIS_COL=0（各板内缘 col=0 / rank=0 线），
   跨河必须从轴线出发，经虚线弧接入相邻棋盘的对应线（连成一条直线）。
   ===================================================================== */
"use strict";

/* ===================== 常量 ===================== */
const COLS=8, ROWS=8;             // 每块棋盘 8×8
const AXIS_COL=0;                 // 连通轴线号：col=0 与 rank=0 的内缘线（河界连通线）
const TYPE={KING:"king",ADVISOR:"advisor",ELEPHANT:"elephant",HORSE:"horse",ROOK:"rook",CANNON:"cannon",PAWN:"pawn"};
const OWNER_PLANE={red:"XY",blue:"XZ",green:"YZ"};
const PLANE_OWNER={XY:"red",XZ:"blue",YZ:"green"};
const PLANES=["XY","XZ","YZ"];
const KNIGHT=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const TYPE_NAME={king:"将",advisor:"士",elephant:"象",horse:"马",rook:"车",cannon:"炮",pawn:"兵"};

/* ===================== 棋子状态 =====================
   {type,owner,plane,col,rank,isExiled}
   isExiled：兵专用，踏入对方棋盘河界线（跨出原生平面）即过河（持久状态），
             获得横移+跨河资格，永久禁回原生平面 */
const pieces=[];
function initPieces(){
  pieces.length=0;
  // 按布置图（8×8）：全军麇集于 (7,7) 角，沿 col7/rank7 两翼排底线，兵炮朝中心枢纽 (0,0) 推进（每方 19 枚）
  const layout=[
    // 底线（L形两翼）：车 马 相 士 将 士 相 马 车
    {t:TYPE.ROOK,c:7,r:3},{t:TYPE.HORSE,c:7,r:4},{t:TYPE.ELEPHANT,c:7,r:5},{t:TYPE.ADVISOR,c:7,r:6},
    {t:TYPE.KING,c:7,r:7},
    {t:TYPE.ADVISOR,c:6,r:7},{t:TYPE.ELEPHANT,c:5,r:7},{t:TYPE.HORSE,c:4,r:7},{t:TYPE.ROOK,c:3,r:7},
    // 3门炮：边炮内缩一路、兵线后1步(6,2)/(2,6)，中路口(3,3)与边炮不在同一直线
    {t:TYPE.CANNON,c:6,r:2},{t:TYPE.CANNON,c:3,r:3},{t:TYPE.CANNON,c:2,r:6},
    // 7兵：col1 与 rank1 上的 L 形前线（每隔一路一位）
    {t:TYPE.PAWN,c:7,r:1},{t:TYPE.PAWN,c:5,r:1},{t:TYPE.PAWN,c:3,r:1},{t:TYPE.PAWN,c:1,r:1},
    {t:TYPE.PAWN,c:1,r:3},{t:TYPE.PAWN,c:1,r:5},{t:TYPE.PAWN,c:1,r:7}
  ];
  for(const plane of PLANES){
    const owner=PLANE_OWNER[plane];
    for(const l of layout) pieces.push({type:l.t,owner,plane,col:l.c,rank:l.r,isExiled:false});
  }
}

/* ===================== 基础判定 ===================== */
function nativePlane(owner){ return OWNER_PLANE[owner]; }
function occupied(plane,col,rank){ return pieces.find(p=>p.plane===plane&&p.col===col&&p.rank===rank); }
function inBoard(col,rank){ return col>=0&&col<=COLS-1&&rank>=0&&rank<=ROWS-1; }
function inPalace(col,rank){ return col>=5&&col<=7&&rank>=5&&rank<=7; }   // 角隅九宫 [5,7]×[5,7]
function onAxis(col,rank){ return col===AXIS_COL||rank===AXIS_COL; }      // 是否在连通轴线上
function removePiece(q){ const i=pieces.indexOf(q); if(i>=0) pieces.splice(i,1); }
function kingAt(c,r,tp){ const q=occupied(tp,c,r); return !!q&&q.type===TYPE.KING; }
function friendlyAt(owner,c,r,tp){ const q=occupied(tp,c,r); return !!q&&q.owner===owner; }

/* 沿 (dc,dr) 的下一格；到内缘轴线沿虚线弧跨河，接到相邻棋盘的对应线（连成一条直线）。
   跨河后方向翻转：在对面板上"远离河"的方向继续（返回值带新的 dc,dr） */
function lineStep(pl,c,r,dc,dr){
  const nc=c+dc, nr=r+dr;
  if(inBoard(nc,nr)) return {plane:pl,col:nc,rank:nr,dc,dr};
  if(dr===-1&&r===AXIS_COL){          // 向前越过界河
    if(pl==="XY") return {plane:"XZ",col:c,rank:AXIS_COL,dc:0,dr:1};   // 红列线 → 蓝列线
    if(pl==="XZ") return {plane:"XY",col:c,rank:AXIS_COL,dc:0,dr:1};   // 蓝列线 → 红列线
    if(pl==="YZ") return {plane:"XY",col:AXIS_COL,rank:c,dc:1,dr:0};   // 绿列线 → 红横线
  }
  if(dc===-1&&c===AXIS_COL){          // 向侧越过界河
    if(pl==="XY") return {plane:"YZ",col:r,rank:AXIS_COL,dc:0,dr:1};   // 红横线 → 绿列线
    if(pl==="XZ") return {plane:"YZ",col:AXIS_COL,rank:r,dc:1,dr:0};   // 蓝横线 → 绿横线
    if(pl==="YZ") return {plane:"XZ",col:AXIS_COL,rank:r,dc:1,dr:0};   // 绿横线 → 蓝横线
  }
  return null;
}

/* 兵过河状态：踏入对方棋盘河界线（即跨出原生平面）判定过河（§3.5/§6）；
   过河为持久状态（isExiled），离乡兵视为已过河（在敌方平面保持横移能力） */
function pawnCrossed(p){
  return p.isExiled||p.plane!==nativePlane(p.owner);
}

/* 三维跨平面日（弧线展开日）：马须站在连通轴线上，蹩马腿只查出发表。
   对每个跨河方向提供两种日形（以红马在 XY(c,0) 面向蓝板为例）：
   - 长腿跨河：沿连续通道 lineStep×2（经弧），再在到达面垂直 ±1 → 落 XZ(c±1,1)
   - 短腿跨河：出发表面垂直 ±2，再 lineStep 一步经弧 → 落 XZ(c±2,0)
   蹩腿点 = 出发表面上与跨河方向垂直的相邻点 (c±1,0)/(0,r±1)，
   被挡则该方向的两个三维日均不可用；到达面无额外判定。 */
function crossHorseTargets(p){
  const res=[],seen=new Set();
  const {owner,plane,col,rank}=p;
  const dirs=[];
  if(rank===AXIS_COL) dirs.push([0,-1]); // 面向"前河"
  if(col===AXIS_COL)  dirs.push([-1,0]); // 面向"侧河"
  const push=(tp,c,r)=>{
    if(!inBoard(c,r)) return;
    const key=tp+","+c+","+r;
    if(seen.has(key)) return;
    seen.add(key);
    if(!friendlyAt(owner,c,r,tp)&&!kingAt(c,r,tp)) res.push({plane:tp,col:c,rank:r});
  };
  for(const [dc,dr] of dirs){
    // 蹩腿（只查出发表）：与跨河方向垂直的相邻点
    const legs=(dr===-1)?[[col+1,rank],[col-1,rank]]:[[col,rank+1],[col,rank-1]];
    if(legs.some(([lc,lr])=>occupied(plane,lc,lr))) continue;
    // 长腿跨河：连续通道两步，再在到达面垂直 ±1
    const s1=lineStep(plane,col,rank,dc,dr);
    if(s1){
      const s2=lineStep(s1.plane,s1.col,s1.rank,s1.dc,s1.dr);
      if(s2){
        const perps=(s2.dc===0)?[[1,0],[-1,0]]:[[0,1],[0,-1]];
        for(const [px,py] of perps) push(s2.plane,s2.col+px,s2.rank+py);
      }
    }
    // 短腿跨河：出发表面垂直 ±2，再经弧一步
    const perpsD=(dr===-1)?[[1,0],[-1,0]]:[[0,1],[0,-1]];
    for(const [px,py] of perpsD){
      const mc=col+2*px, mr=rank+2*py;
      if(!inBoard(mc,mr)) continue;
      const t=lineStep(plane,mc,mr,dc,dr);
      if(t) push(t.plane,t.col,t.rank);
    }
  }
  return res;
}

/* ===================== 走子生成 ===================== */
function pseudoMoves(p){
  const res=[],add=(c,r,tp=p.plane)=>{ if(inBoard(c,r))res.push({plane:tp,col:c,rank:r}); };
  const {type,owner,plane,col,rank}=p;
  const friendly=(c,r,tp)=>friendlyAt(owner,c,r,tp);
  const isKing=(c,r,tp)=>kingAt(c,r,tp);

  if(type===TYPE.KING){
    // 将：角隅九宫内沿"田"+"米"随意移动（§3.1，8 向）
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const tc=col+dx,tr=rank+dy;
      if(inPalace(tc,tr)&&!friendly(tc,tr,plane)&&!isKing(tc,tr,plane)) add(tc,tr);
    }
  }else if(type===TYPE.ADVISOR){
    // 士：只能沿网格移动，不可沿米字（§3.1，仅正交 4 向）
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const tc=col+dx,tr=rank+dy;
      if(inPalace(tc,tr)&&!friendly(tc,tr,plane)&&!isKing(tc,tr,plane)) add(tc,tr);
    }
  }else if(type===TYPE.ELEPHANT){
    for(const [dx,dy] of [[2,2],[2,-2],[-2,2],[-2,-2]]){
      const tc=col+dx,tr=rank+dy;
      const leg=occupied(plane,col+dx/2,rank+dy/2);
      // 象不能过河：禁踏连通轴线（col=0 或 rank=0），保留塞象眼
      if(inBoard(tc,tr)&&!onAxis(tc,tr)&&!leg&&!friendly(tc,tr,plane)&&!isKing(tc,tr,plane)) add(tc,tr);
    }
  }else if(type===TYPE.HORSE){
    // 二维日：传统蹩腿判定，只在出发表面
    for(const [hx,hy] of KNIGHT){
      const tc=col+hx,tr=rank+hy;
      const legCol=Math.abs(hx)===2?col+hx/2:col;
      const legRank=Math.abs(hy)===2?rank+hy/2:rank;
      if(inBoard(tc,tr)&&!occupied(plane,legCol,legRank)&&!friendly(tc,tr,plane)&&!isKing(tc,tr,plane)) add(tc,tr);
    }
    // 三维跨平面日：仅站在连通轴线上可用（弧线展开日）
    if(onAxis(col,rank)) res.push(...crossHorseTargets(p));
  }else if(type===TYPE.ROOK||type===TYPE.CANNON){
    // 车/炮沿直线滑行：经虚线弧越过界河，接入相邻棋盘的对应线（连起来是一条线）
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      let cur={plane,col,rank}, dc=dx, dr=dy, screen=false;
      while(true){
        const nxt=lineStep(cur.plane,cur.col,cur.rank,dc,dr);
        if(!nxt) break;
        const occ=occupied(nxt.plane,nxt.col,nxt.rank);
        if(type===TYPE.ROOK){
          if(occ){ if(occ.owner!==owner&&occ.type!==TYPE.KING) res.push(nxt); break; }
          res.push(nxt);
        }else{ // 炮：隔一子吃（炮架可跨河）
          if(!screen){
            if(occ) screen=true;
            else res.push(nxt);
          }else if(occ){
            if(occ.owner!==owner&&occ.type!==TYPE.KING) res.push(nxt);
            break;
          }
        }
        cur=nxt; dc=nxt.dc; dr=nxt.dr;
      }
    }
  }else if(type===TYPE.PAWN){
    // 前进：朝枢纽方向（-col 或 -rank）；踏上内缘轴线可经虚线弧跨河（离乡兵不回原生平面）
    for(const [dx,dy] of [[-1,0],[0,-1]]){
      const nxt=lineStep(plane,col,rank,dx,dy);
      if(!nxt) continue;
      if(p.isExiled&&nxt.plane!==plane&&nxt.plane===nativePlane(owner)) continue;
      if(!friendly(nxt.col,nxt.rank,nxt.plane)&&!isKing(nxt.col,nxt.rank,nxt.plane)) res.push(nxt);
    }
    if(pawnCrossed(p)){
      // 过河后可横移（沿 col+rank 等值线侧移，永不回退）
      for(const [dx,dy] of [[1,-1],[-1,1]]){
        const tc=col+dx,tr=rank+dy;
        if(inBoard(tc,tr)&&!friendly(tc,tr,plane)&&!isKing(tc,tr,plane)) add(tc,tr);
      }
    }
  }
  return res;
}

/* ===================== 将军判定（仅同平面有效） ===================== */
function threatens(p,tcol,trank){
  const {type,col,rank}=p;
  const dx=tcol-col,dy=trank-rank;
  if(type===TYPE.KING) return Math.abs(dx)<=1&&Math.abs(dy)<=1;          // 将：田+米（8 向）
  if(type===TYPE.ADVISOR) return (dx===0&&Math.abs(dy)===1)||(dy===0&&Math.abs(dx)===1); // 士：仅网格直行
  if(type===TYPE.ELEPHANT){
    if(Math.abs(dx)===2&&Math.abs(dy)===2) return !occupied(p.plane,col+dx/2,rank+dy/2);
    return false;
  }
  if(type===TYPE.HORSE){
    for(const [hx,hy] of KNIGHT){
      if(col+hx===tcol&&rank+hy===trank){
        const lc=Math.abs(hx)===2?col+hx/2:col, lr=Math.abs(hy)===2?rank+hy/2:rank;
        return !occupied(p.plane,lc,lr);
      }
    }
    return false;
  }
  if(type===TYPE.ROOK){
    if(dx!==0&&dy!==0) return false;
    const sx=dx!==0?Math.sign(dx):0, sy=dy!==0?Math.sign(dy):0;
    let c=col+sx,r=rank+sy;
    while(c!==tcol||r!==trank){ if(occupied(p.plane,c,r)) return false; c+=sx;r+=sy; }
    return true;
  }
  if(type===TYPE.CANNON){
    if(dx!==0&&dy!==0) return false;
    const sx=dx!==0?Math.sign(dx):0, sy=dy!==0?Math.sign(dy):0;
    let c=col+sx,r=rank+sy,screen=false;
    while(c!==tcol||r!==trank){
      if(occupied(p.plane,c,r)){ if(screen) return false; screen=true; }
      c+=sx;r+=sy;
    }
    return screen;
  }
  if(type===TYPE.PAWN){
    if(dx===-1&&dy===0) return true;   // 向前（-col，朝枢纽）
    if(dx===0&&dy===-1) return true;   // 向前（-rank，朝枢纽）
    if(pawnCrossed(p)&&((dx===1&&dy===-1)||(dx===-1&&dy===1))) return true; // 过河横移
    return false;
  }
  return false;
}
/* 找出正在将军 owner 的敌子（仅同平面有效，§4.2.1）；未被将军返回 null */
function checkerOf(owner){
  const k=pieces.find(p=>p.type===TYPE.KING&&p.owner===owner);
  if(!k) return null;
  for(const e of pieces){
    if(e.owner===owner) continue;
    if(e.plane!==k.plane) continue; // 跨平面攻击对将无效（硬性铁律）
    if(threatens(e,k.col,k.rank)) return e;
  }
  return null;
}
function inCheck(owner){ return !!checkerOf(owner); }

/* ===================== 合法走子（过滤自送将） ===================== */
function legalMoves(p){
  const out=[];
  for(const m of pseudoMoves(p)){
    const cap=occupied(m.plane,m.col,m.rank);
    const wasPlane=p.plane,wasCol=p.col,wasRank=p.rank,wasExiled=p.isExiled;
    const capIdx=cap?pieces.indexOf(cap):-1;
    if(cap) pieces.splice(capIdx,1);
    p.plane=m.plane;p.col=m.col;p.rank=m.rank;
    if(p.type===TYPE.PAWN&&m.plane!==wasPlane) p.isExiled=true;
    if(!inCheck(p.owner)) out.push(m);
    p.plane=wasPlane;p.col=wasCol;p.rank=wasRank;p.isExiled=wasExiled;
    if(cap) pieces.splice(capIdx,0,cap);
  }
  return out;
}
function allLegalMoves(owner){
  return pieces.filter(p=>p.owner===owner).flatMap(p=>legalMoves(p).map(m=>({p,m})));
}

/* ===================== 执行走子（UI 层调用） =====================
   吃子 + 移子 + 兵的过河/离乡标记；返回被吃棋子或 null */
function applyMove(piece,m){
  const cap=occupied(m.plane,m.col,m.rank);
  if(cap) removePiece(cap);
  const fromPlane=piece.plane;
  piece.plane=m.plane;piece.col=m.col;piece.rank=m.rank;
  if(piece.type===TYPE.PAWN&&m.plane!==fromPlane) piece.isExiled=true;
  return cap;
}
function checkmate(owner){ return inCheck(owner)&&allLegalMoves(owner).length===0; }

/* ===================== 出局清算（§4.2.3 / §4.5） =====================
   被将死者出局：将、士、象拔掉；兵、马、车、炮归将军者统领（位置不变）。
   返回 {pulled, transferred} 供 UI 日志 */
function eliminatePlayer(owner,winner){
  let pulled=0,transferred=0;
  for(let i=pieces.length-1;i>=0;i--){
    const p=pieces[i];
    if(p.owner!==owner) continue;
    if(p.type===TYPE.KING||p.type===TYPE.ADVISOR||p.type===TYPE.ELEPHANT){ pieces.splice(i,1); pulled++; }
    else { p.owner=winner; transferred++; }
  }
  return {pulled,transferred};
}

/* ===================== 导出（node 测试用；浏览器作全局脚本） ===================== */
if(typeof module!=="undefined"&&module.exports){
  module.exports={
    COLS,ROWS,AXIS_COL,TYPE,OWNER_PLANE,PLANE_OWNER,PLANES,KNIGHT,TYPE_NAME,
    pieces,initPieces,nativePlane,occupied,inBoard,inPalace,onAxis,lineStep,pawnCrossed,
    pseudoMoves,threatens,inCheck,checkerOf,legalMoves,allLegalMoves,applyMove,checkmate,
    eliminatePlayer
  };
}
