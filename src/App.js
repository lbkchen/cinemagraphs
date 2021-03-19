import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";

// import waterfall from "./video_preview_h264.gif";
import tokyo from "./tokyo-0-10-stab-1080p.mp4";

import "./App.css";

class PlaybackCache {
  constructor({ size = 100 }) {
    this.size = size;

    // TODO: Convert to quadtree
    this.cache = [];
    this.cacheIndex = 0;
  }

  /**
   * Cache a coordinate and the currently playback ts.
   */
  add = ({ x, y, ts }) => {
    console.log("called add w/size", this.cache.length);
    this.cache[this.cacheIndex] = { x, y, ts };

    this.cacheIndex = (this.cacheIndex + 1) % this.size;
  };

  /**
   * Get ts of the closest cached coordinate.
   */
  get = ({ x, y }) => {
    if (this.cache.length === 0) {
      console.log("returned null", this.cache, this.cacheIndex);
      return null;
    }
    // Sort by closest cartesian distance
    const sortedCache = this.cache.slice().sort((c1, c2) => {
      const d1 = (c1.x - x) ** 2 + (c1.y - y) ** 2;
      const d2 = (c2.x - x) ** 2 + (c2.y - y) ** 2;
      return d1 - d2;
    });
    console.log({ sortedCache: sortedCache.slice(0, 5) });

    return sortedCache[0].ts;
  };
}

const App = () => {
  const c1 = React.useRef(null); // Top-level canvas that overlays on top of the video
  const c2 = React.useRef(null); // Hidden canvas that caches the accumulated strokes
  const c3 = React.useRef(null); // Hidden canvas that caches the inner region (Basically C2 - C1)
  const img = React.useRef(null); // Source image/video node

  const playbackCache = new PlaybackCache({ size: 100 });

  const handleVideoRef = React.useCallback((node) => {
    if (!node) {
      return;
    }

    /**
     * This listener is called when the video data is available. We need
     * to get both the w/h metadata as well as the current frame of the
     * video to paint the canvas.
     *
     * See: https://www.w3schools.com/tags/av_event_loadeddata.asp
     */
    node.onloadeddata = function () {
      initializeCanvases({
        node,
        width: this.videoWidth,
        height: this.videoHeight,
      });
    };
  }, []);

  const initializeCanvases = ({ node, width, height }) => {
    img.current = node;
    const containerNode = document.getElementById("canvas-container");

    const canvases = (
      <>
        <canvas
          id="c3"
          style={{ position: "absolute", top: 0, left: 0, zIndex: -2 }}
          width={width}
          height={height}
        />
        <canvas
          id="c2"
          style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}
          width={width}
          height={height}
        />
        {/* This one must sit above the video */}
        <canvas
          id="c1"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
          width={width}
          height={height}
        />
      </>
    );
    ReactDOM.render(canvases, containerNode);

    const c1Node = document.getElementById("c1");
    const c2Node = document.getElementById("c2");
    const c3Node = document.getElementById("c3");

    c1.current = c1Node.getContext("2d");
    c2.current = c2Node.getContext("2d");
    c3.current = c3Node.getContext("2d");

    // Init hidden canvases
    c2.current.drawImage(node, 0, 0, width, height);

    // This covers the video to make it initialize as a static img
    c1.current.drawImage(node, 0, 0, width, height);
  };

  /**
   * Old method that doesn't stop the rest of the frame from progressing
   */
  const resetAlphaMask = (x, y, radiusInner = 50, radiusOuter = 100) => {
    if (!c1.current || !c2.current || !c3.current || !img.current) {
      return;
    }
    const ctx = c1.current;
    const imgNode = img.current;
    const { clientWidth: width, clientHeight: height } = ctx.canvas;

    // Reset mask
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    // Reapply static image
    ctx.drawImage(imgNode, 0, 0, width, height);

    // Reapply alpha mask
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    // https://developer.mozilla.org/en-US/docs/Web/Guide/Audio_and_video_manipulation
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

  const resetC3 = ({ x, y, radiusInner = 50, radiusOuter = 100 }) => {
    if (!c3.current || !img.current) {
      return;
    }
    const ctx = c3.current;
    const imgNode = img.current;
    const { clientWidth: width, clientHeight: height } = ctx.canvas;

    // Reset mask
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    // Copy curr video frame
    ctx.drawImage(imgNode, 0, 0, width, height);

    // Mask with inner region
    ctx.globalCompositeOperation = "destination-out";
    const gradient = ctx.createRadialGradient(
      x,
      y,
      radiusInner,
      x,
      y,
      radiusOuter
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  const resetC2 = () => {
    if (!c2.current || !c3.current) {
      return;
    }
    const ctx = c2.current;
    const { clientWidth: width, clientHeight: height } = ctx.canvas;

    // Composite with current video in inner region: C2 = C2 + C3
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(c3.current.canvas, 0, 0, width, height);
  };

  const resetC1 = ({ x, y, radiusInner = 50, radiusOuter = 100 }) => {
    if (!c1.current || !c2.current) {
      return;
    }
    const ctx = c1.current;
    const { clientWidth: width, clientHeight: height } = ctx.canvas;

    // Copy C2 without clearing
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(c2.current.canvas, 0, 0, width, height);

    // Mask with outer region
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

  const throttledCachePlayback = _.throttle(({ x, y, ts }) => {
    playbackCache.add({ x, y, ts });
  }, 400);

  const getCurrentTs = ({ x, y }) => {
    const imgNode = img.current;
    if (!imgNode) {
      return;
    }
    const ts = imgNode.currentTime;
    console.log(imgNode.currentTime);

    // Cache current playback
    throttledCachePlayback({ x, y, ts });

    const cachedTs = playbackCache.get({ x, y });
    if (cachedTs !== null) {
      imgNode.currentTime = cachedTs;
    }
  };

  const handleMouseMove = (e) => {
    const { pageX: x, pageY: y } = e;
    const radiusInner = 200;
    const radiusOuter = 400;

    resetC3({ x, y, radiusInner, radiusOuter });
    resetC2();
    resetC1({ x, y, radiusInner, radiusOuter });
    // TODO: Fix playback -- need to do something with radius and
    // only triggering on pause/decelerate.
    // getCurrentTs({ x, y });
  };

  return (
    <div id="App" className="App">
      <div style={{ position: "relative" }} onMouseMove={handleMouseMove}>
        <div
          id="canvas-container"
          style={{ position: "absolute", top: 0, left: 0 }}
        ></div>
        <video
          className="video"
          ref={handleVideoRef}
          src={tokyo}
          style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
          autoPlay
          loop
          muted
        />
      </div>
    </div>
  );
};

export default App;
