import fs from "node:fs/promises";
const port = Number(process.argv[2] || 42477);
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.seq = 0;
    this.events = [];
    this.ready = new Promise((r, j) => {
      this.ws.onopen = r;
      this.ws.onerror = j;
    });
    this.ws.onmessage = (e) => {
      let d = JSON.parse(e.data);
      if (d.id) {
        let p = this.pending.get(d.id);
        this.pending.delete(d.id);
        d.error ? p.reject(d.error) : p.resolve(d.result);
      } else this.events.push(d);
    };
  }
  async call(method, params = {}) {
    await this.ready;
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    this.ws.close();
  }
}
const targets = await (await fetch(`http://localhost:${port}/json`)).json();
const target =
  targets.find((t) => t.url.includes("check=1")) ||
  targets.find((t) => t.type === "page");
if (!target) throw Error("Open a separate browser tab with ?check=1");
const c = new CDP(target.webSocketDebuggerUrl);
await c.call("Runtime.enable");
await c.call("Page.enable");
await c.call("Network.enable");
await c.call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await c.call("Page.navigate", {
  url: new URL("./drone-autonomy-atlas.html?check=1", import.meta.url).href,
});
async function run(expression) {
  let r = await c.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
for (let i = 0; i < 40; i++) {
  if (
    await run(
      'typeof S!=="undefined"&&document.querySelectorAll(".node").length>0',
    )
  )
    break;
  await new Promise((r) => setTimeout(r, 100));
}
await run("document.fonts.ready");
let tests = [];
function check(name, pass) {
  tests.push({ name, pass: !!pass });
  if (!pass) throw Error(name);
}
check(
  "Two modes and all assembly clusters render",
  await run(
    'document.querySelectorAll("[data-mode]").length===2 && SC.frames.length===D.canvas.assemblyGroups.reduce((n,g)=>n+g.projects.length,0)',
  ),
);
check(
  "Project identity is unique; no internal directory nodes",
  await run(
    'new Set(D.projects.map(p=>p.id)).size===D.projects.length && D.projects.every(p=>!p.repo.includes("/tree/")&&!p.repo.includes("/blob/"))',
  ),
);
check(
  "Every edge resolves to a project and has a source",
  await run(
    'D.edges.every(e=>P.has(e.a)&&P.has(e.b)&&e.source.startsWith("https://"))',
  ),
);
check(
  "Removed subject absent from embedded dataset",
  await run(
    '!new RegExp("frigate|cctv|\\\\bnvr\\\\b","i").test(JSON.stringify(D))',
  ),
);
check(
  "CERLAB exposes all nine separate module repositories",
  await run(
    'SC.frames.find(f=>f.id==="cerlab").ids.filter(id=>P.get(id).repo.startsWith("https://github.com/Zhefan-Xu/")&&id!=="cerlab").length===9',
  ),
);
check(
  "Some component nodes occur in several assembly contexts",
  await run('SC.nodes.filter(n=>n.id==="px4").length>2'),
);
check(
  "Initial camera fits a readable assembly",
  await run("S.cam.k>=.52 && S.cam.k<=1.12"),
);
await run("selectProject('cerplan','cerlab');revealConnections('cerplan')");
check(
  "Unfolding a component adds project dependencies inside its assembly",
  await run(
    'S.scene==="landscape" && S.assemblyExpansions.cerlab.includes("cerplan") && SC.frames.find(f=>f.id==="cerlab").ids.includes("octo")',
  ),
);
await run("revealConnections('cerplan')");
check(
  "Expanded dependency level collapses",
  await run('!S.assemblyExpansions.cerlab.includes("cerplan")'),
);
await run(
  "focusAssembly('mrs');selectProject('mrscore','mrs');revealConnections('mrscore')",
);
check(
  "A nested bundle unfolds independent subprojects",
  await run('SC.frames.find(f=>f.id==="mrs").ids.includes("mrscontrol")'),
);
await run(
  "selectProject('vins','fastdrone');document.querySelector('[data-action=close-inspector]').click()",
);
check(
  "Inspector closes without leaving the canvas",
  await run('S.selected===null && document.querySelector("#inspector").hidden'),
);
await run("switchMode('focused')");
check(
  "Focused landscape starts with independent points",
  await run(
    'S.mode==="focused" && SC.frames.length===0 && SC.edges.length===0 && SC.nodes.length===D.projects.filter(p=>p.views.includes("focused")).length',
  ),
);
await run("locate('ego');revealConnections('ego')");
check(
  "Focused project opens a real relationship neighborhood",
  await run(
    'S.scene==="neighborhood" && S.root==="ego" && SC.edges.length>0 && SC.nodes.some(n=>n.id==="fast")',
  ),
);
await run("goBack()");
check(
  "Back restores focused landscape",
  await run('S.scene==="landscape" && S.mode==="focused"'),
);
await run("locate('super');focusAssembly('super')");
check(
  "Hybrid project is a single record in both modes",
  await run(
    'P.get("super").views.length===2 && S.mode==="assembled" && S.selected==="super"',
  ),
);
await run(
  "const checkEdge=D.edges.find(e=>e.type==='Code reuse');showEdge(checkEdge.id)",
);
check(
  "Edge evidence opens with typed explanation",
  await run(
    'document.querySelector("#sheet").open && document.querySelector("#sheet-content").innerText.includes("Code reuse") && !!document.querySelector("#sheet-content a[href^=https]")',
  ),
);
await run("closeSheet()");
await run("S.types.add('Research lineage');S.types.add('Evaluation');draw()");
check(
  "Research and evaluation overlays retain their distinct types",
  await run(
    'SC.edges.some(e=>e.edge.type==="Research lineage") && SC.edges.some(e=>e.edge.type==="Evaluation")',
  ),
);
await run("S.types=new Set(['Uses','Optional','Code reuse']);draw()");
await run(
  'openFinder();document.querySelector("#finder-input").value="NanoMap";document.querySelector("#finder-input").dispatchEvent(new Event("input",{bubbles:true}))',
);
check(
  "Search spans complete project inventory",
  await run(
    'document.querySelector("#finder-results").innerText.includes("NanoMap")',
  ),
);
await run('document.querySelector("#finder-results .result").click()');
check(
  "Search locates the project and closes search",
  await run(
    'S.selected==="nanomap" && !document.querySelector("#finder").open',
  ),
);
await run(
  "S.compare=[];toggleCompare('cerlab');toggleCompare('mrs');toggleCompare('ntnu');toggleCompare('super');toggleCompare('ego');openComparison()",
);
check(
  "Contextual comparison caps at four projects",
  await run(
    'S.compare.length===4 && document.querySelectorAll(".compare-table thead th").length===5',
  ),
);
await run("document.querySelector('[data-compare=\"mrs\"]').click()");
check("Comparison removal works", await run("S.compare.length===3"));
await run("closeSheet()");
await run("openAudit('C07')");
check(
  "Audit is a secondary sheet with direct claim focus",
  await run('document.querySelector("#claim-C07").open && S.sheet==="audit"'),
);
await run("S.auditVerdict='Contradicted';renderAudit()");
check(
  "Audit filters correctly",
  await run('document.querySelectorAll(".claim").length===2'),
);
await run("closeSheet()");
await run("openLibrary();S.libraryQuery='zzzzzz-nothing';renderLibrary()");
check(
  "All-record library provides a meaningful empty state",
  await run('!!document.querySelector("#sheet-content .empty")'),
);
await run("S.libraryQuery='';S.libraryScope='reference';renderLibrary()");
check(
  "Reference-only records remain discoverable",
  await run(
    'document.querySelector("#sheet-content").innerText.includes("No-GPS")',
  ),
);
await run("closeSheet()");
await run("openMethod()");
check(
  "Methodology explains project identity and inspection limits",
  await run(
    'document.querySelector("#sheet-content").innerText.includes("Internal packages")',
  ),
);
await run("closeSheet()");
await run(
  "S.selected=null;S.index=true;S.mode='assembled';S.scene='landscape';S.context='cerlab';S.group='navigation';draw();fitCurrent()",
);
const before = await run("({...S.cam})");
await c.call("Input.dispatchMouseEvent", {
  type: "mouseWheel",
  x: 780,
  y: 450,
  deltaX: 0,
  deltaY: -100,
});
await new Promise((r) => setTimeout(r, 80));
check("Wheel zoom changes the real camera", await run(`S.cam.k>${before.k}`));
const anchor = await run("({x:(780-S.cam.x)/S.cam.k,y:(373-S.cam.y)/S.cam.k})");
await c.call("Input.dispatchMouseEvent", {
  type: "mouseWheel",
  x: 780,
  y: 450,
  deltaX: 0,
  deltaY: 100,
});
await new Promise((r) => setTimeout(r, 80));
const after = await run("({x:(780-S.cam.x)/S.cam.k,y:(373-S.cam.y)/S.cam.k})");
check(
  "Zoom remains anchored under the pointer",
  Math.abs(anchor.x - after.x) < 0.01 && Math.abs(anchor.y - after.y) < 0.01,
);
await run("fitRect(SC.bounds,{all:true})");
const panStart = await run("({...S.cam})");
await c.call("Input.dispatchMouseEvent", {
  type: "mousePressed",
  x: 950,
  y: 580,
  button: "left",
  clickCount: 1,
});
await c.call("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: 1010,
  y: 620,
  button: "left",
  buttons: 1,
});
await c.call("Input.dispatchMouseEvent", {
  type: "mouseReleased",
  x: 1010,
  y: 620,
  button: "left",
  clickCount: 1,
});
await new Promise((r) => setTimeout(r, 80));
check(
  "Pointer drag pans the canvas",
  await run(
    `Math.abs(S.cam.x-(${panStart.x}))>=50 && Math.abs(S.cam.y-(${panStart.y}))>=30`,
  ),
);
await run('document.querySelector("#canvas").focus()');
const keyBefore = await run("S.cam.x");
await c.call("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "ArrowLeft",
  code: "ArrowLeft",
  windowsVirtualKeyCode: 37,
});
await c.call("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "ArrowLeft",
  code: "ArrowLeft",
  windowsVirtualKeyCode: 37,
});
check("Keyboard can pan the canvas", await run(`S.cam.x>${keyBefore}`));
await c.call("Emulation.setTouchEmulationEnabled", {
  enabled: true,
  maxTouchPoints: 2,
});
const pinchBefore = await run("S.cam.k");
await c.call("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    { x: 650, y: 450, id: 1 },
    { x: 850, y: 450, id: 2 },
  ],
});
await c.call("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [
    { x: 600, y: 450, id: 1 },
    { x: 900, y: 450, id: 2 },
  ],
});
await c.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await new Promise((r) => setTimeout(r, 80));
check("Two-finger pinch zooms the canvas", await run(`S.cam.k>${pinchBefore}`));
await c.call("Emulation.setTouchEmulationEnabled", { enabled: false });
async function shot(name, w, h) {
  await c.call("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: w < 500,
  });
  await new Promise((r) => setTimeout(r, 200));
  await run(
    'document.querySelector("#toast").hidden=true;document.activeElement?.blur();document.fonts.ready',
  );
  const r = await c.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    "research/" + name + ".png",
    Buffer.from(r.data, "base64"),
  );
}
await run(
  "S.mode='assembled';S.scene='landscape';S.context='cerlab';S.group='navigation';S.selected=null;S.index=true;draw();fitCurrent()",
);
await shot("preview-desktop", 1440, 1000);
await run("focusAssembly('fastdrone')");
await shot("preview-inspector", 1440, 1000);
await run(
  "switchMode('focused');S.selected=null;S.index=true;draw();introduceGroup()",
);
await shot("preview-focused", 1440, 1000);
await run("locate('ego');revealConnections('ego')");
await shot("preview-neighborhood", 1440, 1000);
await run(
  "S.mode='assembled';S.scene='landscape';S.context='fastdrone';S.group='navigation';S.selected=null;S.index=false;draw();fitCurrent()",
);
await shot("preview-mobile", 390, 844);
check(
  "Mobile has no page-level overflow",
  await run(
    "document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight",
  ),
);
await run("selectProject('vins','fastdrone')");
await shot("preview-mobile-details", 390, 844);
check(
  "Mobile inspector remains within viewport",
  await run(
    '(()=>{const r=document.querySelector("#inspector").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.top>=100})()',
  ),
);
await run("openAudit('C07')");
await shot("preview-audit", 1440, 1000);
await run("closeSheet();openComparison()");
await shot("preview-compare", 1440, 1000);
await run("closeSheet()");
await run("S.selected=null;draw();fitCurrent()");
const essayCamera = await run("JSON.stringify(S.cam)");
await run('document.querySelector("#direction-button").click()');
check(
  "Third tab opens an essay and hides canvas controls",
  await run(
    'directionShown && document.querySelector("#workspace").hidden && !document.querySelector("#direction").hidden && location.hash==="#direction"',
  ),
);
check(
  "Essay is continuous prose with no lists or unfinished markers",
  await run(
    'document.querySelectorAll("#direction p").length>=15 && !document.querySelector("#direction ul,#direction ol") && !document.querySelector("#direction").textContent.includes("__DIRECTION__")',
  ),
);
await shot("preview-direction", 1440, 1000);
await run('document.querySelector("[data-mode=assembled]").click()');
check(
  "Returning to the same canvas preserves its camera",
  await run(
    "!directionShown && JSON.stringify(S.cam)===" + JSON.stringify(essayCamera),
  ),
);
await run("showDirection()");
await shot("preview-direction-mobile", 390, 844);
check(
  "Mobile essay and all three tabs fit the viewport",
  await run(
    'document.documentElement.scrollWidth<=innerWidth && document.querySelector("#direction").scrollWidth<=innerWidth && document.querySelector("#direction-button").getBoundingClientRect().right<=innerWidth',
  ),
);
await run('document.querySelector("#direction").scrollTop=500');
check(
  "Essay scrolls independently",
  await run('document.querySelector("#direction").scrollTop===500'),
);
await c.call("Page.reload");
await new Promise((r) => setTimeout(r, 500));
check(
  "Direct essay URL survives reload",
  await run('directionShown && !document.querySelector("#direction").hidden'),
);
await run('document.querySelector("[data-mode=assembled]").click()');
check(
  "Canvas renders after loading the essay directly",
  await run(
    '!directionShown && SC.nodes.length>0 && !document.querySelector("#workspace").hidden',
  ),
);
await run('showDirection();locate("ego")');
check(
  "Project navigation can leave the essay",
  await run('!directionShown && S.selected==="ego"'),
);
const errors = c.events.filter((e) => e.method === "Runtime.exceptionThrown");
check("No runtime exceptions", errors.length === 0);
const requests = c.events
  .filter((e) => e.method === "Network.requestWillBeSent")
  .map((e) => e.params.request.url)
  .filter((u) => u.startsWith("http"));
check("Standalone atlas makes no network requests", requests.length === 0);
await fs.writeFile(
  "research/browser-checks.json",
  JSON.stringify({ tests, errors, network: requests }, null, 2),
);
console.log(
  JSON.stringify(
    { passed: tests.length, total: tests.length, errors, network: requests },
    null,
    2,
  ),
);
c.close();
