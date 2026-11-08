import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import https from "node:https";
import { readFile } from "node:fs/promises";
import { getPool } from "../lib/db.js";

nextEnv.loadEnvConfig(process.cwd());

const projectFile = JSON.parse(await readFile(".neon", "utf8"));
const projectId = process.env.NEON_PROJECT_ID || projectFile.projectId;
const branch = process.env.DEMO_SEED_BRANCH || process.env.NEON_BRANCH || projectFile.branch || "production";
const isProduction = branch === "production" || process.env.NODE_ENV === "production";
if (process.env.ENABLE_DEMO_ACCOUNTS !== "true") throw new Error("Set ENABLE_DEMO_ACCOUNTS=true to seed the fictional community.");
if (isProduction && process.env.ALLOW_DEMO_ACCOUNTS_IN_PRODUCTION !== "true") throw new Error("Production seeding requires ALLOW_DEMO_ACCOUNTS_IN_PRODUCTION=true for this command.");
if (!projectId) throw new Error("Set NEON_PROJECT_ID or link this repository with the Neon CLI before seeding.");

const students = [
  { key:"aarav-reddy", name:"Aarav Reddy", department:"CSE", year:"Year 2", status:"approved", bio:"I enjoy building practical Python projects and helping classmates feel confident with programming basics.", skills:[["Python","Programming","advanced","offered"],["Git","Programming","intermediate","offered"],["Programming Fundamentals","Programming","intermediate","offered"],["React","Web Development","beginner","wanted"]] },
  { key:"saanvi-rao", name:"Saanvi Rao", department:"IT", year:"Year 2", status:"approved", bio:"I like turning early ideas into clear, friendly interfaces and sharing design tips with peers.", skills:[["Figma","UI/UX Design","advanced","offered"],["UI/UX Design","UI/UX Design","intermediate","offered"],["Canva","Graphic Design","advanced","offered"],["SQL","Databases","beginner","wanted"]] },
  { key:"karthik-varma", name:"Karthik Varma", department:"ECE", year:"Year 3", status:"approved", bio:"I build small electronics projects and enjoy explaining how code and circuits work together.", skills:[["C Programming","Programming","advanced","offered"],["Arduino","Electronics","advanced","offered"],["Electronics Basics","Electronics","intermediate","offered"],["Python","Programming","beginner","wanted"]] },
  { key:"ananya-sharma", name:"Ananya Sharma", department:"CSE", year:"Year 1", status:"approved", bio:"I am learning web development and can help beginners get comfortable with the building blocks of the web.", skills:[["HTML","Web Development","intermediate","offered"],["CSS","Web Development","intermediate","offered"],["Presentation Design","Communication","intermediate","offered"],["JavaScript","Programming","beginner","wanted"]] },
  { key:"sai-teja", name:"Sai Teja", department:"IT", year:"Year 3", status:"approved", bio:"I enjoy making full-stack apps with JavaScript and helping teams get their first project running.", skills:[["React","Web Development","advanced","offered"],["Node.js","Web Development","advanced","offered"],["Express","Web Development","intermediate","offered"],["Docker","Engineering","beginner","wanted"]] },
  { key:"priya-nair", name:"Priya Nair", department:"ECE", year:"Year 2", status:"approved", bio:"Photography and editing help me tell better stories; I enjoy sharing simple creative workflows.", skills:[["Photography","Photography","advanced","offered"],["Video Editing","Video Editing","intermediate","offered"],["Content Creation","Communication","intermediate","offered"],["Figma","UI/UX Design","beginner","wanted"]] },
  { key:"rahul-kumar", name:"Rahul Kumar", department:"CSE", year:"Year 4", status:"approved", bio:"I enjoy breaking down challenging problems and helping juniors build strong data-structure fundamentals.", skills:[["Data Structures","Programming","advanced","offered"],["Java","Programming","advanced","offered"],["Problem Solving","Programming","expert","offered"],["Machine Learning","Artificial Intelligence","beginner","wanted"]] },
  { key:"meera-iyer", name:"Meera Iyer", department:"BBA", year:"Year 2", status:"approved", bio:"I like making spreadsheets and presentations easier to understand and useful for everyday decisions.", skills:[["Excel","Business","advanced","offered"],["Presentation Skills","Communication","advanced","offered"],["Business Communication","Business","intermediate","offered"],["Power BI","Data Science","beginner","wanted"]] },
  { key:"arjun-das", name:"Arjun Das", department:"Mechanical", year:"Year 3", status:"approved", bio:"I use CAD tools for course projects and can help others learn the core drafting workflow.", skills:[["AutoCAD","Engineering","advanced","offered"],["SolidWorks","Engineering","intermediate","offered"],["Technical Drawing","Engineering","advanced","offered"],["Python","Programming","beginner","wanted"]] },
  { key:"kavya-patel", name:"Kavya Patel", department:"CSE", year:"Year 2", status:"approved", bio:"I enjoy working with data and databases and am curious about how machine learning models are built.", skills:[["Python","Programming","intermediate","offered"],["SQL","Databases","advanced","offered"],["Database Fundamentals","Databases","intermediate","offered"],["Machine Learning","Artificial Intelligence","beginner","wanted"]] },
  { key:"nikhil-raju", name:"Nikhil Raju", department:"EEE", year:"Year 3", status:"approved", bio:"I build embedded prototypes and enjoy helping others understand sensors, circuits, and microcontrollers.", skills:[["Arduino","Electronics","advanced","offered"],["Circuit Design","Electronics","intermediate","offered"],["Embedded Systems","Electronics","intermediate","offered"],["React","Web Development","beginner","wanted"]] },
  { key:"diya-menon", name:"Diya Menon", department:"BCA", year:"Year 1", status:"approved", bio:"I enjoy visual design and writing, and I am building my first portfolio of web projects.", skills:[["Graphic Design","Graphic Design","intermediate","offered"],["Canva","Graphic Design","advanced","offered"],["Creative Writing","Communication","intermediate","offered"],["HTML","Web Development","beginner","wanted"]] },
  { key:"varun-chowdary", name:"Varun Chowdary", department:"CSE", year:"Year 3", status:"pending", bio:"I enjoy working with Linux and backend tools and hope to meet people who like building reliable software.", skills:[["Linux","Programming","advanced","offered"],["Docker","Engineering","intermediate","offered"],["Backend Development","Web Development","intermediate","offered"],["Cybersecurity","Programming","beginner","wanted"]] },
  { key:"sneha-kulkarni", name:"Sneha Kulkarni", department:"BBA", year:"Year 1", status:"pending", bio:"I like writing, speaking, and helping teams communicate ideas clearly and confidently.", skills:[["Communication","Communication","advanced","offered"],["Content Writing","Communication","intermediate","offered"],["Public Speaking","Communication","intermediate","offered"],["Digital Marketing","Business","beginner","wanted"]] },
  { key:"aditya-bose", name:"Aditya Bose", department:"Civil", year:"Year 4", status:"suspended", bio:"I have used CAD tools in course projects and am interested in planning and project coordination.", skills:[["AutoCAD","Engineering","advanced","offered"],["SketchUp","Engineering","intermediate","offered"],["Technical Drawing","Engineering","advanced","offered"],["Project Management","Business","beginner","wanted"]] },
];

