// ===== 测试：三轴三人象棋核心规则（8×8 角隅布阵，直接加载共享规则引擎 chess-rules.js） =====
// 运行：node rules-test.js
const R = require("./chess-rules.js");
const {TYPE,AXIS_COL,pieces,initPieces,legalMoves,allLegalMoves,inCheck,onAxis,applyMove,eliminatePlayer} = R;

let pass=0, fail=0;
function assert(name,cond){ if(cond){pass++;console.log("  ✓ "+name);} else {fail++;console.log("  ✗ FAIL: "+name);} }
function put(type,owner,plane,col,rank,exile=false){ pieces.push({type,owner,plane,col,rank,isExiled:exile}); }
function clearAll(){ pieces.length=0; }
function red(){ return pieces.find(p=>p.owner==="red"); }
const key=m=>m.plane+","+m.col+","+m.rank;

// 1. 布局（8×8 角隅布阵）
initPieces();
assert("初始共57枚，每家19枚", pieces.length===57 && ["red","blue","green"].every(o=>pieces.filter(p=>p.owner===o).length===19));
assert("每家1将，且将在(7,7)", ["red","blue","green"].every(o=>{const k=pieces.find(p=>p.owner===o&&p.type==="king");return k&&k.col===7&&k.rank===7;}));
assert("每家7兵（col1/rank1 L形线）", ["red","blue","green"].every(o=>pieces.filter(p=>p.owner===o&&p.type==="pawn").length===7));
assert("每家3炮，边炮在(6,2)(2,6)、中路口炮在(3,3)", ["red","blue","green"].every(o=>[[6,2],[3,3],[2,6]].every(([c,r])=>pieces.some(p=>p.owner===o&&p.type==="cannon"&&p.col===c&&p.rank===r))));
assert("边炮(6,2)(2,6)分别紧随兵(5,1)(1,5)之后一路，中炮(3,3)与边炮不在同一直线", ["red","blue","green"].every(o=>
  [[5,1],[1,5]].every(([c,r])=>pieces.some(p=>p.owner===o&&p.type==="pawn"&&p.col===c&&p.rank===r)&&pieces.some(p=>p.owner===o&&p.type==="cannon"&&p.col===c+1&&p.rank===r+1))
  && !pieces.some(p=>p.owner===o&&p.type==="cannon"&&p.col===3&&(p.rank===2||p.rank===6)) && !pieces.some(p=>p.owner===o&&p.type==="cannon"&&p.rank===3&&(p.col===2||p.col===6))));
assert("开局无子落在连通轴线上（AXIS_COL=0）", pieces.every(p=>!onAxis(p.col,p.rank)));

// 2. 车：直线+吃子+不能跳子+沿连线跨河
clearAll(); put("rook","red","XY",5,5); put("rook","blue","XY",5,1);
let m = legalMoves(red());
let cross = m.filter(x=>x.plane!=="XY");
assert("孤车(5,5)遇敌(5,1)：纵向4(含吃1)+横向7+侧向经弧跨河8格=21", m.length===21 && m.some(x=>x.col===5&&x.rank===1) && cross.length===8 && cross.every(x=>x.plane==="YZ"&&x.col===5));

// 3. 马蹩马腿（二维日）
clearAll(); put("horse","red","XY",4,4); put("pawn","red","XY",3,4); // 蹩左侧腿
m = legalMoves(red());
assert("马(4,4)被(3,4)蹩腿，(2,3)(2,5)不可跳，其余6处可跳", m.length===6 && !m.some(x=>x.col===2&&x.rank===3) && !m.some(x=>x.col===2&&x.rank===5));

