'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Project } from '@/lib/portfolio-data';

type Node = {id:string;name:string;role:'researcher'|'builder'|'reviewer'|'human';x:number;y:number};
type Stage = {title:string;detail:string;active:string[]};
const workflows:Record<string,{nodes:Node[];edges:[string,string][];stages:Stage[]}>={
  'researchforge':{
    nodes:[{id:'supervisor',name:'Supervisor',role:'reviewer',x:9,y:50},{id:'web',name:'Web researcher',role:'researcher',x:34,y:18},{id:'docs',name:'Document researcher',role:'researcher',x:34,y:50},{id:'data',name:'Database researcher',role:'builder',x:34,y:82},{id:'filter',name:'Evidence filter',role:'reviewer',x:62,y:50},{id:'writer',name:'Synthesis + critic',role:'builder',x:88,y:50}],
    edges:[['supervisor','web'],['supervisor','docs'],['supervisor','data'],['web','filter'],['docs','filter'],['data','filter'],['filter','writer']],
    stages:[{title:'A brief reaches the supervisor',detail:'The supervisor selects the specialist channels for the research task.',active:['supervisor']},{title:'Three channels work in parallel',detail:'Web, document, and database specialists run concurrently. The prototype uses mock source evidence.',active:['web','docs','data']},{title:'Evidence passes through a filter',detail:'Preset reliability scores determine which evidence reaches synthesis; this is not independent fact verification.',active:['filter']},{title:'Synthesize, then critique',detail:'The writer assembles a report. The critic checks structure and evidence count, with a bounded revision loop.',active:['writer']}]
  },
  'forgeguard':{
    nodes:[{id:'analysis',name:'Repository analyst',role:'researcher',x:10,y:50},{id:'plan',name:'Planner',role:'reviewer',x:36,y:25},{id:'proposals',name:'Patch + test proposals',role:'builder',x:36,y:75},{id:'review',name:'Code reviewer',role:'reviewer',x:64,y:50},{id:'human',name:'Human approval',role:'human',x:89,y:50}],
    edges:[['analysis','plan'],['plan','proposals'],['proposals','review'],['review','human']],
    stages:[{title:'Understand the issue and repository',detail:'Inspect allowed file paths inside a configured repository boundary. No shell commands are executed.',active:['analysis']},{title:'Prepare a plan and proposals',detail:'Deterministic templates produce the plan, patch preview, and test proposal.',active:['plan','proposals']},{title:'Assemble a review package',detail:'A reviewer packages five inspectable artifacts. Revision rounds are limited.',active:['review']},{title:'The human makes the decision',detail:'Approve or reject the workflow state. The current prototype does not apply or execute a real patch.',active:['human']}]
  },
  'aperture':{
    nodes:[{id:'intent',name:'Question + schema',role:'researcher',x:10,y:50},{id:'planner',name:'SQL planner',role:'builder',x:36,y:25},{id:'validator',name:'AST validator',role:'reviewer',x:36,y:75},{id:'execution',name:'Query execution',role:'builder',x:64,y:50},{id:'analyst',name:'Evidence + analysis',role:'researcher',x:89,y:50}],
    edges:[['intent','planner'],['planner','validator'],['validator','execution'],['execution','analyst']],
    stages:[{title:'Translate the business question',detail:'Classify intent and inspect the bundled sales schema before planning a query.',active:['intent']},{title:'Plan SQL, then inspect its structure',detail:'The planner proposes SQL. SQLGlot validates the AST, rejects mutation nodes, and enforces a row cap.',active:['planner','validator']},{title:'Execute the accepted query',detail:'Run the validated query against the configured database. Production must use restricted credentials.',active:['execution']},{title:'Return answers with their evidence',detail:'Pandas summaries, evidence rows, a chart specification, and an agent trace come back together.',active:['analyst']}]
  },
  'workforce-ai':{
    nodes:[{id:'search',name:'Talent search',role:'researcher',x:10,y:50},{id:'voice',name:'Voice screening',role:'builder',x:36,y:25},{id:'webhook',name:'Signed webhook',role:'reviewer',x:36,y:75},{id:'rules',name:'Eight rule workflows',role:'reviewer',x:64,y:50},{id:'pipeline',name:'Candidate pipeline',role:'builder',x:89,y:50}],
    edges:[['search','voice'],['voice','webhook'],['webhook','rules'],['rules','pipeline']],
    stages:[{title:'Find a relevant candidate',detail:'Rank seeded demo profiles against a job description using skills, keywords, seniority, and experience.',active:['search']},{title:'Screen, then receive the result',detail:'The configured Hunar voice service screens the candidate. Signed asynchronous events return the results.',active:['voice','webhook']},{title:'Apply the automation rules',detail:'Eight rule-based workflows consume structured results. They are not eight additional LLM agents.',active:['rules']},{title:'Keep the pipeline consistent',detail:'Reconcile call state and update the candidate workflow, respecting suppression and retry rules.',active:['pipeline']}]
  },
  'atlas':{
    nodes:[{id:'query',name:'Query analyzer',role:'researcher',x:10,y:50},{id:'retrieve',name:'Retriever',role:'builder',x:36,y:25},{id:'grade',name:'Relevance grader',role:'reviewer',x:36,y:75},{id:'answer',name:'Answer generator',role:'builder',x:64,y:50},{id:'cite',name:'Citation validator',role:'reviewer',x:89,y:50}],
    edges:[['query','retrieve'],['retrieve','grade'],['grade','answer'],['answer','cite']],
    stages:[{title:'Understand the question',detail:'A query analyzer classifies intent before any retrieval begins.',active:['query']},{title:'Retrieve, then grade the evidence',detail:'The retriever pulls context; a relevance grader checks it and can send retrieval back for one more bounded pass.',active:['retrieve','grade']},{title:'Generate an answer from graded context',detail:'The answer only drafts once the grader has approved the retrieved evidence.',active:['answer']},{title:'Validate every citation before it ships',detail:'A citation validator checks the answer against its sources, or the response says so instead of guessing.',active:['cite']}]
  }
};

