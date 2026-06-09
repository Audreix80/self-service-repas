import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CUTOFF_HOUR = 10;
const CUTOFF_MINUTE = 30;
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const WEEKS = [
  { label:"Semaine du 2 au 6 juin 2025",   key:"2025-W23" },
  { label:"Semaine du 9 au 13 juin 2025",  key:"2025-W24" },
  { label:"Semaine du 16 au 20 juin 2025", key:"2025-W25" },
];
const DEFAULT_MENUS = {
  Lundi:    { A:{starter:"Salade niçoise",main:"Poulet rôti & gratin dauphinois",dessert:"Tarte aux pommes"}, B:{starter:"Soupe de légumes",main:"Lasagnes végétariennes",dessert:"Yaourt nature"} },
  Mardi:    { A:{starter:"Carottes râpées",main:"Saumon en papillote & riz",dessert:"Mousse au chocolat"}, B:{starter:"Taboulé",main:"Quiche lorraine & salade",dessert:"Compote de poires"} },
  Mercredi: { A:{starter:"Melon",main:"Bœuf bourguignon & pâtes",dessert:"Crème brûlée"}, B:{starter:"Betteraves vinaigrette",main:"Curry de légumes & quinoa",dessert:"Fruit de saison"} },
  Jeudi:    { A:{starter:"Œuf mayonnaise",main:"Côte de porc & haricots verts",dessert:"Île flottante"}, B:{starter:"Avocat crevettes",main:"Pizza margherita & mesclun",dessert:"Fromage blanc"} },
  Vendredi: { A:{starter:"Asperges sauce mousseline",main:"Cabillaud & purée maison",dessert:"Paris-Brest"}, B:{starter:"Salade composée",main:"Wok de tofu & nouilles soba",dessert:"Salade de fruits"} },
};

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  navy:"#0F172A", navyLight:"#1E293B",
  orange:"#F97316", orangeLight:"#FFF7ED",
  blue:"#0EA5E9", blueLight:"#F0F9FF",
  white:"#FFFFFF", gray50:"#F8FAFC", gray100:"#F1F5F9",
  gray200:"#E2E8F0", gray400:"#94A3B8", gray600:"#475569",
  green:"#10B981", greenLight:"#F0FDF4",
  purple:"#8B5CF6", purpleLight:"#F5F3FF",
  red:"#EF4444", redLight:"#FEF2F2",
};
const MENU_THEME = { A:{primary:C.orange,light:C.orangeLight}, B:{primary:C.blue,light:C.blueLight} };
const MODE_THEME = {
  self:     {primary:C.green, light:C.greenLight, icon:"🏠",label:"Sur place"},
  emporter: {primary:C.purple,light:C.purpleLight,icon:"🥡",label:"À emporter"},
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function isCutoffPassed() {
  const now = new Date();
  return now.getHours()>CUTOFF_HOUR||(now.getHours()===CUTOFF_HOUR&&now.getMinutes()>=CUTOFF_MINUTE);
}
function getTodayName() {
  return ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"][new Date().getDay()];
}
function isDayLocked(day,weekIdx=0) {
  if(weekIdx>0)return false;
  const ti=DAYS.indexOf(getTodayName()),di=DAYS.indexOf(day);
  return di<ti||(di===ti&&isCutoffPassed());
}
function formatCutoff(){return `${CUTOFF_HOUR}h${CUTOFF_MINUTE.toString().padStart(2,"0")}`;}
function computeStats(weekRes){
  const s={};DAYS.forEach(d=>{s[d]={A:0,B:0,self:0,emporter:0};});
  let tA=0,tB=0,tS=0,tE=0;
  Object.values(weekRes||{}).forEach(r=>{Object.entries(r).forEach(([day,{menu,mode}])=>{
    if(!s[day])return;s[day][menu]++;s[day][mode]++;
    if(menu==="A")tA++;else tB++;if(mode==="self")tS++;else tE++;
  });});
  return{byDay:s,totalA:tA,totalB:tB,totalSelf:tS,totalEmporter:tE};
}
function buildRecapHTML(weekLabel,weekRes,users){
  const stats=computeStats(weekRes);
  const rows=DAYS.map(d=>{const s=stats.byDay[d];return`<tr><td>${d}</td><td style="color:#F97316;font-weight:700">${s.A}</td><td style="color:#0EA5E9;font-weight:700">${s.B}</td><td style="color:#10B981;font-weight:700">${s.self}</td><td style="color:#8B5CF6;font-weight:700">${s.emporter}</td><td style="font-weight:700">${s.A+s.B}</td></tr>`;}).join("");
  const uRows=users.filter(u=>u.role==="user"||u.role==="both").map(u=>{const r=weekRes[u.email]||{};const cells=DAYS.map(d=>r[d]?`<td><span style="background:${MENU_THEME[r[d].menu].primary};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">M${r[d].menu}</span> ${MODE_THEME[r[d].mode].icon}</td>`:`<td style="color:#ccc">—</td>`).join("");return`<tr><td>${u.name}</td>${cells}<td style="font-weight:700">${Object.keys(r).length}</td></tr>`;}).join("");
  return`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Récap ${weekLabel}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#0F172A}h1{color:#F97316}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#0F172A;color:#fff;padding:10px 12px;text-align:left;font-size:12px}td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}tr:nth-child(even){background:#f8fafc}</style></head><body><h1>🍽️ Self-Service — Récapitulatif</h1><p style="color:#94a3b8">${weekLabel} · ${new Date().toLocaleDateString("fr-FR")}</p><h2>Par jour</h2><table><thead><tr><th>Jour</th><th>Menu A</th><th>Menu B</th><th>Sur place</th><th>À emporter</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><h2>Par convive</h2><table><thead><tr><th>Convive</th>${DAYS.map(d=>`<th>${d.slice(0,3)}.</th>`).join("")}<th>Total</th></tr></thead><tbody>${uRows}</tbody></table></body></html>`;
}
function exportCSV(weekLabel,weekRes,users){
  let csv="Convive;"+DAYS.join(";")+";Total\n";
  const stats=computeStats(weekRes);
  users.filter(u=>u.role==="user"||u.role==="both").forEach(u=>{const r=weekRes[u.email]||{};csv+=`${u.name};${DAYS.map(d=>r[d]?`Menu ${r[d].menu} (${r[d].mode==="self"?"Sur place":"À emporter"})`:"—").join(";")};${Object.keys(r).length}\n`;});
  csv+="\nJour;Menu A;Menu B;Sur place;À emporter;Total\n";
  DAYS.forEach(d=>{const s=stats.byDay[d];csv+=`${d};${s.A};${s.B};${s.self};${s.emporter};${s.A+s.B}\n`;});
  return csv;
}
function downloadFile(content,filename,type){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=filename;a.click();URL.revokeObjectURL(u);}
function printRecap(weekLabel,weekRes,users){const w=window.open("","_blank");w.document.write(buildRecapHTML(weekLabel,weekRes,users));w.document.close();setTimeout(()=>w.print(),500);}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({firstName:"",lastName:"",email:"",password:""});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    setError(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setLoading(false);
    if (error) { setError("E-mail ou mot de passe incorrect."); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (profile) onLogin({ ...profile, id: data.user.id });
  };

  const handleRegister = async () => {
    setError("");
    if (!form.firstName.trim()||!form.lastName.trim()) { setError("Prénom et nom obligatoires."); return; }
    if (!form.email.includes("@")) { setError("E-mail invalide."); return; }
    if (form.password.length<6) { setError("Mot de passe trop court (6 caractères min)."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    if (error) { setLoading(false); setError(error.message); return; }
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    await supabase.from("profiles").insert({ id: data.user.id, email: form.email.trim().toLowerCase(), name, role:"user" });
    setLoading(false);
    setSuccess("Compte créé ! Vous pouvez vous connecter.");
    setMode("login");
    setForm(f=>({...f,firstName:"",lastName:""}));
  };

  return (
    <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'Sora',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:"420px",background:C.navyLight,borderRadius:"28px",padding:"36px 32px",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"60px",height:"60px",borderRadius:"18px",background:`linear-gradient(135deg,${C.orange},#fb923c)`,fontSize:"26px",marginBottom:"14px"}}>🍽️</div>
          <h1 style={{color:C.white,fontSize:"22px",fontWeight:700,margin:"0 0 4px"}}>Self-Service</h1>
          <p style={{color:C.gray400,fontSize:"13px",margin:"0 0 8px"}}>Réservation de repas en ligne</p>
          <div style={{background:`${C.orange}22`,border:`1px solid ${C.orange}44`,borderRadius:"10px",padding:"6px 14px",display:"inline-block"}}>
            <span style={{color:C.orange,fontSize:"11px",fontWeight:600}}>⏰ Heure limite : {formatCutoff()}</span>
          </div>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.05)",borderRadius:"12px",padding:"4px",marginBottom:"24px"}}>
          {[["login","Se connecter"],["register","Créer un compte"]].map(([m,label])=>(
            <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("");}} style={{flex:1,padding:"9px",borderRadius:"9px",border:"none",background:mode===m?"rgba(255,255,255,0.12)":"transparent",color:mode===m?C.white:C.gray400,fontWeight:mode===m?700:400,fontSize:"13px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{label}</button>
          ))}
        </div>
        {/* Register extra fields */}
        {mode==="register"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
            {[["firstName","Prénom","Marie"],["lastName","Nom","Dupont"]].map(([k,label,ph])=>(
              <div key={k}>
                <label style={{display:"block",color:C.gray400,fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>{label}</label>
                <input placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}
                  style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:"12px",color:C.white,fontSize:"14px",outline:"none",fontFamily:"'Sora',sans-serif",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
        )}
        {/* Email */}
        <div style={{marginBottom:"14px"}}>
          <label style={{display:"block",color:C.gray400,fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>Adresse e-mail</label>
          <input type="email" placeholder="prenom.nom@exemple.fr" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleRegister())}
            style={{width:"100%",padding:"13px 16px",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${error?"rgba(239,68,68,0.6)":"rgba(255,255,255,0.12)"}`,borderRadius:"12px",color:C.white,fontSize:"14px",outline:"none",fontFamily:"'Sora',sans-serif",boxSizing:"border-box"}}/>
        </div>
        {/* Password */}
        <div style={{marginBottom:"20px"}}>
          <label style={{display:"block",color:C.gray400,fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>Mot de passe</label>
          <input type="password" placeholder={mode==="register"?"6 caractères minimum":"••••••••"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleRegister())}
            style={{width:"100%",padding:"13px 16px",background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:"12px",color:C.white,fontSize:"14px",outline:"none",fontFamily:"'Sora',sans-serif",boxSizing:"border-box"}}/>
        </div>
        {error&&<div style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"10px",padding:"10px 14px",marginBottom:"14px",color:C.red,fontSize:"13px"}}>⚠️ {error}</div>}
        {success&&<div style={{background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:"10px",padding:"10px 14px",marginBottom:"14px",color:C.green,fontSize:"13px"}}>✅ {success}</div>}
        <button onClick={mode==="login"?handleLogin:handleRegister} disabled={loading}
          style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${C.orange},#fb923c)`,border:"none",borderRadius:"13px",color:C.white,fontSize:"15px",fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
          {loading?"…":mode==="login"?"Se connecter":"Créer mon compte"}
        </button>
      </div>
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({day,menuKey,data,onSave,onClose}){
  const [form,setForm]=useState({...data});
  const theme=MENU_THEME[menuKey];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,fontFamily:"'Sora',sans-serif"}}>
      <div style={{background:C.white,borderRadius:"24px 24px 0 0",padding:"28px 24px 36px",width:"100%",maxWidth:"480px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"12px",background:theme.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"18px"}}>{menuKey}</div>
          <div style={{fontWeight:700,fontSize:"16px",color:C.navy}}>{day} — Menu {menuKey}</div>
          <button onClick={onClose} style={{marginLeft:"auto",background:C.gray100,border:"none",borderRadius:"10px",width:"34px",height:"34px",fontSize:"16px",cursor:"pointer"}}>✕</button>
        </div>
        {[["starter","🥗","Entrée"],["main","🍽️","Plat principal"],["dessert","🍮","Dessert"]].map(([k,icon,label])=>(
          <div key={k} style={{marginBottom:"14px"}}>
            <label style={{display:"block",fontSize:"11px",fontWeight:600,color:C.gray600,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.8px"}}>{icon} {label}</label>
            <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:"100%",padding:"12px 14px",borderRadius:"12px",border:`1.5px solid ${C.gray200}`,fontSize:"14px",fontFamily:"'Sora',sans-serif",outline:"none",boxSizing:"border-box",color:C.navy}}/>
          </div>
        ))}
        <div style={{display:"flex",gap:"10px",marginTop:"20px"}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:"12px",border:`1.5px solid ${C.gray200}`,background:C.white,fontWeight:600,fontSize:"14px",cursor:"pointer",fontFamily:"'Sora',sans-serif",color:C.gray600}}>Annuler</button>
          <button onClick={()=>onSave(form)} style={{flex:2,padding:"13px",borderRadius:"12px",border:"none",background:theme.primary,color:"#fff",fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── WEEK NAV ─────────────────────────────────────────────────────────────────
function WeekNav({weekIdx,setWeekIdx}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
      <button onClick={()=>setWeekIdx(i=>Math.max(0,i-1))} disabled={weekIdx===0} style={{background:weekIdx===0?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.15)",border:"none",borderRadius:"8px",color:weekIdx===0?C.gray600:C.white,width:"28px",height:"28px",fontSize:"16px",cursor:weekIdx===0?"default":"pointer"}}>‹</button>
      <span style={{color:C.white,fontSize:"11px",fontWeight:600,textAlign:"center",minWidth:"150px"}}>{WEEKS[weekIdx].label}</span>
      <button onClick={()=>setWeekIdx(i=>Math.min(WEEKS.length-1,i+1))} disabled={weekIdx===WEEKS.length-1} style={{background:weekIdx===WEEKS.length-1?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.15)",border:"none",borderRadius:"8px",color:weekIdx===WEEKS.length-1?C.gray600:C.white,width:"28px",height:"28px",fontSize:"16px",cursor:weekIdx===WEEKS.length-1?"default":"pointer"}}>›</button>
    </div>
  );
}

// ─── USER APP ─────────────────────────────────────────────────────────────────
function UserApp({user,menus,onLogout,showAdminSwitch,onSwitchToAdmin}){
  const [weekIdx,setWeekIdx]=useState(0);
  const [tab,setTab]=useState("reserver");
  const [localSel,setLocalSel]=useState({});
  const [savedRes,setSavedRes]=useState({});
  const [confirmed,setConfirmed]=useState(false);
  const [loading,setLoading]=useState(false);
  const [now,setNow]=useState(new Date());

  const weekKey=WEEKS[weekIdx].key;
  const weekLabel=WEEKS[weekIdx].label;
  const cutoffPassed=isCutoffPassed();
  const minutesLeft=cutoffPassed?0:(CUTOFF_HOUR*60+CUTOFF_MINUTE)-(now.getHours()*60+now.getMinutes());
  const count=Object.keys(localSel).length;

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t);},[]);

  // Load reservations from Supabase
  useEffect(()=>{
    const load=async()=>{
      const {data}=await supabase.from("reservations").select("*").eq("user_email",user.email).eq("week_key",weekKey);
      if(data){
        const res={};
        data.forEach(r=>{res[r.day]={menu:r.menu_key,mode:r.mode};});
        setSavedRes(res);setLocalSel(res);
      }else{setSavedRes({});setLocalSel({});}
    };
    load();
  },[weekIdx,user.email]);

  const handleSelectMenu=(day,menu)=>{
    if(isDayLocked(day,weekIdx))return;
    setLocalSel(prev=>{const cur=prev[day];if(cur?.menu===menu){const n={...prev};delete n[day];return n;}return{...prev,[day]:{menu,mode:cur?.mode||"self"}};});
  };
  const handleToggleMode=(day)=>{
    if(isDayLocked(day,weekIdx))return;
    setLocalSel(prev=>{if(!prev[day])return prev;return{...prev,[day]:{...prev[day],mode:prev[day].mode==="self"?"emporter":"self"}};});
  };

  const handleConfirm=async()=>{
    setLoading(true);
    // Delete old reservations for this week
    await supabase.from("reservations").delete().eq("user_email",user.email).eq("week_key",weekKey);
    // Insert new ones
    const rows=Object.entries(localSel).map(([day,{menu,mode}])=>({
      user_email:user.email, user_name:user.name, week_key:weekKey, day, menu_key:menu, mode
    }));
    if(rows.length>0)await supabase.from("reservations").insert(rows);
    setSavedRes({...localSel});
    setLoading(false);setConfirmed(true);
  };

  const handleCancel=async(day)=>{
    await supabase.from("reservations").delete().eq("user_email",user.email).eq("week_key",weekKey).eq("day",day);
    setSavedRes(prev=>{const n={...prev};delete n[day];return n;});
    setLocalSel(prev=>{const n={...prev};delete n[day];return n;});
  };

  return(
    <div style={{minHeight:"100vh",background:C.gray50,fontFamily:"'Sora',sans-serif",paddingBottom:"100px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      {/* Admin switch banner */}
      {showAdminSwitch&&(
        <div style={{background:C.navyLight,padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <span style={{color:C.gray400,fontSize:"12px"}}>Basculer vers :</span>
          <button onClick={onSwitchToAdmin} style={{padding:"5px 14px",borderRadius:"8px",border:"none",background:C.orange,color:C.white,fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>⚙️ Administration</button>
        </div>
      )}
      {/* Header */}
      <div style={{background:C.navy,padding:"18px 18px 0",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div>
            <div style={{fontSize:"10px",color:C.orange,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase"}}>🍽️ Self-Service</div>
            <h1 style={{color:C.white,fontSize:"18px",fontWeight:700,margin:"3px 0 0"}}>{user.name.split(" ")[0]} 👋</h1>
          </div>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.08)",border:"none",color:C.gray400,padding:"7px 12px",borderRadius:"10px",fontSize:"11px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Déconnexion</button>
        </div>
        <WeekNav weekIdx={weekIdx} setWeekIdx={setWeekIdx}/>
        {weekIdx===0&&(
          <div style={{margin:"10px 0 0",padding:"7px 12px",borderRadius:"10px",background:cutoffPassed?`${C.red}22`:`${C.orange}22`,border:`1px solid ${cutoffPassed?C.red:C.orange}44`,display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"12px"}}>{cutoffPassed?"🔒":"⏰"}</span>
            <span style={{fontSize:"11px",fontWeight:600,color:cutoffPassed?C.red:C.orange}}>
              {cutoffPassed?`Réservations closes depuis ${formatCutoff()}`:`Clôture dans ${minutesLeft} min (${formatCutoff()})`}
            </span>
          </div>
        )}
        <div style={{display:"flex",marginTop:"12px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          {[["reserver","📅 Réserver"],["mesrepas","📋 Mes réservations"]].map(([t,label])=>(
            <button key={t} onClick={()=>{setTab(t);setConfirmed(false);}} style={{padding:"10px 16px",border:"none",background:"transparent",color:tab===t?C.orange:C.gray400,fontWeight:tab===t?700:400,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif",borderBottom:`2px solid ${tab===t?C.orange:"transparent"}`,marginBottom:"-1px"}}>{label}</button>
          ))}
        </div>
      </div>

      {/* TAB RÉSERVER */}
      {tab==="reserver"&&(
        confirmed?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",textAlign:"center"}}>
            <div style={{fontSize:"56px",marginBottom:"14px"}}>🎉</div>
            <h2 style={{color:C.navy,fontSize:"22px",fontWeight:700,margin:"0 0 8px"}}>Réservations confirmées !</h2>
            <p style={{color:C.gray400,marginBottom:"20px",fontSize:"14px"}}>{count} repas pour {weekLabel}</p>
            <button onClick={()=>setTab("mesrepas")} style={{background:C.navy,border:"none",color:C.white,padding:"13px 28px",borderRadius:"14px",fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:"10px"}}>Voir mes réservations →</button>
            <button onClick={()=>setConfirmed(false)} style={{background:"transparent",border:`1.5px solid ${C.gray200}`,color:C.gray600,padding:"11px 24px",borderRadius:"14px",fontWeight:600,fontSize:"13px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Modifier</button>
          </div>
        ):(
          <div style={{padding:"14px"}}>
            {DAYS.map(day=>{
              const locked=isDayLocked(day,weekIdx);
              const sel=localSel[day];
              return(
                <div key={day} style={{background:C.white,borderRadius:"18px",overflow:"hidden",marginBottom:"12px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)",opacity:locked?0.6:1}}>
                  <div style={{padding:"10px 16px",background:locked?C.gray600:sel?.menu?MENU_THEME[sel.menu].primary:C.navy,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{color:"#fff",fontWeight:700,fontSize:"14px"}}>{day}</span>
                    {locked?<span style={{color:"rgba(255,255,255,0.7)",fontSize:"11px"}}>🔒 Close</span>
                      :sel?.menu&&<div style={{display:"flex",gap:"5px"}}>
                        <span style={{background:"rgba(255,255,255,0.2)",color:"#fff",borderRadius:"20px",padding:"2px 9px",fontSize:"10px",fontWeight:700}}>Menu {sel.menu} ✓</span>
                        <span style={{background:"rgba(255,255,255,0.2)",color:"#fff",borderRadius:"20px",padding:"2px 9px",fontSize:"10px"}}>{MODE_THEME[sel.mode].icon}</span>
                      </div>
                    }
                  </div>
                  <div style={{display:"flex"}}>
                    {["A","B"].map((mk,i)=>{
                      const theme=MENU_THEME[mk];const isSel=sel?.menu===mk;const m=menus[day][mk];
                      return(
                        <div key={mk} onClick={()=>!locked&&handleSelectMenu(day,mk)} style={{flex:1,padding:"12px 12px 14px",borderRight:i===0?`1px solid ${C.gray100}`:"none",background:isSel?theme.light:"#fff",cursor:locked?"not-allowed":"pointer",borderBottom:`3px solid ${isSel?theme.primary:"transparent"}`}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"8px"}}>
                            <div style={{width:"24px",height:"24px",borderRadius:"7px",background:isSel?theme.primary:C.gray100,display:"flex",alignItems:"center",justifyContent:"center",color:isSel?"#fff":C.gray400,fontWeight:800,fontSize:"11px"}}>{mk}</div>
                            <span style={{fontWeight:700,fontSize:"11px",color:C.navy}}>Menu {mk}</span>
                          </div>
                          {[["starter","🥗"],["main","🍽️"],["dessert","🍮"]].map(([k,icon])=>(
                            <div key={k} style={{display:"flex",gap:"4px",marginBottom:"3px"}}>
                              <span style={{fontSize:"10px"}}>{icon}</span>
                              <span style={{fontSize:"10px",color:C.gray600,lineHeight:1.4}}>{m[k]}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  {sel?.menu&&!locked&&(
                    <div style={{padding:"8px 12px 12px",borderTop:`1px solid ${C.gray100}`}}>
                      <div style={{fontSize:"10px",color:C.gray400,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"6px"}}>Mode</div>
                      <div style={{display:"flex",gap:"7px"}}>
                        {["self","emporter"].map(m=>{const mt=MODE_THEME[m];const active=sel.mode===m;return(<button key={m} onClick={()=>handleToggleMode(day)} style={{flex:1,padding:"8px",borderRadius:"10px",border:`2px solid ${active?mt.primary:C.gray200}`,background:active?mt.light:C.white,color:active?mt.primary:C.gray400,fontWeight:700,fontSize:"11px",cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>{mt.icon} {mt.label}</button>);})}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* TAB MES RÉSERVATIONS */}
      {tab==="mesrepas"&&(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
            <h2 style={{color:C.navy,fontSize:"17px",fontWeight:700,margin:0}}>Mes réservations</h2>
            <span style={{color:C.gray400,fontSize:"12px"}}>{Object.keys(savedRes).length} repas</span>
          </div>
          {Object.keys(savedRes).length===0?(
            <div style={{textAlign:"center",padding:"48px 24px",color:C.gray400}}>
              <div style={{fontSize:"48px",marginBottom:"12px"}}>📭</div>
              <p style={{fontSize:"14px",margin:"0 0 16px"}}>Aucune réservation pour cette semaine.</p>
              <button onClick={()=>setTab("reserver")} style={{background:C.orange,border:"none",color:C.white,padding:"12px 24px",borderRadius:"12px",fontWeight:700,fontSize:"13px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Réserver maintenant</button>
            </div>
          ):(
            <>
              {DAYS.filter(d=>savedRes[d]).map(day=>{
                const r=savedRes[day];const locked=isDayLocked(day,weekIdx);
                return(
                  <div key={day} style={{background:C.white,borderRadius:"16px",padding:"16px",marginBottom:"10px",boxShadow:"0 2px 10px rgba(0,0,0,0.05)"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <div style={{width:"36px",height:"36px",borderRadius:"10px",background:MENU_THEME[r.menu].primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"14px"}}>{day.slice(0,2)}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:"14px",color:C.navy}}>{day}</div>
                          <div style={{display:"flex",gap:"6px",marginTop:"3px"}}>
                            <span style={{background:MENU_THEME[r.menu].light,color:MENU_THEME[r.menu].primary,borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:700}}>Menu {r.menu}</span>
                            <span style={{background:MODE_THEME[r.mode].light,color:MODE_THEME[r.mode].primary,borderRadius:"20px",padding:"2px 10px",fontSize:"11px",fontWeight:600}}>{MODE_THEME[r.mode].icon} {MODE_THEME[r.mode].label}</span>
                          </div>
                        </div>
                      </div>
                      {!locked&&<button onClick={()=>handleCancel(day)} style={{background:C.redLight,border:`1px solid ${C.red}33`,color:C.red,padding:"6px 12px",borderRadius:"9px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Annuler</button>}
                      {locked&&<span style={{fontSize:"11px",color:C.gray400}}>🔒</span>}
                    </div>
                    <div style={{background:C.gray50,borderRadius:"10px",padding:"10px 12px"}}>
                      {[["starter","🥗"],["main","🍽️"],["dessert","🍮"]].map(([k,icon])=>(
                        <div key={k} style={{display:"flex",gap:"6px",marginBottom:"4px"}}>
                          <span style={{fontSize:"12px"}}>{icon}</span>
                          <span style={{fontSize:"12px",color:C.gray600}}>{menus[day][r.menu][k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(savedRes).length<DAYS.length&&(
                <button onClick={()=>setTab("reserver")} style={{width:"100%",marginTop:"10px",padding:"13px",background:`linear-gradient(135deg,${C.orange},#fb923c)`,border:"none",borderRadius:"13px",color:C.white,fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>+ Ajouter des repas</button>
              )}
            </>
          )}
        </div>
      )}

      {/* CTA confirm */}
      {tab==="reserver"&&!confirmed&&count>0&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"14px 16px 22px",background:`linear-gradient(to top,${C.gray50} 75%,transparent)`}}>
          <button onClick={handleConfirm} disabled={loading} style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,border:"none",borderRadius:"15px",color:"#fff",fontSize:"14px",fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
            {loading?"Enregistrement…":<>Confirmer {count} réservation{count>1?"s":""}<span style={{background:C.orange,borderRadius:"20px",padding:"2px 12px",fontSize:"13px"}}>→</span></>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({user,menus,setMenus,onLogout,showUserSwitch,onSwitchToUser}){
  const [weekIdx,setWeekIdx]=useState(0);
  const [activeDay,setActiveDay]=useState(DAYS[0]);
  const [editing,setEditing]=useState(null);
  const [activeTab,setActiveTab]=useState("overview");
  const [emailSent,setEmailSent]=useState(false);
  const [weekRes,setWeekRes]=useState({});
  const [users,setUsers]=useState([]);
  const [loadingData,setLoadingData]=useState(true);

  const weekKey=WEEKS[weekIdx].key;
  const weekLabel=WEEKS[weekIdx].label;
  const stats=computeStats(weekRes);
  const total=stats.totalA+stats.totalB;
  const realUsers=users.filter(u=>u.role==="user"||u.role==="both");

  // Load reservations
  useEffect(()=>{
    const load=async()=>{
      setLoadingData(true);
      const {data}=await supabase.from("reservations").select("*").eq("week_key",weekKey);
      if(data){
        const res={};
        data.forEach(r=>{if(!res[r.user_email])res[r.user_email]={};res[r.user_email][r.day]={menu:r.menu_key,mode:r.mode};});
        setWeekRes(res);
      }
      setLoadingData(false);
    };
    load();
  },[weekIdx]);

  // Load users
  useEffect(()=>{
    const load=async()=>{
      const {data}=await supabase.from("profiles").select("*");
      if(data)setUsers(data);
    };
    load();
  },[]);

  const handleToggleAdmin=async(u)=>{
    const newRole=u.role==="user"?"both":u.role==="both"?"user":u.role==="admin"?"both":"user";
    await supabase.from("profiles").update({role:newRole}).eq("id",u.id);
    setUsers(prev=>prev.map(p=>p.id===u.id?{...p,role:newRole}:p));
  };

  const handleSaveMenu=async(day,menuKey,form)=>{
    setMenus(p=>({...p,[day]:{...p[day],[menuKey]:form}}));
    // Save to Supabase
    await supabase.from("menus").upsert({week_label:weekLabel,day,menu_key:menuKey,starter:form.starter,main_course:form.main,dessert:form.dessert},{onConflict:"week_label,day,menu_key"});
    setEditing(null);
  };

  return(
    <div style={{minHeight:"100vh",background:C.gray50,fontFamily:"'Sora',sans-serif",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      {showUserSwitch&&(
        <div style={{background:C.navyLight,padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <span style={{color:C.gray400,fontSize:"12px"}}>Basculer vers :</span>
          <button onClick={onSwitchToUser} style={{padding:"5px 14px",borderRadius:"8px",border:"none",background:C.orange,color:C.white,fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>👤 Mes repas</button>
        </div>
      )}
      {/* Topbar */}
      <div style={{background:C.navy,padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:"64px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"36px",height:"36px",borderRadius:"10px",background:`linear-gradient(135deg,${C.orange},#fb923c)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>🍽️</div>
          <div>
            <div style={{color:C.white,fontWeight:700,fontSize:"15px"}}>Self-Service Admin</div>
            <div style={{color:C.gray400,fontSize:"11px"}}>Limite : {formatCutoff()} · {isCutoffPassed()?"🔒 Closes":"🟢 Ouvertes"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <WeekNav weekIdx={weekIdx} setWeekIdx={setWeekIdx}/>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.08)",border:"none",color:C.gray400,padding:"8px 16px",borderRadius:"10px",fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Déconnexion</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <div style={{width:"220px",background:C.navyLight,padding:"24px 16px",borderRight:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          {[{id:"overview",icon:"📊",label:"Vue d'ensemble"},{id:"menus",icon:"📋",label:"Gérer les menus"},{id:"users",icon:"👥",label:"Réservations"},{id:"manage",icon:"🔑",label:"Utilisateurs"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"11px 14px",borderRadius:"12px",background:activeTab===t.id?`${C.orange}22`:"transparent",border:activeTab===t.id?`1px solid ${C.orange}44`:"1px solid transparent",color:activeTab===t.id?C.orange:C.gray400,fontWeight:activeTab===t.id?700:400,fontSize:"13px",cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:"4px",textAlign:"left"}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
          <div style={{marginTop:"24px",borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:"20px"}}>
            <div style={{color:C.gray400,fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"10px"}}>Actions</div>
            {[
              {icon:"🖨️",label:"Imprimer",fn:()=>printRecap(weekLabel,weekRes,users)},
              {icon:"📄",label:"Export PDF",fn:()=>{downloadFile(buildRecapHTML(weekLabel,weekRes,users),`recap-${weekKey}.html`,"text/html");}},
              {icon:"📊",label:"Export Excel",fn:()=>{downloadFile("\uFEFF"+exportCSV(weekLabel,weekRes,users),`recap-${weekKey}.csv`,"text/csv;charset=utf-8");}},
              {icon:emailSent?"✅":"📧",label:emailSent?"Envoyé !":"Envoyer récap",fn:()=>{alert(`📧 Récapitulatif : dans la version finale, un e-mail serait envoyé à ${user.email} chaque jour à ${formatCutoff()}.`);setEmailSent(true);setTimeout(()=>setEmailSent(false),3000);}},
            ].map(a=>(
              <button key={a.label} onClick={a.fn} style={{width:"100%",display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"12px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:C.gray400,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:"6px"}}>{a.icon} {a.label}</button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,overflowY:"auto",padding:"32px"}}>
          {loadingData&&<div style={{textAlign:"center",padding:"48px",color:C.gray400}}>Chargement…</div>}

          {!loadingData&&activeTab==="overview"&&(
            <div>
              <h2 style={{color:C.navy,fontSize:"22px",fontWeight:700,margin:"0 0 6px"}}>Vue d'ensemble</h2>
              <p style={{color:C.gray400,fontSize:"13px",margin:"0 0 24px"}}>{weekLabel}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"14px",marginBottom:"28px"}}>
                {[{label:"Total",value:total,icon:"🍽️",color:C.navy},{label:"Menu A",value:stats.totalA,icon:"🟠",color:C.orange},{label:"Menu B",value:stats.totalB,icon:"🔵",color:C.blue},{label:"Sur place",value:stats.totalSelf,icon:"🏠",color:C.green},{label:"À emporter",value:stats.totalEmporter,icon:"🥡",color:C.purple},{label:"Convives",value:realUsers.length,icon:"👤",color:C.gray600}].map(k=>(
                  <div key={k.label} style={{background:C.white,borderRadius:"16px",padding:"18px 16px",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",borderTop:`3px solid ${k.color}`}}>
                    <div style={{fontSize:"20px",marginBottom:"6px"}}>{k.icon}</div>
                    <div style={{fontSize:"28px",fontWeight:800,color:k.color,letterSpacing:"-1px"}}>{k.value}</div>
                    <div style={{fontSize:"11px",color:C.gray400}}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.white,borderRadius:"14px",padding:"14px 20px",marginBottom:"24px",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <span style={{fontSize:"13px",fontWeight:600,color:C.navy}}>📤 Exporter :</span>
                <button onClick={()=>printRecap(weekLabel,weekRes,users)} style={{padding:"7px 14px",borderRadius:"9px",border:`1.5px solid ${C.navy}`,background:C.white,color:C.navy,fontWeight:600,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>🖨️ Imprimer</button>
                <button onClick={()=>{downloadFile(buildRecapHTML(weekLabel,weekRes,users),`recap-${weekKey}.html`,"text/html");}} style={{padding:"7px 14px",borderRadius:"9px",border:`1.5px solid ${C.red}`,background:C.white,color:C.red,fontWeight:600,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>📄 PDF</button>
                <button onClick={()=>{downloadFile("\uFEFF"+exportCSV(weekLabel,weekRes,users),`recap-${weekKey}.csv`,"text/csv;charset=utf-8");}} style={{padding:"7px 14px",borderRadius:"9px",border:`1.5px solid ${C.green}`,background:C.white,color:C.green,fontWeight:600,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>📊 Excel</button>
              </div>
              <div style={{background:C.white,borderRadius:"20px",padding:"24px 28px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <h3 style={{color:C.navy,fontSize:"15px",fontWeight:700,margin:"0 0 20px"}}>Détail par jour</h3>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:C.gray50}}>{["Jour","Menu A","Menu B","Sur place","À emporter","Total","Répartition"].map((h,i)=><th key={h} style={{textAlign:i===0?"left":"center",padding:"10px 14px",color:C.gray400,fontSize:"11px",fontWeight:700,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {DAYS.map((day,i)=>{
                      const d=stats.byDay[day];const tot=d.A+d.B;const pA=tot?Math.round(d.A/tot*100):0;
                      return(<tr key={day} style={{background:i%2===0?C.white:C.gray50}}>
                        <td style={{padding:"12px 14px",fontWeight:600,fontSize:"14px",color:C.navy}}>{day}</td>
                        <td style={{padding:"12px 14px",textAlign:"center"}}><span style={{padding:"4px 10px",background:`${C.orange}18`,color:C.orange,borderRadius:"20px",fontWeight:700}}>{d.A}</span></td>
                        <td style={{padding:"12px 14px",textAlign:"center"}}><span style={{padding:"4px 10px",background:`${C.blue}18`,color:C.blue,borderRadius:"20px",fontWeight:700}}>{d.B}</span></td>
                        <td style={{padding:"12px 14px",textAlign:"center"}}><span style={{padding:"4px 10px",background:`${C.green}18`,color:C.green,borderRadius:"20px",fontWeight:700}}>{d.self}</span></td>
                        <td style={{padding:"12px 14px",textAlign:"center"}}><span style={{padding:"4px 10px",background:`${C.purple}18`,color:C.purple,borderRadius:"20px",fontWeight:700}}>{d.emporter}</span></td>
                        <td style={{padding:"12px 14px",textAlign:"center",fontWeight:700,color:C.navy}}>{tot}</td>
                        <td style={{padding:"12px 16px",minWidth:"130px"}}>{tot>0?(<div><div style={{height:"7px",borderRadius:"10px",background:`${C.blue}30`,overflow:"hidden",display:"flex"}}><div style={{width:`${pA}%`,background:C.orange}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:"2px"}}><span style={{fontSize:"10px",color:C.orange,fontWeight:600}}>{pA}%A</span><span style={{fontSize:"10px",color:C.blue,fontWeight:600}}>{100-pA}%B</span></div></div>):<span style={{fontSize:"12px",color:C.gray400}}>—</span>}</td>
                      </tr>);
                    })}
                  </tbody>
                  <tfoot><tr style={{borderTop:`2px solid ${C.gray200}`}}><td style={{padding:"12px 14px",fontWeight:700,color:C.navy}}>TOTAL</td><td style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:"17px",color:C.orange}}>{stats.totalA}</td><td style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:"17px",color:C.blue}}>{stats.totalB}</td><td style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:"17px",color:C.green}}>{stats.totalSelf}</td><td style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:"17px",color:C.purple}}>{stats.totalEmporter}</td><td style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:"17px",color:C.navy}}>{total}</td><td/></tr></tfoot>
                </table>
              </div>
            </div>
          )}

          {!loadingData&&activeTab==="menus"&&(
            <div>
              <h2 style={{color:C.navy,fontSize:"22px",fontWeight:700,margin:"0 0 6px"}}>Gérer les menus</h2>
              <p style={{color:C.gray400,fontSize:"13px",margin:"0 0 20px"}}>{weekLabel}</p>
              <div style={{display:"flex",gap:"8px",marginBottom:"20px",overflowX:"auto"}}>
                {DAYS.map(d=><button key={d} onClick={()=>setActiveDay(d)} style={{padding:"8px 16px",borderRadius:"10px",border:"none",flexShrink:0,background:activeDay===d?C.navy:C.white,color:activeDay===d?C.white:C.gray600,fontWeight:activeDay===d?700:500,fontSize:"13px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{d}</button>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
                {["A","B"].map(mk=>{
                  const theme=MENU_THEME[mk];const m=menus[activeDay][mk];const ds=stats.byDay[activeDay];
                  return(<div key={mk} style={{background:C.white,borderRadius:"20px",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                    <div style={{padding:"16px 20px",background:`linear-gradient(135deg,${theme.primary},${mk==="A"?"#fb923c":"#38bdf8"})`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"17px"}}>{mk}</div>
                        <div style={{color:"#fff",fontWeight:700,fontSize:"14px"}}>Menu {mk} — {activeDay}</div>
                      </div>
                      <div style={{textAlign:"right"}}><div style={{color:"#fff",fontWeight:800,fontSize:"22px"}}>{ds[mk]}</div><div style={{color:"rgba(255,255,255,0.75)",fontSize:"10px"}}>commandes</div></div>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      {[["starter","🥗","Entrée"],["main","🍽️","Plat"],["dessert","🍮","Dessert"]].map(([k,icon,label])=>(
                        <div key={k} style={{display:"flex",gap:"10px",marginBottom:"10px"}}>
                          <span style={{fontSize:"15px"}}>{icon}</span>
                          <div><div style={{fontSize:"10px",color:C.gray400,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"2px"}}>{label}</div><div style={{fontSize:"13px",color:C.navy,fontWeight:500}}>{m[k]}</div></div>
                        </div>
                      ))}
                      <button onClick={()=>setEditing({day:activeDay,menuKey:mk})} style={{width:"100%",marginTop:"8px",padding:"10px",background:theme.light,border:`1.5px solid ${theme.primary}33`,borderRadius:"11px",color:theme.primary,fontWeight:700,fontSize:"13px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>✏️ Modifier</button>
                    </div>
                  </div>);
                })}
              </div>
            </div>
          )}

          {!loadingData&&activeTab==="users"&&(
            <div>
              <h2 style={{color:C.navy,fontSize:"22px",fontWeight:700,margin:"0 0 6px"}}>Réservations — {weekLabel}</h2>
              <p style={{color:C.gray400,fontSize:"13px",margin:"0 0 20px"}}>{realUsers.length} convive{realUsers.length>1?"s":""}</p>
              <div style={{background:C.white,borderRadius:"20px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"200px repeat(5,1fr) 70px",background:C.gray50,borderBottom:`1px solid ${C.gray100}`,padding:"12px 20px"}}>
                  <div style={{fontSize:"11px",color:C.gray400,fontWeight:700,textTransform:"uppercase"}}>Convive</div>
                  {DAYS.map(d=><div key={d} style={{fontSize:"11px",color:C.gray400,fontWeight:700,textTransform:"uppercase",textAlign:"center"}}>{d.slice(0,3)}.</div>)}
                  <div style={{fontSize:"11px",color:C.gray400,fontWeight:700,textTransform:"uppercase",textAlign:"center"}}>Total</div>
                </div>
                {realUsers.map((u,i)=>{
                  const res=weekRes[u.email]||{};
                  return(<div key={u.email} style={{display:"grid",gridTemplateColumns:"200px repeat(5,1fr) 70px",padding:"13px 20px",alignItems:"center",background:i%2===0?C.white:C.gray50,borderBottom:`1px solid ${C.gray100}`}}>
                    <div><div style={{fontWeight:600,fontSize:"13px",color:C.navy}}>{u.name}</div><div style={{fontSize:"11px",color:C.gray400}}>{u.email.split("@")[0]}</div></div>
                    {DAYS.map(d=>{const r=res[d];return(<div key={d} style={{textAlign:"center"}}>{r?(<div style={{display:"inline-flex",flexDirection:"column",gap:"2px",alignItems:"center"}}><span style={{padding:"2px 9px",borderRadius:"20px",background:MENU_THEME[r.menu].light,color:MENU_THEME[r.menu].primary,fontWeight:700,fontSize:"11px"}}>M{r.menu}</span><span style={{fontSize:"12px"}}>{MODE_THEME[r.mode].icon}</span></div>):<span style={{color:C.gray200,fontSize:"16px"}}>—</span>}</div>);})}
                    <div style={{textAlign:"center",fontWeight:800,fontSize:"16px",color:Object.keys(res).length===5?C.green:Object.keys(res).length===0?C.gray400:C.orange}}>{Object.keys(res).length}</div>
                  </div>);
                })}
              </div>
            </div>
          )}

          {!loadingData&&activeTab==="manage"&&(
            <div>
              <h2 style={{color:C.navy,fontSize:"22px",fontWeight:700,margin:"0 0 6px"}}>Gérer les utilisateurs</h2>
              <p style={{color:C.gray400,fontSize:"13px",margin:"0 0 24px"}}>{users.filter(u=>u.email!==user.email).length} compte(s) enregistré(s)</p>
              <div style={{background:C.white,borderRadius:"20px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 200px 160px",background:C.gray50,borderBottom:`1px solid ${C.gray100}`,padding:"12px 24px"}}>
                  <div style={{fontSize:"11px",color:C.gray400,fontWeight:700,textTransform:"uppercase"}}>Utilisateur</div>
                  <div style={{fontSize:"11px",color:C.gray400,fontWeight:700,textTransform:"uppercase",textAlign:"center"}}>Rôles</div>
                  <div style={{fontSize:"11px",color:C.gray400,fontWeight:700,textTransform:"uppercase",textAlign:"center"}}>Action</div>
                </div>
                {users.filter(u=>u.email!==user.email).map((u,i)=>{
                  const isAdmin=u.role==="admin"||u.role==="both";
                  const isUser=u.role==="user"||u.role==="both";
                  return(
                    <div key={u.email} style={{display:"grid",gridTemplateColumns:"1fr 200px 160px",padding:"14px 24px",alignItems:"center",background:i%2===0?C.white:C.gray50,borderBottom:`1px solid ${C.gray100}`}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:"14px",color:C.navy}}>{u.name}</div>
                        <div style={{fontSize:"12px",color:C.gray400,marginTop:"2px"}}>{u.email}</div>
                      </div>
                      <div style={{display:"flex",gap:"6px",justifyContent:"center",flexWrap:"wrap"}}>
                        <span style={{padding:"3px 10px",borderRadius:"20px",background:isUser?`${C.blue}18`:C.gray100,color:isUser?C.blue:C.gray400,fontWeight:700,fontSize:"11px"}}>👤 User</span>
                        <span style={{padding:"3px 10px",borderRadius:"20px",background:isAdmin?`${C.orange}18`:C.gray100,color:isAdmin?C.orange:C.gray400,fontWeight:700,fontSize:"11px"}}>⚙️ Admin</span>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <button onClick={()=>handleToggleAdmin(u)} style={{padding:"8px 14px",borderRadius:"10px",border:`1.5px solid ${isAdmin?C.red:C.orange}`,background:isAdmin?C.redLight:C.orangeLight,color:isAdmin?C.red:C.orange,fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                          {isAdmin?"Retirer admin":"Nommer admin"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:"16px",background:C.navyLight,borderRadius:"14px",padding:"14px 18px",display:"flex",gap:"10px"}}>
                <span style={{fontSize:"18px"}}>💡</span>
                <div style={{color:C.gray400,fontSize:"12px",lineHeight:1.6}}>
                  <strong style={{color:C.white}}>Admin</strong> : accès au dashboard uniquement.<br/>
                  <strong style={{color:C.white}}>Les deux rôles</strong> : peut réserver ses repas ET administrer.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {editing&&<EditModal day={editing.day} menuKey={editing.menuKey} data={menus[editing.day][editing.menuKey]} onSave={form=>handleSaveMenu(editing.day,editing.menuKey,form)} onClose={()=>setEditing(null)}/>}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("user");
  const [menus, setMenus] = useState(DEFAULT_MENUS);
  const [authLoading, setAuthLoading] = useState(true);

  // Check existing session on load
  useEffect(()=>{
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) {
          setCurrentUser({ ...profile, id: session.user.id });
          setView(profile.role==="user" ? "user" : "admin");
        }
      }
      setAuthLoading(false);
    };
    checkSession();
  },[]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setView(user.role==="user" ? "user" : "admin");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (authLoading) return (
    <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>🍽️</div>
        <div style={{color:C.gray400,fontSize:"14px"}}>Chargement…</div>
      </div>
    </div>
  );

  if (!currentUser) return <AuthScreen onLogin={handleLogin}/>;

  const isBoth = currentUser.role==="both";
  const isAdmin = currentUser.role==="admin" || currentUser.role==="both";

  if (isAdmin && view==="admin") return (
    <AdminDashboard
      user={currentUser} menus={menus} setMenus={setMenus}
      onLogout={handleLogout}
      showUserSwitch={isBoth}
      onSwitchToUser={()=>setView("user")}
    />
  );

  return (
    <UserApp
      user={currentUser} menus={menus}
      onLogout={handleLogout}
      showAdminSwitch={isBoth||isAdmin}
      onSwitchToAdmin={()=>setView("admin")}
    />
  );
}