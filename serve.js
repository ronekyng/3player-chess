// 极简静态文件服务器（仅本地演示用）：只监听本机回环地址，带路径穿越防护
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = __dirname;
const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".png":"image/png",".md":"text/plain; charset=utf-8",".dwg":"application/octet-stream"};
http.createServer((req,res)=>{
  try{
    if(req.method!=="GET"&&req.method!=="HEAD"){ res.writeHead(405,{"Content-Type":"text/plain"}); return res.end("method not allowed"); }
    let urlPath;
    try{ urlPath = decodeURIComponent(req.url.split("?")[0]); }
    catch{ res.writeHead(400,{"Content-Type":"text/plain"}); return res.end("bad request"); } // 畸形百分号编码
    if(urlPath.includes("\0")){ res.writeHead(400,{"Content-Type":"text/plain"}); return res.end("bad request"); }
    let fp = path.join(root, urlPath === "/" ? "index.html" : urlPath);
    // 前缀必须到路径分隔符，防止逃入 3player-chess* 等同级目录
    if(fp!==root && !fp.startsWith(root+path.sep)){ res.writeHead(403); return res.end(); }
    fs.readFile(fp,(err,data)=>{
      if(err){ res.writeHead(404); return res.end("not found"); }
      res.writeHead(200,{"Content-Type":types[path.extname(fp).toLowerCase()]||"application/octet-stream"});
      res.end(req.method==="HEAD"?undefined:data);
    });
  }catch{ // 兜底：任何单请求异常都不允许杀死进程
    try{ res.writeHead(500); }catch{}
    res.end();
  }
}).listen(8642,"127.0.0.1",()=>console.log("serving on http://127.0.0.1:8642"));