export function AgentWalkthrough({project}:{project:Project}) {
  const workflow=workflows[project.slug];
  const [step,setStep]=useState(0),[playing,setPlaying]=useState(true);
  useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setPlaying(false)},[]);
  useEffect(()=>{if(!playing)return;const id=setInterval(()=>setStep(s=>(s+1)%workflow.stages.length),4600);return()=>clearInterval(id)},[playing,workflow.stages.length]);
  const current=workflow.stages[step];
  const at=(id:string)=>workflow.nodes.find(n=>n.id===id)!;
  return <section className="agent-walkthrough" style={{'--scene-color':project.color} as CSSProperties} aria-label={`${project.name} animated architecture walkthrough`}>
    <div className="walkthrough-heading"><div><span className="eyebrow">INSIDE {project.name.toUpperCase()}</span><h2>Execution Pipeline & Governance</h2></div><span>SYSTEM TOPOLOGY<br/>VERIFICATION & HANDOFF PIPELINE</span></div>
    <div className={`agent-network ${playing?'network-playing':'network-paused'}`}>
      <svg className="network-connections" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">{workflow.edges.map(([from,to])=>{const a=at(from),b=at(to);return <g key={`${from}-${to}`} className={current.active.includes(from)||current.active.includes(to)?'connection-active':''}><path d={`M${a.x*10} ${a.y*5.2} C${(a.x+b.x)*5} ${a.y*5.2},${(a.x+b.x)*5} ${b.y*5.2},${b.x*10} ${b.y*5.2}`}/><path className="moving-signal" d={`M${a.x*10} ${a.y*5.2} C${(a.x+b.x)*5} ${a.y*5.2},${(a.x+b.x)*5} ${b.y*5.2},${b.x*10} ${b.y*5.2}`}/></g>})}</svg>
      {workflow.nodes.map((node,i)=><div className={`architecture-agent role-${node.role} ${current.active.includes(node.id)?'agent-working':''}`} key={node.id} style={{left:`${node.x}%`,top:`${node.y}%`,'--agent-delay':`${i*-.7}s`} as CSSProperties}>
        <div className="agent-portrait">
          {node.role==='human' ? (
            <div className="agent-node-icon human-node" aria-label="Human Gate Reviewer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <small>GATE</small>
            </div>
          ) : (
            <div className={`agent-node-icon ${node.role}-node`} aria-label={`Architecture Agent: ${node.name}`}>
              {node.role==='researcher' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>}
              {node.role==='builder' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
              {node.role==='reviewer' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>}
              <small>{node.role==='researcher'?'RESEARCH':node.role==='builder'?'BUILD':'REVIEW'}</small>
            </div>
          )}
          <span className="agent-status"/>
        </div>
        <span className="agent-role-name">{node.name}</span>
        <small>{current.active.includes(node.id)?(node.role==='human'?'HUMAN DECISION':'ACTIVE STAGE'):'READY'}</small>
      </div>)}
      <span className="network-note">{project.slug==='researchforge'?'PARALLEL HANDOFFS':project.slug==='forgeguard'?'HUMAN-GOVERNED WORKFLOW':project.slug==='aperture'?'VALIDATE BEFORE EXECUTION':project.slug==='atlas'?'GRADE BEFORE GENERATE':'EVENT-DRIVEN AUTOMATION'}</span>
    </div>
    <div className="walkthrough-narration"><span className="stage-number">0{step+1}<small>/04</small></span><div key={step} className="stage-copy"><h3>{current.title}</h3><p>{current.detail}</p></div><button onClick={()=>setPlaying(!playing)} className="walkthrough-pause" aria-label={playing?'Pause architecture animation':'Play architecture animation'}>{playing?'Ⅱ Pause':'▶ Play'}</button></div>
    <div className="walkthrough-timeline">{workflow.stages.map((stage,i)=><button key={stage.title} aria-label={`Show stage ${i+1}: ${stage.title}`} aria-pressed={step===i} className={step===i?'stage-selected':''} onClick={()=>{setStep(i);setPlaying(false)}}><span>0{i+1}</span><i/></button>)}</div>
  </section>
}
