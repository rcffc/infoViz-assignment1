//last modified 2018.9.14 21:00
//dependency:
//d3.js version 5.7.0

(function(root, factory) {
  "use strict";

  const libName = "scatterplotMatrix";
  if (typeof define === "function" && define.amd) {
    // AMD
    define(libName, ["d3"], factory);
  } else if (typeof exports === "object") {
    // Node, CommonJS
    module.exports = factory(require("d3"));
  } else {
    // Browser globals (root is window)
    // register scatterplotMatrix to d3
    root.d3 = root.d3 || {};
    root.d3[libName] = factory(root.d3);
  }
})(this, function(d3) {
  let scatterplotMatrix = function() {
    let width = 800,
      height = 800,
      padding = 25,
      margin = {
        top: 0,
        right: 100,
        bottom: 100,
        left: 10
      },
      duration = 500,
      traits = null, // the traits used in scatter plots
      colorValueMapper = d => d.label,
      rMapper = _ => 3,
      strokeMapper = _ => "black",
      drawLegend = true,
      enableBrush = false,
      enableZoom = true,
      zoomMode = "filterAxis",
      labelMode = "diagonal",
      tickLabelMode = "side";

    const cross = function(a, b) {
      let c = [];
      for (let i = 0; i < a.length; ++i) {
        for (let j = 0; j < b.length; ++j) {
          c.push({
            x: a[i],
            i: i,
            y: b[j],
            j: j
          });
        }
      }
      return c;
    };

    const createClass = function(name, rules) {
      let style = document.createElement("style");
      style.type = "text/css";
      document.getElementsByTagName("head")[0].appendChild(style);
      if (!(style.sheet || {}).insertRule)
        (style.styleSheet || style.sheet).addRule(name, rules);
      else style.sheet.insertRule(name + "{" + rules + "}", 0);
    };

    const hiddenClass = "hidden-" + Math.floor(Math.random() * 100000000);
    const cellClass = "cell-" + Math.floor(Math.random() * 100000000);
    createClass("." + hiddenClass, "fill: #ccc !important;");
    createClass(".axis line", "stroke: #ddd");
    createClass(".axis path", "display: none");

    function chart(selection) {
      console.assert(
        (enableBrush && enableZoom) !== true,
        "brush and zoom cannot be used together"
      );
      console.assert(
        ["filterAxis", "filterData"].includes(zoomMode),
        "invalid zoomMode: ",
        zoomMode
      );
      console.assert(
        ["diagonal", "all"].includes(labelMode),
        "invalid labelMode: ",
        labelMode
      );
      console.assert(
        ["side", "all"].includes(tickLabelMode),
        "invalid tickLabelMode: ",
        tickLabelMode
      );

      selection.each(function(data) {
        let n = traits.length;

        // size of each cell
        let widthCell = Math.floor(
          (width - padding - margin.left - margin.right) / n
        );
        let heightCell = Math.floor(
          (height - padding - margin.top - margin.bottom) / n
        );

        // for each trait
        let domainByTrait = {}; // the value range
        let xByTrait = {}; // x value mapping
        let yByTrait = {}; // y value mapping
        let xAxisByTrait = {}; // xAxis renderer
        let yAxisByTrait = {}; // yAxis renderer
        traits.forEach(trait => {
          domainByTrait[trait] = d3.extent(data, d => d[trait]);
          xByTrait[trait] = d3
            .scaleLinear()
            .range([padding / 2, widthCell - padding / 2]);
          yByTrait[trait] = d3
            .scaleLinear()
            .range([heightCell - padding / 2, padding / 2]);
          xAxisByTrait[trait] = d3
            .axisBottom()
            .scale(xByTrait[trait])
            .ticks(6)
            .tickSize(heightCell * n);
          yAxisByTrait[trait] = d3
            .axisLeft()
            .scale(yByTrait[trait])
            .ticks(6)
            .tickSize(-widthCell * n);
        });

        let color = d3.scaleOrdinal(d3.schemeCategory10);

        d3.select(this)
          .selectAll("*")
          .remove();

        let svg = d3
          .select(this)
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr(
            "transform",
            "translate(" +
              (margin.left + padding / 2) +
              "," +
              (margin.top + padding / 2) +
              ")"
          );

        let xAxisData = null;
        let yAxisData = null;
        if (labelMode === "diagonal") {
          xAxisData = cross(traits, traits).filter(d => d.j === 0);
          yAxisData = cross(traits, traits).filter(d => d.i === 0);
          console.log(xAxisData, yAxisData);
        } else if (labelMode === "all") {
          xAxisData = cross(traits, traits);
          yAxisData = cross(traits, traits);
        }

        svg
          .selectAll(".x.axis")
          .data(xAxisData)
          .enter()
          .append("g")
          .attr("class", "x axis")
          .attr(
            "transform",
            (d, _) =>
              "translate(" +
              (n - d.i - 1) * widthCell +
              "," +
              -d.j * heightCell +
              ")"
          )
          .each(function(d) {
            xByTrait[d.x].domain(domainByTrait[d.x]);
            d3.select(this).call(xAxisByTrait[d.x]);
          });
        svg
          .selectAll(".y.axis")
          .data(yAxisData)
          .enter()
          .append("g")
          .attr("class", "y axis")
          .attr(
            "transform",
            (d, _) =>
              "translate(" + d.i * widthCell + "," + d.j * heightCell + ")"
          )
          .each(function(d) {
            yByTrait[d.y].domain(domainByTrait[d.y]);
            d3.select(this).call(yAxisByTrait[d.y]);
          });

        const plot = function(p) {
          let cell = d3.select(this);

          xByTrait[p.x].domain(domainByTrait[p.x]);
          yByTrait[p.y].domain(domainByTrait[p.y]);

          cell
            .append("rect")

            .attr("class", "frame")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("shape-rendering", "crispEdges")
            .attr("x", padding / 2)
            .attr("y", padding / 2)
            .attr("width", widthCell - padding)
            .attr("height", heightCell - padding);

          cell
            .filter(d => d.i !== d.j)
            .selectAll("circle")

            .data(data)
            .enter()
            .append("circle")

            .attr("fill-opacity", 0.3)
            .attr("cx", d => xByTrait[p.x](d[p.x]))
            .attr("cy", d => yByTrait[p.y](d[p.y]))
            .attr("r", rMapper)
            .style("stroke", d => color(colorValueMapper(d)))
            .style("stroke-width", "1px")
            .style("fill", d => color(colorValueMapper(d)));
        };

        let cell = svg
          .selectAll("." + cellClass)
          .data(cross(traits, traits))
          .enter()
          .append("g")
          .attr("class", cellClass)
          .attr(
            "transform",
            d =>
              "translate(" +
              (n - d.i - 1) * widthCell +
              "," +
              d.j * heightCell +
              ")"
          )
          .each(plot);

        // titles for the diagonal / all
        let cellText = null;
        if (labelMode === "diagonal") {
          cellText = cell
            .filter(d => d.i === d.j)
            .append("text")
            .text(d => d.x);
        } else if (labelMode === "all") {
          cellText = cell.append("text").text(d => d.y + "/" + d.x);
        }
        cellText
          .attr("x", padding)
          .attr("y", padding)
          .attr("dy", ".71em")
          .attr("fill", "black")
          .style("font", "10px sans-serif");

        if (drawLegend) {
          console.log(color.domain());
          let legend = svg.selectAll(".legend").data(color.domain());
          let legendG = legend
            .enter()
            .append("g")
            .attr("x", 900)
            .attr("class", "legend");
          legendG
            .append("rect")
            .attr("width", 18)
            .attr("height", 18);
          legendG
            .append("text")
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end");
          legend.exit().remove();

          legend = svg
            .selectAll(".legend")
            .attr(
              "transform",
              (_, i) =>
                "translate(" +
                (-margin.left - 18 - padding) +
                "," +
                i * 20 +
                ")"
            );
          legend
            .select("rect")
            .attr("x", width)
            .style("fill", color);

          legend
            .select("text")
            .attr("x", width - 6)
            .attr("fill", "black")
            .text(d => d);
        }

        if (enableBrush) {
          let brushCell;

          // Clear the previously-active brush, if any.
          const brushStarted = function(p) {
            if (brushCell !== this) {
              d3.select(brushCell).call(brush.move, null);
              brushCell = this;
              xByTrait[p.x].domain(domainByTrait[p.x]);
              yByTrait[p.y].domain(domainByTrait[p.y]);
            }
          };

          // Highlight the selected circles.
          const brushMoved = function(p) {
            let e = d3.brushSelection(this);
            svg.selectAll("circle").classed(hiddenClass, function(d) {
              return !e
                ? false
                : e[0][0] > xByTrait[p.x](+d[p.x]) ||
                    xByTrait[p.x](+d[p.x]) > e[1][0] ||
                    e[0][1] > yByTrait[p.y](+d[p.y]) ||
                    yByTrait[p.y](+d[p.y]) > e[1][1];
            });
          };

          // If the brush is empty, select all circles.
          const brushEnded = function() {
            let e = d3.brushSelection(this);
            if (e === null)
              svg.selectAll("." + hiddenClass).classed(hiddenClass, false);
          };

          let brush = d3
            .brush()
            .on("start", brushStarted)
            .on("brush", brushMoved)
            .on("end", brushEnded)
            .extent([
              [0, 0],
              [widthCell, heightCell]
            ]);

          cell.call(brush);
        }

        if (enableZoom) {
          let zoom = function() {
            let t = svg.transition().duration(duration);

            svg.selectAll(".x.axis").each(function(d) {
              d3.select(this)
                .transition(t)
                .call(xAxisByTrait[d.x]);
            });
            svg.selectAll(".y.axis").each(function(d) {
              d3.select(this)
                .transition(t)
                .call(yAxisByTrait[d.y]);
            });

            cell.each(function(p) {
              d3.select(this)
                .selectAll("circle")
                .transition(t)
                .attr("cx", d => xByTrait[p.x](d[p.x]))
                .attr("cy", d => yByTrait[p.y](d[p.y]))
                .attr("display", function(d) {
                  // hide dots not inside their own cell
                  if (
                    d[p.x] < xByTrait[p.x].domain()[0] ||
                    d[p.x] > xByTrait[p.x].domain()[1]
                  )
                    return "none";
                  if (
                    d[p.y] < yByTrait[p.y].domain()[0] ||
                    d[p.y] > yByTrait[p.y].domain()[1]
                  )
                    return "none";
                });
            });
          };

          let brushEnded = function(d) {
            if (d3.event.sourceEvent.type === "end") return;

            let extent = d3.event.selection;

            if (zoomMode == "filterAxis") {
              if (!extent) {
                xByTrait[d.x].domain(domainByTrait[d.x]);
                yByTrait[d.y].domain(domainByTrait[d.y]);
              } else {
                xByTrait[d.x].domain(
                  [extent[0][0], extent[1][0]].map(
                    xByTrait[d.x].invert,
                    xByTrait[d.x]
                  )
                );
                yByTrait[d.y].domain(
                  [extent[1][1], extent[0][1]].map(
                    yByTrait[d.y].invert,
                    yByTrait[d.y]
                  )
                );
                cell.call(brush.move, null);
              }
            } else if (zoomMode == "filterData") {
              if (!extent) {
                traits.forEach(trait => {
                  domainByTrait[trait] = d3.extent(data, d => d[trait]);
                  xByTrait[trait].domain(domainByTrait[trait]);
                  yByTrait[trait].domain(domainByTrait[trait]);
                });
              } else {
                let xMin = xByTrait[d.x].invert(extent[0][0]);
                let xMax = xByTrait[d.x].invert(extent[1][0]);
                let yMin = yByTrait[d.y].invert(extent[1][1]);
                let yMax = yByTrait[d.y].invert(extent[0][1]);

                let dataFiltered = data.filter(item => {
                  let xCondition = item[d.x] >= xMin && item[d.x] <= xMax;
                  let yCondition = item[d.y] >= yMin && item[d.y] <= yMax;
                  return xCondition && yCondition;
                });

                traits.forEach(trait => {
                  domainByTrait[trait] = d3.extent(dataFiltered, d => d[trait]);
                  xByTrait[trait].domain(domainByTrait[trait]);
                  yByTrait[trait].domain(domainByTrait[trait]);
                });
                cell.call(brush.move, null);
              }
            }
            zoom();
          };

          let brush = d3
            .brush()
            .extent([
              [0, 0],
              [widthCell, heightCell]
            ])
            .on("end", brushEnded);
          cell.call(brush);
        }
      });
    }

    chart.width = function(value) {
      if (!arguments.length) return width;
      console.assert(typeof value === "number", "invalid width", value);
      width = value;
      return chart;
    };

    chart.height = function(value) {
      if (!arguments.length) return height;
      console.assert(typeof value === "number", "invalid height", value);
      height = value;
      return chart;
    };

    chart.padding = function(value) {
      if (!arguments.length) return padding;
      console.assert(typeof value === "number", "invalid padding", value);
      padding = value;
      return chart;
    };

    chart.margin = function(value) {
      if (!arguments.length) return margin;
      console.assert(typeof value === "object", "invalid margin", value);
      if (typeof value.top === "number") margin.top = value.top;
      if (typeof value.right === "number") margin.right = value.right;
      if (typeof value.bottom === "number") margin.bottom = value.bottom;
      if (typeof value.left === "number") margin.left = value.left;
      return chart;
    };

    chart.duration = function(value) {
      if (!arguments.length) return duration;
      console.assert(typeof value === "number", "invalid duration", value);
      duration = value;
      return chart;
    };

    chart.traits = function(value) {
      if (!arguments.length) return traits;
      console.assert(typeof value === "object", "invalid traits", value);
      traits = value;
      return chart;
    };

    chart.colorValueMapper = function(value) {
      if (!arguments.length) return colorValueMapper;
      console.assert(
        typeof value === "function",
        "invalid colorValueMapper",
        value
      );
      colorValueMapper = value;
      return chart;
    };

    chart.rMapper = function(value) {
      if (!arguments.length) return rMapper;
      console.assert(typeof value === "function", "invalid rMapper", value);
      rMapper = value;
      return chart;
    };

    chart.strokeMapper = function(value) {
      if (!arguments.length) return strokeMapper;
      console.assert(
        typeof value === "function",
        "invalid strokeMapper",
        value
      );
      strokeMapper = value;
      return chart;
    };

    chart.drawLegend = function(value) {
      if (!arguments.length) return drawLegend;
      console.assert(typeof value === "boolean", "invalid drawLegend", value);
      drawLegend = value;
      return chart;
    };

    chart.enableBrush = function(value) {
      if (!arguments.length) return enableBrush;
      console.assert(typeof value === "boolean", "invalid enableBrush", value);
      enableBrush = value;
      return chart;
    };

    chart.enableZoom = function(value) {
      if (!arguments.length) return enableZoom;
      console.assert(typeof value === "boolean", "invalid enableZoom", value);
      enableZoom = value;
      return chart;
    };

    chart.zoomMode = function(value) {
      if (!arguments.length) return zoomMode;
      console.assert(typeof value === "string", "invalid zoomMode", value);
      zoomMode = value;
      return chart;
    };

    chart.labelMode = function(value) {
      if (!arguments.length) return labelMode;
      console.assert(typeof value === "string", "invalid labelMode", value);
      labelMode = value;
      return chart;
    };

    chart.tickLabelMode = function(value) {
      if (!arguments.length) return tickLabelMode;
      console.assert(typeof value === "string", "invalid tickLabelMode", value);
      tickLabelMode = value;
      return chart;
    };

    return chart;
  };
  return scatterplotMatrix;
});