const categories = ["Programming","Web Development","Mobile Development","Data Science","Artificial Intelligence","Databases","UI/UX Design","Graphic Design","Video Editing","Photography","Communication","Languages","Business","Electronics","Engineering"];
const demos = students.map((student) => ({ ...student, email:`${student.key}@students.example.com`, studentId:`DEMO-${student.key.toUpperCase().replaceAll("-", "-")}` }));

function runNeon(args) {
  const executable = process.platform === "win32" ? process.execPath : "neon";
  const cliArgs = process.platform === "win32" ? [`${process.env.APPDATA}/npm/node_modules/neon/dist/cli.js`, ...args] : args;
  const result = spawnSync(executable, cliArgs, { encoding:"utf8", windowsHide:true, timeout:45000 });
  if (result.error || result.status !== 0) throw new Error(`Neon CLI command failed (exit ${result.status ?? "unknown"}): ${(result.stderr || result.error?.message || "").slice(0,500)}`);
  return result.stdout || "";
}

const emailConfig = runNeon(["neon-auth","config","email-password","get","--branch",branch,"--project-id",projectId]);
if (!/Require Verification:\s+false/i.test(emailConfig) || !/Send Email On Sign Up:\s+false/i.test(emailConfig)) {
  throw new Error("Seeding stopped: disable required email verification and signup emails in Neon Auth before creating fictional accounts.");
}

