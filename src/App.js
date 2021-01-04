import React, { useState, useEffect } from "react";
import "./App.css";
import "./Graph"
import { Graph } from "./Graph";

const MobileApp = () => {
  return (
    <>
      <h2 style={{"margin-top" : "300px", "textAlign" : "center"}}>
        Not optimised for mobile. Please view on a desktop/laptop/larger tablet. Sorry!
      </h2>
    </>
  )
}

const App = () => {
  const [isLarge, setIsLarge] = useState(null)
  const [isMedium, setIsMedium] = useState(null)
  const [isSmall, setIsSmall] = useState(null)

  const updatePredicate = function () {
    if (window.innerWidth > 1400){
      setIsLarge(true)
    } else if (window.innerWidth <= 1400 && window.innerWidth > 1000) {
      setIsMedium(true)
    } else if (window.innerWidth <= 1000 && window.innerWidth > 700) {
      setIsSmall(true)
    }
  }
  useEffect(() => {
    updatePredicate();
    window.addEventListener("resize", updatePredicate);
  }, [])
  return (
    <>
    {isLarge 
      ? <Graph width={1400}/> 
      : isMedium
      ? <Graph width={1000}/> 
      : isSmall
      ? <Graph width={700}/> 
      : <MobileApp />
    }
    </>
  )
}

export default App; 