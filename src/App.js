import React from "react";
import ReactDOM from "react-dom";

import waterfall from "./video_preview_h264.gif";

import "./App.css";

const App = () => {
  const c = React.useRef(null); // Canvas context
  const img = React.useRef(null); // Source image

  const handleVideoRef = React.useCallback((node) => {
    if (!node) {
      return;
    }

    // Jank: Width and height don't seem to get set immediately thus the delay
    setTimeout(() => {
      img.current = node;
      const { width, height } = node;
      const containerNode = document.getElementById("canvas-container");

      const canvas = (
        <canvas id="canvas" width={width} height={height}></canvas>
      );
      ReactDOM.render(canvas, containerNode);
      const canvasNode = document.getElementById("canvas");

      const ctx = canvasNode.getContext("2d");
      c.current = ctx;
    }, 100);
  }, []);

  const resetAlphaMask = (x, y, radiusInner = 50, radiusOuter = 100) => {
    if (!c.current || !img.current) {
      return;
    }
    const ctx = c.current;
    const imgNode = img.current;
    const { clientWidth: width, clientHeight: height } = ctx.canvas;

    // Reset mask
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    // Reapply static image
    ctx.drawImage(imgNode, 0, 0, width, height);

    // Reapply alpha mask
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    ctx.globalCompositeOperation = "destination-out";
    const gradient = ctx.createRadialGradient(
      x,
      y,
      radiusInner,
      x,
      y,
      radiusOuter
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  const handleMouseMove = (e) => {
    resetAlphaMask(e.clientX, e.clientY);
  };

  return (
    <div id="App" className="App">
      <div style={{ position: "relative" }} onMouseMove={handleMouseMove}>
        <div
          id="canvas-container"
          style={{ position: "absolute", top: 0, left: 0 }}
        ></div>
        <img ref={handleVideoRef} src={waterfall} alt="waterfall" />
      </div>
      <header className="App-header">
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
      </header>
    </div>
  );
};

export default App;
