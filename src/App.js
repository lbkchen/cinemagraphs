import React from "react";
import ReactDOM from "react-dom";

import waterfall from "./video_preview_h264.gif";
import "./App.css";

const App = () => {
  const handleVideoRef = React.useCallback((node) => {
    if (!node) {
      return;
    }

    // Jank
    setTimeout(() => {
      const { width, height } = node;
      const containerNode = document.getElementById("canvas-container");

      const canvas = (
        <canvas id="canvas" width={width} height={height}></canvas>
      );
      ReactDOM.render(canvas, containerNode);
      const canvasNode = document.getElementById("canvas");

      const ctx = canvasNode.getContext("2d");

      // Compute first frame and draw onto canvas
      ctx.drawImage(node, 0, 0, width, height);
      const frame = ctx.getImageData(0, 0, width, height);
      console.log(frame, frame.data);

      // Apply alpha mask
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
      ctx.globalCompositeOperation = "destination-out";
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 1.0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }, 100);
  }, []);

  return (
    <div id="App" className="App">
      <div style={{ position: "relative" }}>
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
