import { render } from "ink";
import React from "react";
import App from "./ui/App.js";

const { waitUntilExit } = render(
  <App />

);

await waitUntilExit();
