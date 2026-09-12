"use client";

import { Component, type ReactNode } from "react";

export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    // The decorative scene must never take down the HTML portfolio.
    return this.state.failed ? null : this.props.children;
  }
}