// 3b. 马三维跨平面日（弧线展开日，仅轴线上可用，蹩腿只查出发表）
clearAll(); put("horse","red","XY",5,0);
m = legalMoves(red());
assert("红马(5,0)长腿跨河落XZ(4,1)(6,1)", m.some(x=>x.plane==="XZ"&&x.col===4&&x.rank===1) && m.some(x=>x.plane==="XZ"&&x.col===6&&x.rank===1));
assert("红马(5,0)短腿跨河落XZ(3,0)(7,0)", m.some(x=>x.plane==="XZ"&&x.col===3&&x.rank===0) && m.some(x=>x.plane==="XZ"&&x.col===7&&x.rank===0));
assert("马(5,0)共8处落点（4二维日+4三维日），无重复", m.length===8 && new Set(m.map(key)).size===m.length);
clearAll(); put("horse","red","XY",4,4);
m = legalMoves(red());
assert("马不在轴线上：无任何跨平面落点", m.every(x=>x.plane==="XY"));
clearAll(); put("horse","red","XY",5,0); put("pawn","red","XY",4,0); // 蹩三维日出发面腿
m = legalMoves(red());
assert("三维日被出发面(4,0)蹩腿：无跨平面落点（二维日保留）", !m.some(x=>x.plane!=="XY") && m.some(x=>x.col===6&&x.rank===2));

// 4. 象：塞象眼 + 禁踏连通轴线（角隅版"不过河"）
clearAll(); put("elephant","red","XY",5,5);
m = legalMoves(red());
assert("象(5,5)独立时有4处落点", m.length===4);
put("pawn","red","XY",6,6); // 塞(7,7)象眼
m = legalMoves(red());
assert("象(5,5)被(6,6)塞眼后剩3处，不可跳(7,7)", m.length===3 && !m.some(x=>x.col===7&&x.rank===7));
clearAll(); put("elephant","red","XY",3,3);
m = legalMoves(red());
assert("象(3,3)可入近枢纽格(1,1)(5,1)(1,5)(5,5)", m.length===4 && m.some(x=>x.col===1&&x.rank===1) && m.some(x=>x.col===5&&x.rank===1));
clearAll(); put("elephant","red","XY",2,2);
m = legalMoves(red());
assert("象(2,2)禁踏轴线：四个目标中仅(4,4)合法", m.length===1 && m[0].col===4 && m[0].rank===4);

// 5. 兵未过河：仅朝枢纽前进（-col 或 -rank），无横移
clearAll(); put("pawn","red","XY",4,4);
m = legalMoves(red());
assert("兵(4,4)未踏上轴线仅(3,4)(4,3)两处，无横移", m.length===2 && m.some(x=>x.col===3&&x.rank===4) && m.some(x=>x.col===4&&x.rank===3));

// 6. 兵过河：踏入对方棋盘河界线（跨出原生平面）才判定过河（§3.5，持久状态 isExiled）
clearAll(); put("pawn","red","XY",2,2);
m = legalMoves(red());
assert("兵(2,2)未踏上轴线：仅前进2处、无横移", m.length===2 && m.some(x=>x.col===1&&x.rank===2) && m.some(x=>x.col===2&&x.rank===1));
clearAll(); put("pawn","red","XY",2,0);
m = legalMoves(red());
assert("兵(2,0)在本板轴线上尚未过河：仅前进2处（XY(1,0)+跨河XZ(2,0)）、无横移", m.length===2 && m.some(x=>x.col===1&&x.rank===0) && m.some(x=>x.plane==="XZ"&&x.col===2&&x.rank===0) && !m.some(x=>x.col===1&&x.rank===1));
clearAll(); put("pawn","red","XY",2,1);
const pw = red();
applyMove(pw,{plane:"XY",col:2,rank:0}); // 踏上本板轴线：尚未过河
assert("兵踏上本板轴线不算过河（isExiled 仍为 false）", pw.isExiled===false && legalMoves(pw).length===2);
applyMove(pw,{plane:"XZ",col:2,rank:0}); // 前进跨河 → 踏入对方（蓝）棋盘河界线，判定过河
assert("兵跨河踏入对方河界线即过河（isExiled 置位）", pw.isExiled===true);
m = legalMoves(pw);
assert("离乡兵在XZ(2,0)：前进XZ(1,0)+横移XZ(1,1)，禁回原生平面", m.length===2 && m.some(x=>x.col===1&&x.rank===0) && m.some(x=>x.col===1&&x.rank===1) && m.every(x=>x.plane==="XZ"));
applyMove(pw,{plane:"XZ",col:1,rank:1}); // 横移离开轴线（持久状态）
m = legalMoves(pw);
assert("过河兵离开轴线后仍保持横移（持久过河）", m.some(x=>x.col===2&&x.rank===0) && m.some(x=>x.col===0&&x.rank===2));

