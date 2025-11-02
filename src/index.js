#!/usr/bin/env node

import { render } from "ink";
import React from "react";
import App from "./App.js";

const { waitUntilExit } = render(
  <App />

);

await waitUntilExit();
