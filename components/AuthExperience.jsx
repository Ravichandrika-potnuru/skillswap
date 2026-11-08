"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowLeftRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createAuthClient } from "@neon/auth/next";
import InteractiveCharacter from "@/components/InteractiveCharacter";

const authClient = createAuthClient();

function userFriendlyAuthError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  if (/^Choose (Student|Administrator) Login/i.test(message)) return message;
  if (status === 401 || code === "INVALID_EMAIL_OR_PASSWORD") return "The email or password is incorrect.";
  if (status === 502 || status === 503 || code.startsWith("NETWORK_")) return "We’re temporarily unable to sign you in. Please try again.";
  if (error instanceof TypeError && /fetch|network/i.test(message)) return "Unable to connect. Check your internet connection.";
  if (status >= 500) return "Something went wrong. Please try again.";
  return message || "Something went wrong. Please try again.";
}

const titleFor={login:"Welcome to SkillSwap",register:"Create your account",forgot:"Reset your password",verify:"Verify your email",reset:"Choose a new password"};

export default function AuthExperience({initialMode="login"}){
  const [mode,setMode]=useState(initialMode),[role,setRole]=useState("student"),[showPassword,setShowPassword]=useState(false),[activeField,setActiveField]=useState(null),[typing,setTyping]=useState(false),[reactionToken,setReactionToken]=useState(0),[characterFeedback,setCharacterFeedback]=useState("idle"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const submitLock=useRef(false),typingTimer=useRef(null);
  const reduce=useReducedMotion();
  useEffect(()=>()=>window.clearTimeout(typingTimer.current),[]);
  const characterState=characterFeedback==="success"?"success":busy?"submitting":activeField==="password"?(showPassword?"password-visible":"password-focused"):activeField==="email"?(typing?"typing":"email-focused"):characterFeedback==="error"?"error":"idle";
  function noteTyping(){setTyping(true);window.clearTimeout(typingTimer.current);typingTimer.current=window.setTimeout(()=>setTyping(false),620);}
  function blurField(){setActiveField(null);setTyping(false);window.clearTimeout(typingTimer.current);}
  async function submit(e){e.preventDefault();if(submitLock.current)return;submitLock.current=true;setBusy(true);setCharacterFeedback("submitting");setReactionToken((value)=>value+1);setError("");setMessage("");const fd=new FormData(e.currentTarget);const data=Object.fromEntries(fd.entries());
    const token=new URLSearchParams(window.location.search).get("token")||"";
    try{
      if(mode==="login"){
        const result=await authClient.signIn.email({email:String(data.email||"").trim().toLowerCase(),password:String(data.password||""),rememberMe:data.remember==="on"});
        if(result.error)throw new Error(result.error.message||"Email or password is incorrect.");
        const response=await fetch("/api/auth/me",{cache:"no-store"}),out=await response.json();
        if(!response.ok)throw new Error(out.error||"This account does not have a SkillSwap profile yet.");
        if(String(out.user.email||"").trim().toLowerCase()!==String(data.email||"").trim().toLowerCase()){await authClient.signOut();throw new Error("The signed-in account does not match its SkillSwap profile. Contact the administrator.");}
        if(role!==out.user.role){await authClient.signOut();throw new Error(`Choose ${out.user.role==="admin"?"Administrator":"Student"} Login for this account.`);}
        setCharacterFeedback("success");await new Promise((resolve)=>window.setTimeout(resolve,140));location.assign(out.user.role==="admin"?"/admin":out.user.account_status==="approved"?"/dashboard":"/pending");return;
      }
      if(mode==="register"){
        const password=String(data.password||"");
        if(password.length<10)throw new Error("Choose a password with at least 10 characters.");
        if(password!==String(data.confirmPassword||""))throw new Error("Your passwords do not match.");
        const result=await authClient.signUp.email({email:String(data.email||"").trim().toLowerCase(),password,name:String(data.fullName||"").trim()});
        if(result.error)throw new Error(result.error.message||"Unable to create your account.");
        const response=await fetch("/api/auth/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:data.fullName,studentId:data.studentId,department:data.department,academicYear:data.academicYear,bio:data.bio})});
        const out=await response.json();if(!response.ok)throw new Error(out.error||"Your sign-in was created, but your SkillSwap profile could not be completed.");
        await authClient.signOut();setMessage("Account created. You can sign in while an administrator reviews your profile.");setMode("login");return;
      }
      if(mode==="forgot"){
        const result=await authClient.requestPasswordReset({email:String(data.email||"").trim().toLowerCase(),redirectTo:`${window.location.origin}/reset-password`});
        if(result.error)throw new Error(result.error.message||"Password reset could not be requested.");
        setMessage("If the account exists and email delivery is configured, a password reset link has been sent.");return;
      }
      if(mode==="verify"){
        const result=await authClient.verifyEmail({query:{token}});
        if(result.error)throw new Error(result.error.message||"This verification link is invalid or expired.");
        setMessage("Email verified.");return;
      }
      if(mode==="reset"){
        const result=await authClient.resetPassword({token,newPassword:String(data.password||"")});
        if(result.error)throw new Error(result.error.message||"Password could not be reset.");
        setMessage("Password reset successfully.");setMode("login");return;
      }
    }catch(err){setError(mode==="login"?userFriendlyAuthError(err):err.message||"Unable to complete this request.");setCharacterFeedback("error");}finally{setBusy(false);submitLock.current=false;}
  }
  function changeMode(m){setError("");setMessage("");blurField();setCharacterFeedback("idle");setMode(m);if(m==="register")history.replaceState({},"","/register");else if(m==="login")history.replaceState({},"","/");}
  return <main className="auth-page" data-character-state={characterState}>
    <header className="auth-topbar"><Link className="brand" href="/"><span className="brand-mark"><ArrowLeftRight size={23}/></span><b>SkillSwap</b></Link><nav><a href="#home">Home</a><a href="#about">About</a><a href="#features">Features</a><a href="#help">Help</a></nav></header>
    <section className="auth-content">
      <motion.div className="auth-visual" initial={reduce?false:{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{duration:.65}}>
        <div className="hero-art"><Image src="/images/skillswap-student-scene-base.webp" alt="A student learning with a laptop in a cozy armchair" width={1536} height={1024} priority/><InteractiveCharacter state={characterState} reactionToken={reactionToken}/><div className="visual-caption"><span className="caption-icon"><Sparkles size={15}/></span><span>Learn something.<br/><b>Teach something.</b></span></div></div>
        <p className="visual-tagline">Skills grow when shared.</p>
      </motion.div>
      <motion.section className="auth-card" initial={reduce?false:{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.55,delay:.08}}>
        <div className="auth-card-head"><div className="mobile-brand"><span className="brand-mark"><ArrowLeftRight size={20}/></span><b>SkillSwap</b></div><h1>{titleFor[mode]}</h1><p>{mode==="login"?"Exchange skills · Learn together · Grow together.":mode==="register"?"Meet your next learning partner.":mode==="forgot"?"We’ll help you get back to learning.":mode==="verify"?"Confirm your email address to finish verification.":"Use a strong password you haven’t used before."}</p></div>
        {mode==="login"&&<div className="role-switch" role="tablist" aria-label="Account type"><button type="button" className={role==="student"?"selected":""} onClick={()=>setRole("student")}><UserRound size={15}/> Student Login</button><button type="button" className={role==="admin"?"selected":""} onClick={()=>setRole("admin")}><ShieldCheck size={15}/> Admin Login</button></div>}
        <form className="auth-form" onSubmit={submit}>
          {mode==="register"&&<>
            <label className="field"><span>Full name</span><span className="input-wrap"><UserRound size={17}/><input name="fullName" autoComplete="name" placeholder="Your full name" required minLength={2}/></span></label>
            <label className="field"><span>Student email</span><span className="input-wrap"><Mail size={17}/><input name="email" type="email" autoComplete="email" placeholder="you@college.edu" required/></span></label>
            <label className="field"><span>Create password</span><span className="input-wrap"><LockKeyhole size={17}/><input name="password" type={showPassword?"text":"password"} autoComplete="new-password" placeholder="At least 10 characters" minLength={10} required/><button className="icon-button eye-button" type="button" aria-label={showPassword?"Hide password":"Show password"} onMouseDown={(event)=>event.preventDefault()} onClick={()=>setShowPassword((visible)=>!visible)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
            <label className="field"><span>Confirm password</span><span className="input-wrap"><LockKeyhole size={17}/><input name="confirmPassword" type={showPassword?"text":"password"} autoComplete="new-password" placeholder="Enter your password again" minLength={10} required/><button className="icon-button eye-button" type="button" aria-label={showPassword?"Hide password":"Show password"} onMouseDown={(event)=>event.preventDefault()} onClick={()=>setShowPassword((visible)=>!visible)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
            <div className="form-row"><label className="field"><span>Department</span><input className="bare-input" name="department" placeholder="e.g. Computer Science" required/></label><label className="field"><span>Academic year</span><select name="academicYear" defaultValue="" required><option value="" disabled>Select year</option><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Graduate</option><option>Other</option></select></label></div>
            <label className="field"><span>Student ID <small>Optional</small></span><input className="bare-input" name="studentId" placeholder="For administrator reference"/></label>
            <label className="field"><span>Short bio <small>Optional</small></span><textarea name="bio" rows="2" maxLength="600" placeholder="What are you excited to learn or share?"/></label>
          </>}
          {(mode==="login"||mode==="forgot")&&<label className="field"><span>Student email</span><span className="input-wrap"><Mail size={17}/><input name="email" type="email" autoComplete="email" placeholder="Email address" required onFocus={()=>{setActiveField("email");setTyping(false);setCharacterFeedback("idle");}} onChange={noteTyping} onBlur={blurField}/></span></label>}
          {mode==="login"&&<label className="field"><span>Password</span><span className="input-wrap"><LockKeyhole size={17}/><input name="password" type={showPassword?"text":"password"} autoComplete="current-password" placeholder="Password" required onFocus={()=>{setActiveField("password");setTyping(false);setCharacterFeedback("idle");}} onChange={noteTyping} onBlur={(event)=>{if(!event.relatedTarget?.closest(".eye-button"))blurField();}}/><button className="icon-button eye-button" type="button" aria-label={showPassword?"Hide password":"Show password"} onMouseDown={(event)=>event.preventDefault()} onBlur={blurField} onClick={()=>{setShowPassword((visible)=>!visible);setActiveField("password");setTyping(false);setCharacterFeedback("idle");setReactionToken((value)=>value+1);}}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>}
          {mode==="reset"&&<label className="field"><span>New password</span><span className="input-wrap"><LockKeyhole size={17}/><input name="password" type={showPassword?"text":"password"} placeholder="At least 10 characters" minLength={10} required/><button className="icon-button eye-button" type="button" aria-label="Toggle password visibility" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>}
          {mode==="login"&&<div className="form-extras"><label className="check-line"><input type="checkbox" name="remember" defaultChecked/><span>Remember me</span></label><button type="button" className="text-link" onClick={()=>changeMode("forgot")}>Forgot password?</button></div>}
          <div className="auth-feedback-slot" aria-live="polite">{error&&<div className="notice error auth-error-notice" role="alert">{error}</div>}{message&&<div className="notice success" role="status"><CheckCircle2 size={18}/>{message}</div>}</div>
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy?(<><span className="spinner"/> Working…</>):mode==="login"?(<>Sign In <ArrowRight size={19}/></>):mode==="register"?(<>Create Account <ArrowRight size={19}/></>):mode==="forgot"?"Send reset instructions":mode==="verify"?"Verify email":"Reset password"}</button>
        </form>
        {mode==="login"&&<div className="auth-footer"><span>Don’t have an account?</span> <button className="text-link strong" type="button" onClick={()=>changeMode("register")}>Create Account</button></div>}
        {mode==="register"&&<div className="auth-footer"><span>Already have an account?</span> <button className="text-link strong" type="button" onClick={()=>changeMode("login")}>Sign In</button></div>}
        {(mode==="forgot"||mode==="reset"||mode==="verify")&&<div className="auth-footer"><button className="text-link strong" type="button" onClick={()=>changeMode("login")}>Back to Sign In</button></div>}
      </motion.section>
    </section>
    <footer className="auth-legal">© {new Date().getFullYear()} SkillSwap <span>·</span> Learn together, grow together</footer>
  </main>;
}
