import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AdminDashboard from "./admin/AdminDashboard";
import { installApiBridge } from "./api-bridge";
import "./globals.css";
installApiBridge();
function AdminApp(){
  const [ready,setReady]=useState(false),[user,setUser]=useState("admin"),[pass,setPass]=useState(""),[error,setError]=useState("");
  useEffect(()=>{fetch("/api/admin/offers").then(r=>setReady(r.ok));},[]);
  async function login(e:React.FormEvent){e.preventDefault();setError("");const r=await fetch("../api.php?action=admin_login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({user,pass})}),d=await r.json();if(r.ok)setReady(true);else setError(d.error||"Đăng nhập không thành công");}
  if(ready)return <AdminDashboard user={user}/>;
  return <main className="admin-login"><form onSubmit={login}><span>LUCKY SPIN</span><h1>Admin Login</h1><p>Đăng nhập để quản lý toàn bộ vòng quay.</p><label>Tài khoản<input value={user} onChange={e=>setUser(e.target.value)} autoFocus/></label><label>Mật khẩu<input type="password" value={pass} onChange={e=>setPass(e.target.value)}/></label>{error&&<div>{error}</div>}<button>ĐĂNG NHẬP</button></form></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><AdminApp /></React.StrictMode>);