// 7. 炮吃子需炮架
clearAll(); put("cannon","red","XY",5,5); put("pawn","blue","XY",5,1);
m = legalMoves(red());
assert("炮(5,5)无炮架不能吃XY(5,1)", !m.some(x=>x.plane==="XY"&&x.col===5&&x.rank===1));
put("pawn","red","XY",5,3);
m = legalMoves(red());
assert("炮隔(5,3)炮架可吃(5,1)", m.some(x=>x.col===5&&x.rank===1));

// 8. 车沿连线跨河：虚线弧连接的线是一条线
clearAll(); put("rook","red","XY",5,2);
m = legalMoves(red());
cross = m.filter(x=>x.plane!=="XY");
assert("车(5,2)沿列线跨河到XZ(5,0..7)、沿横线跨河到YZ(col2,rank0..7)共16处", cross.length===16 && cross.filter(x=>x.plane==="XZ").every(x=>x.col===5) && cross.filter(x=>x.plane==="YZ").every(x=>x.col===2) && m.length===30);

// 8b. 炮隔河吃子：炮架可停在河这岸
clearAll(); put("cannon","red","XY",5,2); put("pawn","red","XY",5,0); put("pawn","blue","XZ",5,1);
m = legalMoves(red());
assert("炮隔(5,0)炮架跨河吃XZ(5,1)", m.some(x=>x.plane==="XZ"&&x.col===5&&x.rank===1));

// 9. 兵沿直线跨河 + 离乡不能沿连线回原生平面（经 applyMove 自然产生离乡状态）
clearAll(); put("pawn","red","XY",3,0);
const pw2 = red();
m = legalMoves(pw2);
assert("兵(3,0)沿连线跨河到XZ(3,0)", m.some(x=>x.plane==="XZ"&&x.col===3&&x.rank===0));
applyMove(pw2,{plane:"XZ",col:3,rank:0}); // 跨河 → 离乡
m = legalMoves(pw2);
assert("离乡兵(3,0)不能沿连线回XY，可前进侧移", pw2.isExiled===true && !m.some(x=>x.plane==="XY") && m.length===2 && m.some(x=>x.col===2&&x.rank===0) && m.some(x=>x.col===2&&x.rank===1));

// 10. 九宫与将/士（§3.1：将沿"田"+"米"8向随意移动；士只能沿网格移动，不可沿米字）
clearAll(); put("advisor","red","XY",7,6);
m = legalMoves(red());
assert("士(7,6)仅可直行至(7,5)(6,6)(7,7)，不可沿米字斜行", m.length===3 && m.some(x=>x.col===7&&x.rank===5) && m.some(x=>x.col===6&&x.rank===6) && m.some(x=>x.col===7&&x.rank===7) && !m.some(x=>x.col===6&&x.rank===7) && !m.some(x=>x.col===6&&x.rank===5));
clearAll(); put("king","red","XY",6,6);
m = legalMoves(red());
assert("将(6,6)沿田+米8向，共8处落点", m.length===8 && new Set(m.map(key)).size===8 && m.some(x=>x.col===7&&x.rank===7) && m.some(x=>x.col===5&&x.rank===5) && m.some(x=>x.col===7&&x.rank===5) && m.some(x=>x.col===5&&x.rank===7));
clearAll(); put("king","red","XY",7,7);
m = legalMoves(red());
assert("将(7,7)角隅仅3处落点，不出九宫", m.length===3 && m.some(x=>x.col===6&&x.rank===6) && m.some(x=>x.col===6&&x.rank===7) && m.some(x=>x.col===7&&x.rank===6) && m.every(x=>x.col>=5&&x.rank>=5));
clearAll(); put("king","red","XY",6,6); put("pawn","red","XY",7,7); put("pawn","red","XY",5,5);
m = legalMoves(red());
assert("将(6,6)被己方子占(7,7)(5,5)后剩6处落点", m.length===6 && !m.some(x=>x.col===7&&x.rank===7) && !m.some(x=>x.col===5&&x.rank===5));

