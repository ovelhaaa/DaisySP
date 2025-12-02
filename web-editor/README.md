# DaisySP Visual Editor

A web-based visual programming environment for the [DaisySP](https://github.com/electro-smith/DaisySP) audio DSP library. This tool allows you to design audio effect chains and synthesizers visually, preview them in the browser in real-time, and export the corresponding C++ code for deployment on Daisy hardware (STM32, etc.).

## Features

*   **Visual Node Editor:** Drag and drop nodes to create audio graphs.
*   **Real-time Preview:** Hear your patch immediately in the browser. The DSP engine is a direct port of DaisySP modules to JavaScript, ensuring the preview matches the hardware output closely.
*   **Nodes Available:**
    *   **Oscillator:** Signal generator with multiple waveforms (Sine, Triangle, Saw, Ramp, Square) and frequency/amplitude control.
    *   **Filter (SVF):** State Variable Filter with Cutoff and Resonance control. Supports Low Pass, High Pass, Band Pass, Notch, and Peak modes.
    *   **Input / Player:** Represents hardware audio input. In the browser, allows uploading an audio file to simulate input signals.
    *   **Output:** The final destination for the audio signal.
*   **C++ Export:** Generates ready-to-compile C++ code compatible with the `libDaisy` and `DaisySP` ecosystem.
*   **Resource Estimation:** Provides real-time estimates of RAM usage and CPU load (calibrated for the STM32H7 processor used on the Daisy Seed).

## Prerequisites

*   [Node.js](https://nodejs.org/) (Version 16 or higher recommended)
*   npm (usually comes with Node.js)

## Getting Started

### 1. Installation

Navigate to the `web-editor` directory and install the dependencies:

```bash
cd web-editor
npm install
```

### 2. Running Locally (Development)

To start the development server with hot-reload:

```bash
npm run dev
```

This will output a local URL (usually `http://localhost:5173`). Open this link in your web browser.

### 3. Building for Production

To create an optimized static build:

```bash
npm run build
```

The output files will be in the `dist/` directory. You can serve these files with any static web server.

## Usage Guide

1.  **Adding Nodes:** Use the buttons in the top toolbar to add Oscillators, Filters, Inputs, or Outputs.
2.  **Connecting:** Click and drag from a handle (colored dot) on one node to a handle on another node.
    *   *Note:* The signal flow must eventually reach an **Output** node to be heard.
3.  **Adjusting Parameters:** Click on a node to select it. The "Properties" panel on the right will show adjustable sliders for that node (e.g., Frequency, Cutoff).
4.  **Audio Input:**
    *   Add an **Audio Input** node.
    *   Click the "Choose File" button on the node to upload an audio sample (e.g., a guitar riff or drum loop).
    *   This allows you to preview how your effects chain processes external audio.
    *   *Note:* On the exported C++ hardware code, this node maps to the hardware audio input buffer (`in[0]`).
5.  **Exporting Code:**
    *   Click the green **Export C++** button in the toolbar.
    *   A `main.cpp` file will be downloaded.
    *   Place this file in your Daisy project folder and compile it using the standard Daisy toolchain (`make`).

## Architecture

*   **Frontend:** Built with [React](https://react.dev/) and [React Flow](https://reactflow.dev/).
*   **Audio Engine:** Uses the Web Audio API's `AudioWorklet`. DSP logic is implemented in `public/audio-processor.js` (loaded at runtime), which contains JavaScript implementations of the C++ DaisySP classes (`Oscillator`, `Svf`, etc.).
*   **Code Generation:** `src/utils/code-generator.js` traverses the visual graph (using topological sort) and constructs a valid C++ file, mapping nodes to class instances and connections to buffer processing variables.
