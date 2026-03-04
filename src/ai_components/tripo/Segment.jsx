// trellis/Segment.jsx
import React from "react";
import {
  Scissors, Boxes, Box, ChevronRight, HelpCircle,
} from "lucide-react";

export default function Segment({ segSub, activeTaskId }) {
  return (
    <>
      {/* SEGMENT */}
      {segSub === "segment" && (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"8px 0" }}>
          <p style={{ color:"#c8c8e0",fontSize:13,fontWeight:500,lineHeight:1.6,margin:"0 0 20px" }}>
            Select a model<br/>from the <span style={{ color:"#f5a623" }}>Assets</span> Panel on the<br/>right for <span style={{ color:"#a5a0ff" }}>Segmentation</span>
          </p>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24,opacity:0.7 }}>
            <div style={{ width:90,height:90,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Scissors style={{ width:28,height:28,color:"#3a3a58" }}/>
            </div>
            <div style={{ width:20,height:20,borderRadius:"50%",background:"rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <ChevronRight style={{ width:11,height:11,color:"#6c63ff" }}/>
            </div>
            <div style={{ width:90,height:90,borderRadius:10,background:"rgba(108,99,255,0.06)",border:"1px solid rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Scissors style={{ width:28,height:28,color:"#6c63ff",opacity:0.5 }}/>
            </div>
          </div>
          {activeTaskId && (
            <div style={{ width:"100%",padding:"8px 10px",borderRadius:9,background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.25)",marginTop:8,textAlign:"left" }}>
              <p style={{ color:"#a5a0ff",fontSize:11,fontWeight:600,margin:0 }}>Selected model</p>
              <p style={{ color:"#2d2d48",fontSize:9,margin:"2px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeTaskId}</p>
            </div>
          )}
        </div>
      )}

      {/* FILL PARTS */}
      {segSub === "fill_parts" && (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"8px 0" }}>
          <p style={{ color:"#c8c8e0",fontSize:13,fontWeight:500,lineHeight:1.6,margin:"0 0 20px" }}>
            Select a model<br/>from the <span style={{ color:"#f5a623" }}>Assets</span> Panel on<br/>the right for <span style={{ color:"#a5a0ff" }}>Part Completion</span>
          </p>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24,opacity:0.7 }}>
            <div style={{ width:90,height:90,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Boxes style={{ width:28,height:28,color:"#3a3a58" }}/>
            </div>
            <div style={{ width:20,height:20,borderRadius:"50%",background:"rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <ChevronRight style={{ width:11,height:11,color:"#6c63ff" }}/>
            </div>
            <div style={{ width:90,height:90,borderRadius:10,background:"rgba(108,99,255,0.06)",border:"1px solid rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Box style={{ width:28,height:28,color:"#6c63ff",opacity:0.5 }}/>
            </div>
          </div>
          {activeTaskId && (
            <div style={{ width:"100%",padding:"8px 10px",borderRadius:9,background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.25)",marginBottom:10,textAlign:"left" }}>
              <p style={{ color:"#a5a0ff",fontSize:11,fontWeight:600,margin:0 }}>Selected model</p>
              <p style={{ color:"#2d2d48",fontSize:9,margin:"2px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeTaskId}</p>
            </div>
          )}
          <button
            style={{ display:"flex",alignItems:"center",gap:5,marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#3a3a58",fontSize:11,fontFamily:"inherit" }}
            onMouseEnter={e=>e.currentTarget.style.color="#8a8aaa"}
            onMouseLeave={e=>e.currentTarget.style.color="#3a3a58"}
          >
            <HelpCircle style={{ width:12,height:12 }}/> How it works
          </button>
        </div>
      )}
    </>
  );
}