// 10b. 出局清算（§4.2.3/§4.5：将士象拔掉，兵马车炮归将军者统领）
clearAll();
put("king","red","XY",7,7); put("advisor","red","XY",7,6); put("elephant","red","XY",7,5);
put("rook","red","XY",7,3); put("horse","red","XY",7,4); put("cannon","red","XY",6,2); put("pawn","red","XY",5,1);
put("king","blue","XZ",7,7);
const before=pieces.length;
const res=eliminatePlayer("red","blue");
assert("出局清算：将士象3枚拔掉（pulled=3）", res.pulled===3 && pieces.length===before-3);
assert("出局清算：兵马车炮4枚归将军者blue统领（位置不变）", res.transferred===4 && pieces.every(p=>p.owner!=="red")
  && ["rook","horse","cannon","pawn"].every(t=>pieces.some(p=>p.owner==="blue"&&p.type===t))
  && pieces.find(p=>p.type==="rook").col===7 && pieces.find(p=>p.type==="rook").rank===3);

// 11. 将军判定（仅同平面）
clearAll(); put("king","red","XY",7,7); put("rook","blue","XY",7,2);
assert("同平面蓝车(7,2)将军红将(7,7)", inCheck("red")===true);

// 12. 跨平面棋子不威胁将
clearAll(); put("king","blue","XZ",7,7); put("rook","red","XY",7,2);
assert("XY平面红车不威胁XZ平面蓝将", inCheck("blue")===false);

// 13. 被将军时必须应将（垫将）
clearAll(); put("king","red","XY",7,7); put("rook","blue","XY",7,2); put("rook","red","XY",2,3);
m = legalMoves(pieces.find(p=>p.owner==="red"&&p.type==="rook"&&p.col===2));
assert("被将军时红车仅可垫将(7,3)一着", m.length===1 && m[0].col===7 && m[0].rank===3);

// 14. 将死判定
clearAll(); put("king","red","XY",7,7);
put("rook","blue","XY",7,2); put("rook","blue","XY",6,2);
assert("将死局面：红被将军且无合法走法", inCheck("red") && allLegalMoves("red").length===0);

// 15. 不变量：跨河段只能从连通轴线（col=0/rank=0）发起——够不到轴线的棋子无跨平面走法
clearAll();
put("rook","red","XY",5,5); put("pawn","red","XY",0,5); put("pawn","red","XY",5,4); // 封锁(0,5)与纵向通路
m = legalMoves(pieces.find(p=>p.type==="rook"));
assert("不变量：车(5,5)被封锁够不到轴线，无任何跨平面走法", m.every(x=>x.plane==="XY"));
clearAll();
put("rook","red","XY",5,5); put("pawn","red","XY",5,4); // 保留(0,5)通路
m = legalMoves(pieces.find(p=>p.type==="rook"));
assert("不变量：车(5,5)滑行至轴线(0,5)后经弧跨河到YZ", m.some(x=>x.plane==="YZ"));

console.log("\n结果: "+pass+" 通过, "+fail+" 失败");
if(fail>0) process.exit(1);
