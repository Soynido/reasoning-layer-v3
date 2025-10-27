/**
 * Reasoning Layer V3 - Perceptual Layer UI
 * Main entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Get VS Code API from acquireVsCodeApi
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App vscode={vscode} />
  </React.StrictMode>
);

console.log('🧠 Reasoning Layer V3 Perceptual UI initialized');