const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.BETTER_AUTH_URL;
const authIp = process.env.NEON_AUTH_ENDPOINT_IP;
if (!baseUrl || !authIp) throw new Error("Set the Neon Auth URL and locally resolved auth endpoint address before seeding.");

function authRequest(path, payload) {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/${path}`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method:"POST", servername:url.hostname,
      lookup:(_host, options, callback) => options?.all
        ? callback(null,[{address:authIp,family:4}])
        : callback(null,authIp,4),
      headers:{"content-type":"application/json"},
    }, (response) => {
      const chunks=[];
      response.on("data",(chunk)=>chunks.push(chunk));
      response.on("end",()=>resolve({status:response.statusCode,body:Buffer.concat(chunks).toString()}));
      response.on("error",reject);
    });
    req.on("error",reject);
    req.end(JSON.stringify(payload));
  });
}

const pool = getPool();
async function identityFor(student) {
  const existing = await pool.query(`SELECT id,name FROM neon_auth."user" WHERE lower(email)=lower($1) LIMIT 1`, [student.email]);
  if (existing.rows[0]) {
    const profile = await pool.query("SELECT id,email,full_name,is_demo,account_status FROM profiles WHERE id=$1 OR lower(email)=lower($2) LIMIT 1", [existing.rows[0].id,student.email]);
    if (profile.rows[0] && (profile.rows[0].id !== existing.rows[0].id || profile.rows[0].email.toLowerCase() !== student.email.toLowerCase() || !profile.rows[0].is_demo || profile.rows[0].full_name !== student.name || profile.rows[0].account_status !== student.status)) throw new Error(`Refusing to overwrite a non-matching existing profile for ${student.key}.`);
    if (!profile.rows[0] && existing.rows[0].name !== student.name) throw new Error(`Existing auth identity does not match demo member ${student.key}.`);
    return existing.rows[0].id;
  }

  if (process.env.DEMO_MEMBER_PASSWORD) {
    if (process.env.DEMO_MEMBER_PASSWORD.length < 12) throw new Error("DEMO_MEMBER_PASSWORD must be at least 12 characters when configured.");
    const response = await authRequest("sign-up/email", { email:student.email, password:process.env.DEMO_MEMBER_PASSWORD, name:student.name });
    if (response.status < 200 || response.status >= 300) throw new Error(`Neon Auth signup failed for ${student.key} with HTTP ${response.status}; no password was logged.`);
  } else {
    runNeon(["neon-auth","user","create","--branch",branch,"--project-id",projectId,"--email",student.email,"--name",student.name]);
  }

  for (let attempt=0;attempt<10;attempt++) {
    const created = await pool.query(`SELECT id FROM neon_auth."user" WHERE lower(email)=lower($1) LIMIT 1`, [student.email]);
    if (created.rows[0]) return created.rows[0].id;
    await new Promise((resolve)=>setTimeout(resolve,250));
  }
  throw new Error(`Neon Auth user creation did not appear in the database for ${student.key}.`);
}

const exchangeSeeds = [
  { key:"aarav-sai-completed", sender:0, receiver:4, request:"React", offer:"Git", status:"completed", days:5 },
  { key:"saanvi-karthik-completed", sender:1, receiver:2, request:"Arduino", offer:"Figma", status:"completed", days:12 },
  { key:"ananya-priya-completed", sender:3, receiver:5, request:"Photography", offer:"HTML", status:"completed", days:19 },
  { key:"rahul-meera-completed", sender:6, receiver:7, request:"Excel", offer:"Java", status:"completed", days:26 },
  { key:"arjun-kavya-accepted", sender:8, receiver:9, request:"Python", offer:"AutoCAD", status:"accepted", days:2 },
  { key:"nikhil-diya-pending", sender:10, receiver:11, request:"Graphic Design", offer:"Arduino", status:"pending", days:1 },
  { key:"karthik-priya-rejected", sender:2, receiver:5, request:"Photography", offer:"Arduino", status:"rejected", days:7 },
];

try {
  const identities = [];
  for (const student of demos) identities.push(await identityFor(student));
  const admin = await pool.query("SELECT id FROM profiles WHERE role='admin' ORDER BY created_at LIMIT 1");
  if (!admin.rows[0]) throw new Error("A SkillSwap administrator profile is required to mark approved demo members as reviewed.");
  const adminId = admin.rows[0].id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const name of categories) await client.query("INSERT INTO skill_categories(name,description) VALUES($1,$2) ON CONFLICT(name) DO NOTHING", [name,`Student listings for ${name.toLowerCase()}.`]);
    for (let index=0;index<demos.length;index++) {
      const student=demos[index],id=identities[index];
      const {rows:collision}=await client.query("SELECT id,email,full_name,is_demo,account_status,student_id FROM profiles WHERE id=$1 OR lower(email)=lower($2) OR student_id=$3 LIMIT 1",[id,student.email,student.studentId]);
      if (collision[0] && (collision[0].id!==id || collision[0].email.toLowerCase()!==student.email.toLowerCase() || collision[0].student_id!==student.studentId || !collision[0].is_demo || collision[0].full_name!==student.name || collision[0].account_status!==student.status)) throw new Error(`Refusing to overwrite profile data for ${student.key}.`);
      if (!collision[0]) {
        await client.query(`INSERT INTO profiles(id,email,role,account_status,full_name,student_id,department,academic_year,bio,is_demo,reviewed_by,reviewed_at,status_note)
          VALUES($1,$2,'student',$3,$4,$5,$6,$7,$8,true,$9,CASE WHEN $3 IN ('approved','suspended') THEN NOW() ELSE NULL END,
          CASE WHEN $3='suspended' THEN 'Fictional demo account for workflow demonstration.' ELSE NULL END)`,
        [id,student.email,student.status,student.name,student.studentId,student.department,student.year,student.bio,adminId]);
      }
    }

    for (let index=0;index<demos.length;index++) {
      const student=demos[index],userId=identities[index];
      for (const [name,category,level,type] of student.skills) {
        const description = type === "offered"
          ? `Demo listing: a practical, beginner-friendly session on ${name.toLowerCase()} with examples and time for questions.`
          : `Demo learning goal: looking for guided practice and feedback while learning ${name.toLowerCase()}.`;
        await client.query(`INSERT INTO skills(user_id,category_id,name,description,level,skill_type,is_active)
          SELECT $1,id,$3,$4,$5,$6,true FROM skill_categories WHERE name=$2
          ON CONFLICT(user_id,name,skill_type) DO NOTHING`, [userId,category,name,description,level,type]);
      }
      await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id)
        VALUES($1,15,'earning','profile_complete','Completed the required demo student profile','profile',$1) ON CONFLICT DO NOTHING`, [userId]);
      if (student.status === "approved") {
        const { rows: firstSkill } = await client.query("SELECT id FROM skills WHERE user_id=$1 AND skill_type='offered' AND is_active ORDER BY created_at,id LIMIT 1", [userId]);
        if (firstSkill[0]) await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id)
          VALUES($1,10,'earning','first_skill','Published the first approved demo teaching skill','skill',$2) ON CONFLICT DO NOTHING`, [userId,firstSkill[0].id]);
      }
    }

    const memberIds = new Set();
    for (const item of exchangeSeeds) {
      const senderId=identities[item.sender],receiverId=identities[item.receiver];
      const requested=await client.query("SELECT id FROM skills WHERE user_id=$1 AND name=$2 AND skill_type='offered' LIMIT 1",[receiverId,item.request]);
      const offered=await client.query("SELECT id FROM skills WHERE user_id=$1 AND name=$2 AND skill_type='offered' LIMIT 1",[senderId,item.offer]);
      if (!requested.rows[0] || !offered.rows[0]) throw new Error(`Missing seeded exchange skills for ${item.key}.`);
      let existing=await client.query(`SELECT id FROM swap_requests WHERE sender_id=$1 AND receiver_id=$2 AND requested_skill_id=$3 AND offered_skill_id=$4 AND is_demo=true LIMIT 1`,[senderId,receiverId,requested.rows[0].id,offered.rows[0].id]);
      let swapId=existing.rows[0]?.id;
      const completedAt=new Date(Date.now()-item.days*86400000);
      if (!swapId) {
        const senderConfirmed=item.status==='completed'?completedAt:null;
        const receiverConfirmed=item.status==='completed'?completedAt:null;
        const {rows}=await client.query(`INSERT INTO swap_requests(sender_id,receiver_id,requested_skill_id,offered_skill_id,message,status,created_at,updated_at,completed_at,sender_completed_at,receiver_completed_at,is_demo)
          VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,true) RETURNING id`,
        [senderId,receiverId,requested.rows[0].id,offered.rows[0].id,`Demo exchange: ${studentName(item.sender)} and ${studentName(item.receiver)} practice ${item.offer} and ${item.request}.`,item.status,completedAt,item.status==='completed'?completedAt:null,senderConfirmed,receiverConfirmed]);
        swapId=rows[0].id;
      }
      const recipient=item.status==='pending'?receiverId:senderId;
      const notifType=item.status==='completed'?'exchange_completed':item.status==='accepted'?'swap_accepted':item.status==='rejected'?'swap_rejected':'swap_request';
      const title=item.status==='completed'?'Exchange completed':item.status==='accepted'?'Swap request accepted':item.status==='rejected'?'Swap request declined':'New swap request';
      for (const userId of item.status==='completed'?[senderId,receiverId]:[recipient]) {
        await client.query(`INSERT INTO notifications(user_id,type,title,body,related_swap_id,is_demo,created_at)
          SELECT $1,$2,$3,$4,$5,true,$6 WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE user_id=$1 AND type=$2 AND related_swap_id=$5 AND is_demo=true)`,
        [userId,notifType,title,`Demo activity: ${item.status} skill exchange for ${item.offer} and ${item.request}.`,swapId,completedAt]);
      }
      if (item.status==='completed') {
        for (const userId of [senderId,receiverId]) {
          memberIds.add(userId);
          await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id,created_at)
            VALUES($1,50,'earning','learning','Completed a demo learning contribution','exchange',$2,$3),
                  ($1,40,'earning','teaching','Completed a demo teaching contribution','exchange',$2,$3),
                  ($1,10,'earning','mutual_completion','Both demo participants confirmed the exchange','exchange',$2,$3)
            ON CONFLICT DO NOTHING`,[userId,swapId,completedAt]);
          await client.query(`INSERT INTO credit_transactions(user_id,amount,transaction_type,activity_type,description,source_type,source_id,created_at)
            VALUES($1,20,'earning','first_exchange','Completed the first demo skill exchange','exchange',$2,$3) ON CONFLICT DO NOTHING`,[userId,swapId,completedAt]);
        }
        for (const reviewer of [senderId,receiverId]) {
          const reviewed=reviewer===senderId?receiverId:senderId;
          await client.query(`INSERT INTO reviews(swap_id,reviewer_id,reviewed_user_id,rating,comment,is_demo,created_at)
            VALUES($1,$2,$3,$4,$5,true,$6) ON CONFLICT(swap_id,reviewer_id) DO NOTHING`,
          [swapId,reviewer,reviewed,reviewer===senderId?5:4,`Demo review: ${reviewer===senderId?'clear explanations and a friendly pace':'a thoughtful and helpful session'}.`,new Date(completedAt.getTime()+86400000)]);
        }
      }
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }

  const counts=await pool.query(`SELECT COUNT(*) FILTER(WHERE is_demo)::int AS demo_profiles,
    COUNT(*) FILTER(WHERE is_demo AND account_status='approved')::int AS approved,
    COUNT(*) FILTER(WHERE is_demo AND account_status='pending')::int AS pending,
    COUNT(*) FILTER(WHERE is_demo AND account_status='suspended')::int AS suspended FROM profiles`);
  const skills=await pool.query("SELECT COUNT(*)::int AS total FROM skills s JOIN profiles p ON p.id=s.user_id WHERE p.is_demo=true");
  const swaps=await pool.query("SELECT status,COUNT(*)::int AS total FROM swap_requests WHERE is_demo=true GROUP BY status ORDER BY status");
  console.log(JSON.stringify({branch,profiles:counts.rows[0],demoSkills:skills.rows[0].total,demoExchanges:swaps.rows,sharedPasswordConfigured:Boolean(process.env.DEMO_MEMBER_PASSWORD),passwordsWrittenToLogs:false,emailsSent:0}));
} finally { await pool.end(); }

function studentName(index) { return demos[index]?.name || "a student"; }
