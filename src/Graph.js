import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import _ from "lodash";
import * as chroma from "chroma-js";
import "./Graph.css";
import dataLoad from "./data/mal_scrape.json";


const Graph = ({width}) => {

  /// refs ///
  const svgRef = useRef();
  const xAxisRef = useRef();
  const gRef = useRef();
  const rectRef = useRef();
  const nodeGRef = useRef();

  /// states ///
  const [data, setData] = useState(null);
  const [allData, setAllData] = useState(null)
  const [selectedAnime, setSelectedAnime] = useState(null)
  const [selectedYear, setSelectedYear] = useState(2020)


  /// constatns ///
  // dimensions 
  const heightRect = 100;
  const height = 800;
  const margin = {top: 0, bottom: 45, right: 40, left: 40}

  // radius of the timeline circles 
  const radiusTimeline = 10;
  const minRadiusTimeline = 2;
  const maxRadiusTimeline = 15;
  // radius of the anime circle of the force graph 
  const minRadiusAnime = 3;
  const maxRadiusAnime = 20;
  // colours 
  const shapeBackgroundColour = "#010B14"
  const lowNumberColour = "#4361ee"
  const highNumberColour = "#f72585"
  const axisTextColour = "#fff"


  /// Data load ///
  useEffect(() => {
    // transform data into just {year: 2020, number_anime: 800}
    const counts = _.countBy(dataLoad, 'air_year')
    // transform data into required array of obj format
    const countsList = []
      for (const [year, count] of Object.entries(counts)) {
        countsList.push({
          year: year,
          number_animes: count
        })
      };
    const filteredCountsList = _.filter(countsList, function(o) { return o.year >= 1960 });
    setData(filteredCountsList)
    setAllData(dataLoad)
  }, []);

  /// D3 Code ///
  useEffect(() => {
    if (data && allData) {

      // filter data for selected year - this is needed for the anime force simulation graph 
      let dataOneYear = _.filter(allData, {'air_year': parseInt(selectedYear)});

      /// Scales ///
      // X Scale - corresponds to years; for the timeline 
      const xScale = d3.scaleBand()
        .domain(data.map(d => d['year'])) // all years
        .range([margin.left, width - margin.right])
        .padding(0.1)

      // Colour scale - number of anime per year
      const colorScale = chroma.scale([lowNumberColour, highNumberColour]
        .map(color => chroma(color).saturate(1)))
        .domain([0, 1133]) // hardcoding these 
      // Scale the circles of the timeline by number of anime of that year
      const numberAnimeScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.number_animes))
        .range([minRadiusTimeline, maxRadiusTimeline])
      // Popularity scale - number of members who have seen the anime 
      const popularityScale = d3.scaleSqrt()
          .domain(d3.extent(allData, d => d.members))
          .range([minRadiusAnime, maxRadiusAnime])

      /// Axes ///
      // X Axis of the timeline - years 
      const xAxis = g => g  
        .attr("transform", `translate(${0}, ${heightRect - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(i => i).tickSizeOuter(0))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text")
          .style("fill", axisTextColour)
          .attr("font-size", "0.9em")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", "rotate(-60)")
        )
        .call(g => g.selectAll(".tick")
          .style("color", axisTextColour)
        )

      /// Graph ///

      // draw a rectangle behind the circles 
      const rectBackground = d3.select(rectRef.current)
        .append("rect")
        .attr("rx", 30)
        .attr("ry", 30)
        .attr("width", width)
        .attr("height", heightRect)
        .attr('fill', shapeBackgroundColour) 

      // container for the timeline 
      const timelineG = d3.select(gRef.current)

      // timeline circles - draw one circle for each year, coloured by number of anime
      const yearCircles = timelineG
        .selectAll(".year-circles")
        .data(data)
        .join("circle")
        .classed("year-circles", true)
          .attr("r", d => numberAnimeScale(d['number_animes']))
          .attr("cx", d => xScale(d['year']) + xScale.bandwidth()/2)
          .attr("cy", heightRect/3)
          .attr("fill", d => colorScale(d['number_animes']))
          .attr("fill-opacity", 1)
          .attr("stroke", d => colorScale(d['number_animes']))
          // if you want the stroke to scale with size of circle
          //.attr("stroke-width", d => numberAnimeScale(d['number_animes']) * 0.5)
          // if you want the stroke to be constant
          .attr("stroke-width", 8)
          .attr("stroke-opacity", 0.5)
     
      // add text with number of animes on top of each circle 
      const yearCirclesText = timelineG
          .selectAll(".circles-text")
          .data(data)
          .join("text")
          .classed("circles-text", true)
            .attr("x", d => xScale(d['year']) + xScale.bandwidth()/2)
            .attr("y", heightRect/3)
            .attr("dy", ".35em")
            .text(d => d['number_animes'])
            .attr("fill", axisTextColour)
            .attr("font-size", "8px")
            .attr("text-anchor", "middle")
            .attr("opacity", 0.8)
            .attr('cursor', 'default')
            .attr('pointer-events', 'none')
            .attr("id", d => d['year'])
      
      // set up events on the circles 
      yearCircles
        .on("mouseenter", onMouseEnter)
        .on("mouseleave", onMouseLeave)
        .on("click", onClick)
      
      function onClick(e, datum) {
        // select the year corresponding to the circle 
        setSelectedYear(datum['year'])
        // expand the radius 
        d3.select(this).attr("r", d => 1.5 * numberAnimeScale(d['number_animes']))
      }
      function onMouseEnter(e, datum) {
        // expand the radius 
        d3.select(this).attr("r", d => 1.5 * numberAnimeScale(d['number_animes']))
      }

      function onMouseLeave(e, datum) {
        // shrink the radius back to normal
        d3.select(this).attr("r", d => numberAnimeScale(d['number_animes']))
      }

      // Force simulation for the force circles 
      const nodeG = d3.select(nodeGRef.current)
        .attr("transform", `translate(${width/2}, ${height/1.8})`)

      // circles for the force simulation 
      const node = nodeG  
        .selectAll(".anime-circle")
        .data(_.uniqBy(dataOneYear, 'mal_id'), d => d.mal_id) // filer my mal_id so that we don't get repeated anime in the same year when the anime goes on for more than 1 season 
        .join("circle")
          .classed("anime-circle",true)
          .attr("r", 1) // give them a fixed radius to start from 
          .attr("fill", d => colorScale(dataOneYear.length))
          .on("mouseenter", function(e, datum) {
            d3.select(this)
              .attr("stroke", "white")
              .attr("stroke-width", 3)
            setSelectedAnime(datum)
          })
          .on("mouseleave", function(e, datum) {
            d3.select(this)
              .attr("stroke-width", 0)
            setSelectedAnime(null)
          })
      function tick() {
          node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
          }
      const simulation = d3.forceSimulation(dataOneYear)
            .on("tick", tick)
            .force("collide", d3.forceCollide().radius(d => 1 + popularityScale(d.members)))
            .stop();
      // this is how long it takes for the simulation to happen 
      setTimeout(() => {
        simulation.restart();
        // radius is scaled by the members i.e. popularity of the anime
        node.transition().attr("r", d => popularityScale(d.members));
      }, 100);
    
      // show the initial arrangement
      tick();


      // call the axes 
      d3.select(xAxisRef.current).call(xAxis)

    } else {
      console.log("Missing data")
    }
  }, [data, selectedYear, allData]);


  return (
    <div className="whole-graph-demo">
      <h1 className="whole-graph-title">A Timeline of Anime</h1>
      <div className="whole-graph-subtitle">
        Explore the evolution of anime over the decades using anime data from one of the most popular anime fan websites <a href="https://myanimelist.net/" target="_blank">MyAnimeList</a>
      </div>
      <div className="whole-graph-instructions-title">How to read this graph:</div>
      <ul className="whole-graph-instructions">
        <li><span>Bigger & more pink timeline circle = more anime that year.</span></li>
        <li><span>Numbers in the circle timeline = number of anime that year.</span></li>
        <li><span>Click on a circle in the timeline to reveal a graph of all the anime of that year.</span></li>
        <li><span>Each bubble of the revealed graph corresponds to one anime. Size = popularity on MyAnimeList.</span></li>
        <li><span>Hover on a bubble to reveal information about the anime.</span></li>
      </ul>
      <div>show anime for</div>
      <h1 className="whole-graph-selected-year">{selectedYear}</h1>

      <div className="whole-graph-demo-container">
        <svg ref={svgRef} width={width} height={height}>
          <g ref={rectRef}></g>
          <g ref={gRef}></g>
          <g ref={nodeGRef}></g>
          <g ref={xAxisRef}></g>
        </svg>
        <div className="whole-graph-demo-tooltip">
          {selectedAnime 
          ? <div>
              <span className="whole-graph-demo-tooltip-title">{selectedAnime.title}</span>
              <span className="whole-graph-demo-tooltip-info">year: {selectedAnime.air_year}</span>
              <span className="whole-graph-demo-tooltip-info">season: {selectedAnime.air_season}</span>
              <span className="whole-graph-demo-tooltip-info">members: {selectedAnime.members}</span>
              <span className="whole-graph-demo-tooltip-info">score: {selectedAnime.score}</span>       
            </div> 
          : null}
        </div>
      </div>
    </div>

  )
};

export { Graph }